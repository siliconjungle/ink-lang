//! Durable orchestration over compiled state. No parser, evaluator or admission rules.
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeSet,
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex, OnceLock,
    },
};
type Result<T> = std::result::Result<T, String>;
const SNAPSHOT_LIMIT: usize = 64 * 1024 * 1024;
const HEADER_LIMIT: usize = 4 * 1024 * 1024;
/// Implemented by generated state, or another explicitly trusted host adapter.
pub trait CompiledState: Sized {
    fn create() -> Self;
    fn restore(bytes: &[u8]) -> Result<Self>;
    fn checkpoint(&self) -> Result<Vec<u8>>;
    fn invoke(&mut self, call: &str, args: &Value) -> Result<Value>;
    fn pure(&mut self, call: &str, args: &Value) -> Result<Value>;
    fn events(&self) -> Vec<Value>;
    fn acknowledge(&mut self, commit: u64, position: u64);
    fn version(&self) -> u64;
}
pub trait Store {
    fn load(&mut self) -> Result<Option<(String, Vec<u8>)>>;
    /// Compare the previous token, then atomically publish. Any error is ambiguous.
    fn commit(&mut self, expected: Option<&str>, bytes: &[u8]) -> Result<String>;
}
fn token(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
fn pack(value: &Value) -> Value {
    match value {
        Value::Number(n) => {
            if n.is_i64() || n.is_u64() {
                json!({"b":n.to_string()})
            } else {
                json!({"n":n.to_string()})
            }
        }
        Value::Array(xs) => json!({"a":xs.iter().map(pack).collect::<Vec<_>>()}),
        Value::Object(fields) => {
            json!({"o":fields.iter().map(|(k,v)|json!([k,pack(v)])).collect::<Vec<_>>()})
        }
        value => value.clone(),
    }
}
fn unpack(value: &Value, depth: usize) -> Result<Value> {
    if depth > 128 {
        return Err("receipt nesting limit".into());
    }
    if matches!(value, Value::Null | Value::Bool(_) | Value::String(_)) {
        return Ok(value.clone());
    }
    let fields = value
        .as_object()
        .filter(|f| f.len() == 1)
        .ok_or("invalid receipt value")?;
    if let Some(s) = fields.get("b").and_then(Value::as_str) {
        if let Ok(n) = s.parse::<u64>() {
            if n.to_string() == s {
                return Ok(json!(n));
            }
        }
        if let Ok(n) = s.parse::<i64>() {
            if n.to_string() == s {
                return Ok(json!(n));
            }
        }
        return Err("receipt integer outside native JSON range".into());
    }
    if let Some(s) = fields.get("n").and_then(Value::as_str) {
        if s == "-0" || s == "-0.0" {
            return Ok(json!(-0.0));
        }
        let n: Value = serde_json::from_str(s).map_err(|_| "invalid receipt number")?;
        if n.is_number() && n.as_f64().is_some_and(f64::is_finite) {
            return Ok(n);
        }
        return Err("invalid receipt number".into());
    }
    if let Some(xs) = fields.get("a").and_then(Value::as_array) {
        return xs
            .iter()
            .map(|v| unpack(v, depth + 1))
            .collect::<Result<Vec<_>>>()
            .map(Value::Array);
    }
    if let Some(xs) = fields.get("o").and_then(Value::as_array) {
        let mut out = serde_json::Map::new();
        for entry in xs {
            let pair = entry
                .as_array()
                .filter(|v| v.len() == 2)
                .ok_or("invalid receipt field")?;
            let name = pair[0].as_str().ok_or("invalid receipt field name")?;
            if out
                .insert(name.into(), unpack(&pair[1], depth + 1)?)
                .is_some()
            {
                return Err("duplicate receipt field".into());
            }
        }
        return Ok(Value::Object(out));
    }
    Err("invalid receipt value".into())
}
fn packed(value: &Value) -> Result<String> {
    // Tagged containers double JSON nesting. Bound before recursive encoding.
    let mut stack = vec![(value, 0usize)];
    let mut cells = 0usize;
    while let Some((value, depth)) = stack.pop() {
        cells += 1;
        if depth > 48 || cells > 100_000 {
            return Err("native receipt structure limit".into());
        }
        match value {
            Value::Array(xs) => stack.extend(xs.iter().map(|v| (v, depth + 1))),
            Value::Object(xs) => stack.extend(xs.values().map(|v| (v, depth + 1))),
            _ => {}
        }
    }
    let text = serde_json::to_string(&pack(value)).map_err(|e| e.to_string())?;
    if text.len() > HEADER_LIMIT {
        return Err("receipt value limit".into());
    }
    Ok(text)
}
fn unpacked(text: &str) -> Result<Value> {
    unpack(&serde_json::from_str(text).map_err(|e| e.to_string())?, 0)
}
#[derive(Clone)]
struct Receipt {
    id: String,
    request: String,
    reply: String,
}
fn encode(snapshot: &[u8], receipts: &[Receipt], limit: usize) -> Result<Vec<u8>> {
    if snapshot.len() > SNAPSHOT_LIMIT {
        return Err("snapshot limit".into());
    }
    let header=serde_json::to_vec(&json!({"format":"ink-durable-state-v1","receiptLimit":limit,"receipts":receipts.iter().map(|r|json!({"id":r.id,"request":r.request,"reply":r.reply})).collect::<Vec<_>>()})).map_err(|e|e.to_string())?;
    if header.len() > HEADER_LIMIT {
        return Err("durable receipt limit".into());
    }
    let mut out = Vec::with_capacity(40 + header.len() + snapshot.len());
    out.extend_from_slice(b"INKD");
    out.extend_from_slice(&(header.len() as u32).to_le_bytes());
    out.extend_from_slice(&header);
    out.extend_from_slice(snapshot);
    let digest = Sha256::digest(&out);
    out.extend_from_slice(&digest);
    Ok(out)
}
fn decode(bytes: &[u8]) -> Result<(Vec<u8>, Vec<Receipt>, usize)> {
    if bytes.len() < 40
        || bytes.len() > SNAPSHOT_LIMIT + HEADER_LIMIT + 40
        || &bytes[..4] != b"INKD"
    {
        return Err("invalid durable record".into());
    }
    let n = u32::from_le_bytes(bytes[4..8].try_into().unwrap()) as usize;
    let end = bytes.len() - 32;
    if n > HEADER_LIMIT || 8 + n > end || end - 8 - n > SNAPSHOT_LIMIT {
        return Err("invalid durable record length".into());
    }
    if Sha256::digest(&bytes[..end]).as_slice() != &bytes[end..] {
        return Err("durable record checksum mismatch".into());
    }
    let h: Value = serde_json::from_slice(&bytes[8..8 + n]).map_err(|e| e.to_string())?;
    if h["format"] != "ink-durable-state-v1" {
        return Err("invalid durable record format".into());
    }
    let limit = h["receiptLimit"]
        .as_u64()
        .filter(|n| (1..=4096).contains(n))
        .ok_or("invalid receipt retention")? as usize;
    let list = h["receipts"]
        .as_array()
        .filter(|v| v.len() <= limit)
        .ok_or("invalid receipts")?;
    let mut ids = BTreeSet::new();
    let mut receipts = vec![];
    for entry in list {
        let id = entry["id"]
            .as_str()
            .filter(|s| !s.is_empty() && s.encode_utf16().count() <= 256)
            .ok_or("invalid request id")?
            .to_string();
        if !ids.insert(id.clone()) {
            return Err("duplicate receipt id".into());
        }
        let request = entry["request"]
            .as_str()
            .ok_or("invalid request receipt")?
            .to_string();
        let reply = entry["reply"]
            .as_str()
            .ok_or("invalid reply receipt")?
            .to_string();
        unpacked(&request)?;
        unpacked(&reply)?;
        receipts.push(Receipt { id, request, reply });
    }
    Ok((bytes[8 + n..end].to_vec(), receipts, limit))
}
/// Calls require mutable ownership. The published state is never exposed for mutation.
pub struct Host<S: CompiledState, T: Store> {
    state: S,
    store: T,
    token: String,
    receipts: Vec<Receipt>,
    limit: usize,
    poison: Option<String>,
}
impl<S: CompiledState, T: Store> Host<S, T> {
    pub fn open(mut store: T, limit: usize) -> Result<Self> {
        if !(1..=4096).contains(&limit) {
            return Err("receipt retention must be 1..4096".into());
        }
        let (state, token, receipts, limit) = if let Some((token, bytes)) = store.load()? {
            let (snapshot, receipts, limit) = decode(&bytes)?;
            (S::restore(&snapshot)?, token, receipts, limit)
        } else {
            let state = S::create();
            let token = store.commit(None, &encode(&state.checkpoint()?, &[], limit)?)?;
            (state, token, vec![], limit)
        };
        Ok(Self {
            state,
            store,
            token,
            receipts,
            limit,
            poison: None,
        })
    }
    fn live(&self) -> Result<()> {
        self.poison.as_ref().map_or(Ok(()), |e| Err(e.clone()))
    }
    fn publish(&mut self, candidate: S, receipts: Vec<Receipt>) -> Result<()> {
        let bytes = encode(&candidate.checkpoint()?, &receipts, self.limit)?;
        match self.store.commit(Some(&self.token), &bytes) {
            Ok(token) => {
                self.state = candidate;
                self.token = token;
                self.receipts = receipts;
                Ok(())
            }
            Err(error) => {
                let error =
                    format!("Persistence outcome is uncertain; reopen the durable host: {error}");
                self.poison = Some(error.clone());
                Err(error)
            }
        }
    }
    pub fn invoke(&mut self, id: &str, call: &str, args: &Value) -> Result<Value> {
        self.live()?;
        if id.is_empty() || id.encode_utf16().count() > 256 {
            return Err("request id must have 1..256 characters".into());
        }
        let request = packed(&json!({"call":call,"args":args}))?;
        if request.len() > HEADER_LIMIT {
            return Err("request limit".into());
        }
        if let Some(old) = self.receipts.iter().find(|r| r.id == id) {
            if old.request != request {
                return Err("request id reused with different arguments".into());
            }
            return unpacked(&old.reply);
        }
        let mut candidate = S::restore(&self.state.checkpoint()?)?;
        let reply = candidate.invoke(call, args)?;
        let encoded = packed(&reply)?;
        let mut receipts = self.receipts.clone();
        receipts.push(Receipt {
            id: id.into(),
            request,
            reply: encoded,
        });
        if receipts.len() > self.limit {
            receipts.remove(0);
        }
        self.publish(candidate, receipts)?;
        Ok(reply)
    }
    pub fn pure(&mut self, call: &str, args: &Value) -> Result<Value> {
        self.live()?;
        self.state.pure(call, args)
    }
    pub fn checkpoint(&self) -> Result<Vec<u8>> {
        self.live()?;
        self.state.checkpoint()
    }
    pub fn events(&self) -> Result<Vec<Value>> {
        self.live()?;
        Ok(self.state.events())
    }
    pub fn version(&self) -> Result<u64> {
        self.live()?;
        Ok(self.state.version())
    }
    pub fn acknowledge(&mut self, commit: u64, position: u64) -> Result<()> {
        self.live()?;
        let mut candidate = S::restore(&self.state.checkpoint()?)?;
        candidate.acknowledge(commit, position);
        self.publish(candidate, self.receipts.clone())
    }
    /// At least once; receiver deduplicates application/commit/position before returning.
    pub fn deliver(
        &mut self,
        mut receive: impl FnMut(&Value, (u64, u64)) -> Result<()>,
    ) -> Result<usize> {
        let events = self.events()?;
        let mut count = 0;
        for event in events {
            let key = (
                event["commit"].as_u64().ok_or("event commit")?,
                event["position"].as_u64().ok_or("event position")?,
            );
            receive(&event, key)?;
            self.acknowledge(key.0, key.1)?;
            count += 1;
        }
        Ok(count)
    }
}
static OWNERS: OnceLock<Mutex<BTreeSet<PathBuf>>> = OnceLock::new();
static NEXT_FILE: AtomicU64 = AtomicU64::new(0);
/// Local files with one writer process per path. No interprocess locking claim.
pub struct FileStore {
    path: PathBuf,
    parent: PathBuf,
}
impl FileStore {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let path = path.as_ref();
        let parent = fs::canonicalize(
            path.parent()
                .filter(|p| !p.as_os_str().is_empty())
                .unwrap_or(Path::new(".")),
        )
        .map_err(|e| e.to_string())?;
        let path = parent.join(path.file_name().ok_or("expected file name")?);
        if !OWNERS
            .get_or_init(Default::default)
            .lock()
            .map_err(|_| "file owner registry poisoned")?
            .insert(path.clone())
        {
            return Err("durable file already has a writer in this process".into());
        }
        Ok(Self { path, parent })
    }
}
impl Store for FileStore {
    fn load(&mut self) -> Result<Option<(String, Vec<u8>)>> {
        let file = match File::open(&self.path) {
            Ok(f) => f,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(e) => return Err(e.to_string()),
        };
        let mut bytes = vec![];
        file.take((SNAPSHOT_LIMIT + HEADER_LIMIT + 41) as u64)
            .read_to_end(&mut bytes)
            .map_err(|e| e.to_string())?;
        if bytes.len() > SNAPSHOT_LIMIT + HEADER_LIMIT + 40 {
            return Err("durable record limit".into());
        }
        Ok(Some((token(&bytes), bytes)))
    }
    fn commit(&mut self, expected: Option<&str>, bytes: &[u8]) -> Result<String> {
        if bytes.len() > SNAPSHOT_LIMIT + HEADER_LIMIT + 40 {
            return Err("durable record limit".into());
        }
        if self.load()?.as_ref().map(|(token, _)| token.as_str()) != expected {
            return Err("storage conflict".into());
        }
        let mut options = OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        // A crash can leave a temporary file, even after the OS reuses its PID.
        let (temporary, mut file) = loop {
            let temporary = self.parent.join(format!(
                ".ink-{}-{}.tmp",
                std::process::id(),
                NEXT_FILE.fetch_add(1, Ordering::Relaxed)
            ));
            match options.open(&temporary) {
                Ok(file) => break (temporary, file),
                Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => continue,
                Err(e) => return Err(e.to_string()),
            }
        };
        let result = (|| {
            file.write_all(bytes).map_err(|e| e.to_string())?;
            file.sync_all().map_err(|e| e.to_string())?;
            drop(file);
            fs::rename(&temporary, &self.path).map_err(|e| e.to_string())?;
            File::open(&self.parent)
                .and_then(|d| d.sync_all())
                .map_err(|e| e.to_string())?;
            Ok(token(bytes))
        })();
        if temporary.exists() {
            let _ = fs::remove_file(temporary);
        }
        result
    }
}
impl Drop for FileStore {
    fn drop(&mut self) {
        if let Some(owners) = OWNERS.get() {
            if let Ok(mut owners) = owners.lock() {
                owners.remove(&self.path);
            }
        }
    }
}
