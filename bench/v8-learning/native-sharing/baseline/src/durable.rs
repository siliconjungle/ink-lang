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
const FRAME_LIMIT: usize = 4 * HEADER_LIMIT + 4096;
const LOG_LIMIT: usize = 128 * 1024 * 1024;
/// Implemented by generated state, or another explicitly trusted host adapter.
/// Every committed state/event mutation increments version; unsuccessful actions
/// and queries leave both unchanged. Replay uses deterministic compiled calls.
/// A retained transaction contains one invocation or acknowledgement.
pub trait CompiledState: Sized {
    fn create() -> Self;
    fn restore(bytes: &[u8]) -> Result<Self>;
    fn checkpoint(&self) -> Result<Vec<u8>>;
    fn invoke(&mut self, call: &str, args: &Value) -> Result<Value>;
    fn pure(&mut self, call: &str, args: &Value) -> Result<Value>;
    fn events(&self) -> Vec<Value>;
    fn acknowledge(&mut self, commit: u64, position: u64);
    fn version(&self) -> u64;
    /// Retain a rollback boundary without transporting a complete checkpoint.
    /// False selects the existing checkpoint/restore adapter.
    fn begin_transaction(&mut self) -> Result<bool> {
        Ok(false)
    }
    fn commit_transaction(&mut self) {}
    fn rollback_transaction(&mut self) {}
}
pub trait Store {
    fn load(&mut self) -> Result<Option<(String, Vec<u8>)>>;
    /// Compare the previous token, then atomically publish. Any error is ambiguous.
    fn commit(&mut self, expected: Option<&str>, bytes: &[u8]) -> Result<String>;
    /// Append one atomically recoverable operation/receipt frame. None means
    /// unsupported or compaction required; no publication may have occurred.
    fn append(&mut self, _expected: &str, _bytes: &[u8]) -> Result<Option<String>> {
        Ok(None)
    }
}
fn token(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
fn log_base(bytes: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(8 + bytes.len());
    out.extend_from_slice(b"INKL");
    out.extend_from_slice(&(bytes.len() as u32).to_le_bytes());
    out.extend_from_slice(bytes);
    out
}
fn framed(previous: &str, bytes: &[u8]) -> Result<(Vec<u8>, String)> {
    if bytes.len() > FRAME_LIMIT {
        return Err("durable frame limit".into());
    }
    let length = (bytes.len() as u32).to_le_bytes();
    let mut hash = Sha256::new();
    hash.update(previous.as_bytes());
    hash.update(length);
    hash.update(bytes);
    let digest = hash.finalize();
    let mut out = Vec::with_capacity(36 + bytes.len());
    out.extend_from_slice(&length);
    out.extend_from_slice(bytes);
    out.extend_from_slice(&digest);
    Ok((out, format!("{digest:x}")))
}
/// A torn final frame is an unpublished tail. Complete corrupt frames reject.
fn split_log(bytes: &[u8]) -> Result<(&[u8], Vec<&[u8]>, String, usize)> {
    if !bytes.starts_with(b"INKL") {
        return Ok((bytes, vec![], token(bytes), bytes.len()));
    }
    if bytes.len() < 8 || bytes.len() > LOG_LIMIT {
        return Err("durable log limit".into());
    }
    let n = u32::from_le_bytes(bytes[4..8].try_into().unwrap()) as usize;
    if n > SNAPSHOT_LIMIT + HEADER_LIMIT + 40 || 8 + n > bytes.len() {
        return Err("invalid durable log checkpoint".into());
    }
    let base = &bytes[8..8 + n];
    let mut previous = token(base);
    let mut at = 8 + n;
    let mut frames = vec![];
    while at < bytes.len() {
        if bytes.len() - at < 4 {
            break;
        }
        let n = u32::from_le_bytes(bytes[at..at + 4].try_into().unwrap()) as usize;
        if n > FRAME_LIMIT {
            return Err("durable frame limit".into());
        }
        if bytes.len() - at < 36 + n {
            break;
        }
        let payload = &bytes[at + 4..at + 4 + n];
        let (expected, next) = framed(&previous, payload)?;
        if expected[4 + n..] != bytes[at + 4 + n..at + 36 + n] {
            return Err("durable frame checksum mismatch".into());
        }
        if frames.len() >= 4096 {
            return Err("durable replay operation limit".into());
        }
        frames.push(payload);
        previous = next;
        at += 36 + n;
    }
    Ok((base, frames, previous, at))
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
// Backend JSON adapters can transport a typed integer as Number or BigInt.
// Compare decimal values exactly (including signed zero), never through f64.
fn replay_number(text: &str) -> String {
    let (mantissa, exponent) = text.split_once(['e', 'E']).unwrap_or((text, "0"));
    let exponent: i32 = exponent.parse().unwrap();
    let negative = mantissa.starts_with('-');
    let mantissa = mantissa.trim_start_matches('-');
    let (whole, fraction) = mantissa.split_once('.').unwrap_or((mantissa, ""));
    let mut digits = format!("{whole}{fraction}")
        .trim_start_matches('0')
        .to_string();
    if digits.is_empty() {
        return if negative { "-0".into() } else { "0".into() };
    }
    let mut power = exponent - fraction.len() as i32;
    while digits.ends_with('0') {
        digits.pop();
        power += 1;
    }
    format!("{}{digits}e{power}", if negative { "-" } else { "" })
}
fn replay_value(value: &Value) -> Value {
    match value {
        Value::Number(n) => json!({"number":replay_number(&n.to_string())}),
        Value::Array(xs) => json!({"array":xs.iter().map(replay_value).collect::<Vec<_>>()}),
        Value::Object(xs) => {
            json!({"object":xs.iter().map(|(k,v)|json!([k,replay_value(v)])).collect::<Vec<_>>()})
        }
        value => value.clone(),
    }
}
fn decimal(v: &Value) -> Result<u64> {
    let text = v.as_str().ok_or("invalid durable version")?;
    let n: u64 = text.parse().map_err(|_| "invalid durable version")?;
    if n.to_string() != text {
        return Err("invalid durable version".into());
    }
    Ok(n)
}
fn keep_receipt(receipts: &mut Vec<Receipt>, receipt: Receipt, limit: usize) {
    receipts.push(receipt);
    if receipts.len() > limit {
        receipts.remove(0);
    }
}
fn replay<S: CompiledState>(
    state: &mut S,
    receipts: &mut Vec<Receipt>,
    limit: usize,
    bytes: &[u8],
) -> Result<()> {
    if bytes.len() > FRAME_LIMIT {
        return Err("durable frame limit".into());
    }
    let frame: Value = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
    if frame["format"] != "ink-durable-operation-v1"
        || decimal(&frame["before"])? != state.version()
    {
        return Err("durable operation boundary mismatch".into());
    }
    let after = decimal(&frame["after"])?;
    match frame["kind"].as_str() {
        Some("ack") => state.acknowledge(decimal(&frame["commit"])?, decimal(&frame["position"])?),
        Some(kind @ ("invoke" | "receipt")) => {
            let r = &frame["receipt"];
            let id = r["id"]
                .as_str()
                .filter(|s| !s.is_empty() && s.encode_utf16().count() <= 256)
                .ok_or("invalid request id")?;
            if receipts.iter().any(|r| r.id == id) {
                return Err("duplicate durable receipt id".into());
            }
            let request = r["request"]
                .as_str()
                .filter(|s| s.len() <= HEADER_LIMIT)
                .ok_or("invalid durable request")?;
            let reply = r["reply"]
                .as_str()
                .filter(|s| s.len() <= HEADER_LIMIT)
                .ok_or("invalid durable reply")?;
            let args = unpacked(request)?;
            unpacked(reply)?;
            if kind == "invoke" {
                let call = args["call"].as_str().ok_or("invalid durable call")?;
                if replay_value(&state.invoke(call, &args["args"])?)
                    != replay_value(&unpacked(reply)?)
                {
                    return Err("durable replay reply mismatch".into());
                }
            } else if after != state.version() {
                return Err("receipt changed durable state".into());
            }
            keep_receipt(
                receipts,
                Receipt {
                    id: id.into(),
                    request: request.into(),
                    reply: reply.into(),
                },
                limit,
            );
        }
        _ => return Err("invalid durable operation".into()),
    }
    if state.version() != after {
        return Err("durable replay version mismatch".into());
    }
    Ok(())
}
/// Calls require mutable ownership. The published state is never exposed for mutation.
pub struct Host<S: CompiledState, T: Store> {
    state: S,
    store: T,
    token: String,
    receipts: Vec<Receipt>,
    limit: usize,
    frames: usize,
    checkpoint_interval: usize,
    poison: Option<String>,
}
impl<S: CompiledState, T: Store> Host<S, T> {
    pub fn open(store: T, limit: usize) -> Result<Self> {
        Self::open_with_checkpoint_interval(store, limit, 32)
    }
    /// A checkpoint after this many operations bounds replay independently of table size.
    pub fn open_with_checkpoint_interval(
        mut store: T,
        limit: usize,
        checkpoint_interval: usize,
    ) -> Result<Self> {
        if !(1..=4096).contains(&limit) {
            return Err("receipt retention must be 1..4096".into());
        }
        if !(1..=4096).contains(&checkpoint_interval) {
            return Err("checkpoint interval must be 1..4096".into());
        }
        let (state, token, receipts, limit, frames) =
            if let Some((saved_token, bytes)) = store.load()? {
                let (base, frames, rolling_token, _) = split_log(&bytes)?;
                if bytes.starts_with(b"INKL") && saved_token != rolling_token {
                    return Err("durable log token mismatch".into());
                }
                let (snapshot, mut receipts, limit) = decode(base)?;
                let mut state = S::restore(&snapshot)?;
                for frame in &frames {
                    replay(&mut state, &mut receipts, limit, frame)?;
                }
                (state, saved_token, receipts, limit, frames.len())
            } else {
                let state = S::create();
                let token = store.commit(None, &encode(&state.checkpoint()?, &[], limit)?)?;
                (state, token, vec![], limit, 0)
            };
        Ok(Self {
            state,
            store,
            token,
            receipts,
            limit,
            frames,
            checkpoint_interval,
            poison: None,
        })
    }
    fn live(&self) -> Result<()> {
        self.poison.as_ref().map_or(Ok(()), |e| Err(e.clone()))
    }
    /// None denotes the state's own undo/COW boundary; Some is the compatibility adapter.
    fn begin(&mut self) -> Result<Option<S>> {
        if self.state.begin_transaction()? {
            Ok(None)
        } else {
            let candidate = S::restore(&self.state.checkpoint()?)?;
            Ok(Some(std::mem::replace(&mut self.state, candidate)))
        }
    }
    fn rollback(&mut self, prior: Option<S>) {
        if let Some(prior) = prior {
            self.state = prior;
        } else {
            self.state.rollback_transaction();
        }
    }
    fn publish(&mut self, receipts: Vec<Receipt>, frame: Value) -> Result<()> {
        let payload = serde_json::to_vec(&frame).map_err(|e| e.to_string())?;
        if payload.len() > FRAME_LIMIT {
            return Err("durable frame limit".into());
        }
        // Build any required checkpoint before touching storage. Encoding failure is unambiguous.
        let checkpoint = if self.frames + 1 >= self.checkpoint_interval {
            Some(encode(&self.state.checkpoint()?, &receipts, self.limit)?)
        } else {
            None
        };
        let append = if checkpoint.is_none() {
            self.store.append(&self.token, &payload)
        } else {
            Ok(None)
        };
        let result = match append {
            Ok(Some(token)) => Ok((token, self.frames + 1)),
            Ok(None) => {
                let bytes = match checkpoint {
                    Some(bytes) => bytes,
                    None => encode(&self.state.checkpoint()?, &receipts, self.limit)?,
                };
                self.store
                    .commit(Some(&self.token), &bytes)
                    .map(|token| (token, 0))
            }
            Err(error) => Err(error),
        };
        match result {
            Ok((token, frames)) => {
                self.token = token;
                self.frames = frames;
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
        if let Some(old) = self.receipts.iter().find(|r| r.id == id) {
            if replay_value(&unpacked(&old.request)?) != replay_value(&unpacked(&request)?) {
                return Err("request id reused with different arguments".into());
            }
            return unpacked(&old.reply);
        }
        let before = self.state.version();
        let prior = self.begin()?;
        let result = (|| {
            let reply = self.state.invoke(call, args)?;
            let encoded = packed(&reply)?;
            let mut receipts = self.receipts.clone();
            keep_receipt(
                &mut receipts,
                Receipt {
                    id: id.into(),
                    request: request.clone(),
                    reply: encoded.clone(),
                },
                self.limit,
            );
            let after = self.state.version();
            self.publish(receipts, json!({"format":"ink-durable-operation-v1","kind":if after==before {"receipt"} else {"invoke"},"before":before.to_string(),"after":after.to_string(),"receipt":{"id":id,"request":request,"reply":encoded}}))?;
            Ok(reply)
        })();
        if result.is_ok() {
            self.state.commit_transaction();
        } else {
            self.rollback(prior);
        }
        result
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
        let prior = self.begin()?;
        let version = self.state.version();
        self.state.acknowledge(commit, position);
        let result = self.publish(self.receipts.clone(), json!({"format":"ink-durable-operation-v1","kind":"ack","before":version.to_string(),"after":version.to_string(),"commit":commit.to_string(),"position":position.to_string()}));
        if result.is_ok() {
            self.state.commit_transaction();
        } else {
            self.rollback(prior);
        }
        result
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
    current: Option<String>,
    length: usize,
    journal: bool,
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
        Ok(Self {
            path,
            parent,
            current: None,
            length: 0,
            journal: false,
        })
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
        file.take((LOG_LIMIT + 1) as u64)
            .read_to_end(&mut bytes)
            .map_err(|e| e.to_string())?;
        let (_, _, current, consumed) = split_log(&bytes)?;
        if consumed < bytes.len() {
            OpenOptions::new()
                .write(true)
                .open(&self.path)
                .and_then(|f| {
                    f.set_len(consumed as u64)?;
                    f.sync_all()
                })
                .map_err(|e| e.to_string())?;
            bytes.truncate(consumed);
        }
        self.current = Some(current.clone());
        self.length = consumed;
        self.journal = bytes.starts_with(b"INKL");
        Ok(Some((current, bytes)))
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
        let envelope = log_base(bytes);
        let result = (|| {
            file.write_all(&envelope).map_err(|e| e.to_string())?;
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
        if let Ok(current) = &result {
            self.current = Some(current.clone());
            self.length = envelope.len();
            self.journal = true;
        }
        result
    }
    fn append(&mut self, expected: &str, bytes: &[u8]) -> Result<Option<String>> {
        if self.current.as_deref() != Some(expected) {
            return Err("storage conflict".into());
        }
        if !self.journal {
            return Ok(None);
        }
        let (frame, current) = framed(expected, bytes)?;
        if self.length + frame.len() > LOG_LIMIT {
            return Ok(None);
        }
        let mut file = OpenOptions::new()
            .append(true)
            .open(&self.path)
            .map_err(|e| e.to_string())?;
        if file.metadata().map_err(|e| e.to_string())?.len() != self.length as u64 {
            return Err("storage conflict".into());
        }
        file.write_all(&frame)
            .and_then(|_| file.sync_all())
            .map_err(|e| e.to_string())?;
        self.current = Some(current.clone());
        self.length += frame.len();
        Ok(Some(current))
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
