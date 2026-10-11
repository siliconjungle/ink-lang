#[cfg(target_endian = "big")]
compile_error!("packed compute CPU ABI currently requires little endian");
// Compiled CPU and resident wgpu pipelines using the same packed ABI and WGSL
// as the browser host. Profiles measure whole executions, never correctness.
mod assets;
use serde_json::{json, Value};
use std::{
    collections::BTreeMap,
    ffi::c_void,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::Instant,
};
type Result<T> = std::result::Result<T, String>;
const MAX_BYTES: usize = 256 * 1024 * 1024;
extern "C" {
    fn ink_compute_call(
        f: u32,
        data: *const *const c_void,
        lengths: *const usize,
        out: *mut *mut c_void,
        count: *mut usize,
    );
    fn ink_compute_reset();
    fn ink_compute_into(
        f: u32,
        data: *const *const c_void,
        lengths: *const usize,
        destination: *mut c_void,
    ) -> usize;
}
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Backend {
    Auto,
    Cpu,
    Gpu,
}
impl Backend {
    pub fn parse(s: &str) -> Result<Self> {
        match s {
            "auto" => Ok(Self::Auto),
            "cpu" => Ok(Self::Cpu),
            "gpu" => Ok(Self::Gpu),
            _ => Err("backend must be auto, cpu or gpu".into()),
        }
    }
}
fn width(t: &Value) -> usize {
    match t["kind"].as_str().unwrap() {
        "list" => width(&t["element"]),
        "vector" => t["size"].as_u64().unwrap() as usize * width(&t["element"]),
        "record" => t["fields"]
            .as_array()
            .unwrap()
            .iter()
            .map(|f| width(&f["type"]))
            .sum(),
        "u64" => 2,
        _ => 1,
    }
}
#[derive(Clone)]
struct Data {
    words: Arc<Vec<u32>>,
    count: usize,
    finite: bool,
}
fn pack(v: &Value, t: &Value) -> Result<Data> {
    fn go(v: &Value, t: &Value, w: &mut Vec<u32>, finite: &mut bool) -> Result<()> {
        match t["kind"].as_str().unwrap() {
            "list" => {
                for x in v.as_array().ok_or("expected list")? {
                    go(x, &t["element"], w, finite)?;
                }
            }
            "vector" => {
                let a = v.as_array().ok_or("expected vector")?;
                if a.len() != t["size"].as_u64().unwrap() as usize {
                    return Err("vector dimension mismatch".into());
                }
                for x in a {
                    go(x, &t["element"], w, finite)?
                }
            }
            "record" => {
                let a = v.as_object().ok_or("expected record")?;
                let fields = t["fields"].as_array().unwrap();
                if a.len() != fields.len() {
                    return Err("record fields mismatch".into());
                }
                for f in fields {
                    go(
                        a.get(f["name"].as_str().unwrap())
                            .ok_or("missing record field")?,
                        &f["type"],
                        w,
                        finite,
                    )?
                }
            }
            "bool" => w.push(v.as_bool().ok_or("expected Bool")? as u32),
            "u32" => w.push(
                u32::try_from(v.as_u64().ok_or("expected u32")?)
                    .map_err(|_| "u32 outside range")?,
            ),
            "i32" => w.push(
                i32::try_from(v.as_i64().ok_or("expected i32")?).map_err(|_| "i32 outside range")?
                    as u32,
            ),
            "u64" => {
                let n = if let Some(s) = v.as_str() {
                    s.parse::<u64>().map_err(|_| "u64 outside range")?
                } else {
                    v.as_u64().ok_or("expected u64")?
                };
                w.push(n as u32);
                w.push((n >> 32) as u32);
            }
            "f32" => {
                let bits = if let Some(n) = v.as_f64() {
                    let f = n as f32;
                    if !f.is_finite() {
                        return Err("f32 input overflow".into());
                    }
                    f.to_bits()
                } else {
                    if v.as_object().is_none_or(|o| o.len() != 1) {
                        return Err("expected finite f32 or explicit F32Bits".into());
                    }
                    u32::try_from(v["F32Bits"].as_u64().ok_or("invalid F32Bits")?)
                        .map_err(|_| "invalid F32Bits")?
                };
                *finite &= f32::from_bits(bits).is_finite();
                w.push(bits);
            }
            _ => return Err("invalid compiled type".into()),
        };
        if w.len() * 4 > MAX_BYTES {
            return Err("input exceeds 256 MiB budget".into());
        }
        Ok(())
    }
    let mut words = Vec::new();
    let mut finite = true;
    go(v, t, &mut words, &mut finite)?;
    let count = if t["kind"] == "list" {
        v.as_array().unwrap().len()
    } else {
        1
    };
    Ok(Data {
        words: Arc::new(words),
        count,
        finite,
    })
}
fn unpack(d: &Data, t: &Value) -> Value {
    fn go(w: &[u32], i: &mut usize, t: &Value) -> Value {
        match t["kind"].as_str().unwrap() {
            "list" => Value::Array(
                (0..w.len() / width(&t["element"]))
                    .map(|_| go(w, i, &t["element"]))
                    .collect(),
            ),
            "vector" => Value::Array(
                (0..t["size"].as_u64().unwrap())
                    .map(|_| go(w, i, &t["element"]))
                    .collect(),
            ),
            "record" => Value::Object(
                t["fields"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|f| (f["name"].as_str().unwrap().into(), go(w, i, &f["type"])))
                    .collect(),
            ),
            "u64" => {
                let n = w[*i] as u64 + ((w[*i + 1] as u64) << 32);
                *i += 2;
                if n > 9007199254740991 {
                    json!(n.to_string())
                } else {
                    json!(n)
                }
            }
            k => {
                let n = w[*i];
                *i += 1;
                match k {
                    "u32" => json!(n),
                    "i32" => json!(n as i32),
                    "bool" => json!(n != 0),
                    "f32" => {
                        let f = f32::from_bits(n);
                        if f.is_finite() {
                            json!(f)
                        } else {
                            json!({"F32Bits":n})
                        }
                    }
                    _ => unreachable!(),
                }
            }
        }
    }
    go(&d.words, &mut 0, t)
}
#[derive(Clone)]
struct Ref {
    step: bool,
    index: usize,
    input: Option<String>,
    ty: Value,
    count: Option<usize>,
}
struct Step {
    id: String,
    f: Value,
    args: Vec<Ref>,
    count: Option<usize>,
}
struct Plan {
    constants: Vec<Data>,
    inputs: BTreeMap<String, Ref>,
    steps: Vec<Step>,
    outputs: Vec<usize>,
    feedback: BTreeMap<String, usize>,
    iterations: usize,
    reason: Option<String>,
    bytes: usize,
}
fn compile(v: &Value, m: &Value) -> Result<Plan> {
    let source = v["steps"]
        .as_array()
        .ok_or("pipeline steps must be an array")?;
    if source.is_empty() || source.len() > 64 {
        return Err("pipeline requires 1..64 steps".into());
    }
    let iterations = v
        .get("iterations")
        .map(|n| n.as_u64().ok_or("invalid iterations"))
        .transpose()?
        .unwrap_or(1) as usize;
    if iterations == 0 || iterations > 10000 || iterations * source.len() > 65536 {
        return Err("pipeline iteration/dispatch limit".into());
    }
    let mut constants = Vec::new();
    let mut inputs: BTreeMap<String, Ref> = BTreeMap::new();
    let mut steps: Vec<Step> = Vec::new();
    let mut ids = BTreeMap::new();
    let mut reason = None;
    for s in source {
        let id = s["id"]
            .as_str()
            .filter(|s| !s.is_empty())
            .ok_or("invalid step id")?
            .to_string();
        if ids.contains_key(&id) {
            return Err("duplicate step id".into());
        }
        let f = m["functions"]
            .as_array()
            .unwrap()
            .iter()
            .find(|f| f["name"] == s["call"])
            .ok_or("unknown function")?
            .clone();
        let a = s["args"].as_array().ok_or("arguments must be an array")?;
        let params = f["params"].as_array().unwrap();
        if a.len() != params.len() {
            return Err("argument count mismatch".into());
        }
        let mut args = Vec::new();
        for (a, param) in a.iter().zip(params) {
            let t = &param["type"];
            let reference = a.as_object().filter(|o| o.len() == 1);
            let r = if let Some(id) = reference.and_then(|o| o.get("step")) {
                let id = id.as_str().ok_or("invalid step reference")?;
                let index = *ids
                    .get(id)
                    .ok_or("step reference must name an earlier step")?;
                let s: &Step = &steps[index];
                if s.f["result"] != *t {
                    return Err("step reference type mismatch".into());
                }
                Ref {
                    step: true,
                    index,
                    input: None,
                    ty: t.clone(),
                    count: s.count,
                }
            } else if let Some(input) = reference.and_then(|o| o.get("input")) {
                let input = input.as_str().ok_or("invalid input reference")?;
                if let Some(r) = inputs.get(input) {
                    if r.ty != *t {
                        return Err("pipeline input used with different types".into());
                    }
                    r.clone()
                } else {
                    let value = v["inputs"].get(input).ok_or("unknown pipeline input")?;
                    let d = pack(value, t)?;
                    let count = d.count;
                    constants.push(d);
                    let r = Ref {
                        step: false,
                        index: constants.len() - 1,
                        input: Some(input.into()),
                        ty: t.clone(),
                        count: Some(count),
                    };
                    inputs.insert(input.into(), r.clone());
                    r
                }
            } else {
                let d = pack(a, t)?;
                let count = d.count;
                constants.push(d);
                Ref {
                    step: false,
                    index: constants.len() - 1,
                    input: None,
                    ty: t.clone(),
                    count: Some(count),
                }
            };
            args.push(r);
        }
        if let Some(limit) = f["gpu_max_elements"].as_u64() {
            if args.iter().any(|a| a.count.unwrap_or(0) > limit as usize) {
                reason.get_or_insert(
                    "literal GPU collection work limit; compiled CPU fallback".into(),
                );
            }
        }
        let count = if f["graph_required"].as_bool() == Some(true) {
            Some(
                device::graph_capacity(
                    &f["graph"],
                    &args
                        .iter()
                        .map(|a| a.count.unwrap_or(0))
                        .collect::<Vec<_>>(),
                )?
                .1,
            )
        } else if f["shader"].is_string() {
            f["lengths"]
                .as_array()
                .unwrap()
                .iter()
                .map(|i| args[i.as_u64().unwrap() as usize].count)
                .collect::<Option<Vec<_>>>()
                .and_then(|a| a.into_iter().max())
        } else {
            reason.get_or_insert_with(|| {
                f["fallback_reason"]
                    .as_str()
                    .unwrap_or("CPU-only function")
                    .into()
            });
            None
        };
        ids.insert(id.clone(), steps.len());
        steps.push(Step { id, f, args, count });
    }
    let output_ids = v
        .get("outputs")
        .cloned()
        .unwrap_or(json!([steps.last().unwrap().id]));
    let output_ids = output_ids.as_array().ok_or("outputs must be an array")?;
    let mut outputs = Vec::new();
    for id in output_ids {
        let i = *ids
            .get(id.as_str().ok_or("invalid output id")?)
            .ok_or("unknown output")?;
        if outputs.contains(&i) {
            return Err("duplicate output".into());
        }
        outputs.push(i);
    }
    if outputs.is_empty() {
        return Err("pipeline requires outputs".into());
    }
    let mut feedback = BTreeMap::new();
    if v.get("feedback")
        .and_then(Value::as_object)
        .is_some_and(|f| !f.is_empty())
        && steps
            .iter()
            .any(|s| s.f["graph_required"].as_bool() == Some(true))
    {
        reason.get_or_insert("GPU stage graph feedback is unsupported".into());
    }
    if let Some(f) = v.get("feedback") {
        for (input, id) in f.as_object().ok_or("feedback must be an object")? {
            let r = inputs.get(input).ok_or("unknown feedback input")?;
            let i = *ids
                .get(id.as_str().ok_or("invalid feedback step")?)
                .ok_or("unknown feedback step")?;
            if r.ty != steps[i].f["result"] {
                return Err("feedback type mismatch".into());
            }
            if r.count != steps[i].count {
                reason.get_or_insert("feedback changes array shape; compiled CPU pipeline".into());
            }
            feedback.insert(input.clone(), i);
        }
    }
    if constants.iter().any(|c| !c.finite) {
        reason.get_or_insert("non-finite f32 inputs require CPU".into());
    }
    let bytes = constants
        .iter()
        .map(|c| ((c.words.len() + 1) * 4).max(4))
        .sum::<usize>()
        + steps
            .iter()
            .map(|s| {
                2 * ((1 + s.count.unwrap_or(0) * width(&s.f["result"])) * 4).max(4)
                    + 4 * (s.args.len() + 1)
            })
            .sum::<usize>()
        + outputs
            .iter()
            .map(|i| {
                ((1 + steps[*i].count.unwrap_or(0) * width(&steps[*i].f["result"])) * 4).max(4)
            })
            .sum::<usize>();
    if bytes > MAX_BYTES {
        reason.get_or_insert("GPU live-buffer budget exceeds 256 MiB".into());
    }
    Ok(Plan {
        constants,
        inputs,
        steps,
        outputs,
        feedback,
        iterations,
        reason,
        bytes,
    })
}
fn cpu_call(f: &Value, args: &[Data]) -> Result<Data> {
    let pointers: Vec<*const c_void> = args.iter().map(|d| d.words.as_ptr().cast()).collect();
    let lengths: Vec<usize> = args.iter().map(|d| d.count).collect();
    unsafe {
        ink_compute_reset();
        let mut out = std::ptr::null_mut();
        let mut count = 0;
        ink_compute_call(
            f["index"].as_u64().unwrap() as u32,
            pointers.as_ptr(),
            lengths.as_ptr(),
            &mut out,
            &mut count,
        );
        if count > MAX_BYTES / 4 {
            ink_compute_reset();
            return Err("CPU output exceeds 256 MiB".into());
        }
        let words = std::slice::from_raw_parts(out.cast::<u32>(), count).to_vec();
        ink_compute_reset();
        let count = if f["result"]["kind"] == "list" {
            count / width(&f["result"]["element"])
        } else {
            1
        };
        Ok(Data {
            words: Arc::new(words),
            count,
            finite: true,
        })
    }
}
fn cpu(p: &Plan) -> Result<Value> {
    let mut inputs: BTreeMap<String, Data> = p
        .inputs
        .iter()
        .map(|(n, r)| (n.clone(), p.constants[r.index].clone()))
        .collect();
    let mut values: Vec<Option<Data>> = vec![None; p.steps.len()];
    for _ in 0..p.iterations {
        for (i, s) in p.steps.iter().enumerate() {
            let args = s
                .args
                .iter()
                .map(|r| {
                    if let Some(n) = &r.input {
                        inputs[n].clone()
                    } else if r.step {
                        values[r.index].as_ref().unwrap().clone()
                    } else {
                        p.constants[r.index].clone()
                    }
                })
                .collect::<Vec<_>>();
            values[i] = Some(cpu_call(&s.f, &args)?);
        }
        for (n, i) in &p.feedback {
            inputs.insert(n.clone(), values[*i].as_ref().unwrap().clone());
        }
    }
    let values: serde_json::Map<_, _> = p
        .outputs
        .iter()
        .map(|i| {
            (
                p.steps[*i].id.clone(),
                unpack(values[*i].as_ref().unwrap(), &p.steps[*i].f["result"]),
            )
        })
        .collect();
    Ok(json!({"values":values,"counters":{"upload_bytes":0,"readback_bytes":0,"dispatches":0}}))
}
mod device;
use device::Gpu;
#[derive(Clone)]
struct Profile {
    cpu_ms: f64,
    gpu_ms: f64,
    setup_ms: f64,
    uses: usize,
    gpu: bool,
}
impl Profile {
    fn json(&self) -> Value {
        json!({"cpu_ms":self.cpu_ms,"gpu_ms":self.gpu_ms,"setup_ms":self.setup_ms,"uses":self.uses,"gpu":self.gpu})
    }
}
fn ms(t: Instant) -> f64 {
    t.elapsed().as_secs_f64() * 1000.0
}
fn median(mut v: Vec<f64>) -> f64 {
    v.sort_by(f64::total_cmp);
    v[1]
}
pub struct Engine {
    manifest: Value,
    gpu: Option<Gpu>,
    gpu_error: Option<String>,
    profiles: BTreeMap<String, Profile>,
}
impl Default for Engine {
    fn default() -> Self {
        Self::new()
    }
}
impl Engine {
    pub fn new() -> Self {
        Self {
            manifest: serde_json::from_str(assets::MANIFEST).unwrap(),
            gpu: None,
            gpu_error: None,
            profiles: BTreeMap::new(),
        }
    }
    /// Execute a compiled list function into caller-owned packed storage.
    ///
    /// # Safety
    /// Parameters must match the declared function ABI; lengths are logical
    /// element counts. The destination must be sufficiently large, aligned to
    /// eight bytes, writable and disjoint from every reachable input. No other
    /// arena-backed result may remain live across this call. Returned count is
    /// in 32-bit words. Caller storage remains valid after scratch is reset.
    pub unsafe fn call_packed_into(
        &mut self,
        index: u32,
        data: &[*const c_void],
        lengths: &[usize],
        destination: *mut u32,
    ) -> usize {
        ink_compute_reset();
        let count = ink_compute_into(index, data.as_ptr(), lengths.as_ptr(), destination.cast());
        ink_compute_reset();
        count
    }
    pub fn manifest(&self) -> &Value {
        &self.manifest
    }
    pub fn call(&mut self, name: &str, args: &Value, backend: Backend) -> Result<Value> {
        let mut r = self.pipeline(
            &json!({"steps":[{"id":"result","call":name,"args":args}],"outputs":["result"]}),
            backend,
        )?;
        r["value"] = r["values"]["result"].clone();
        Ok(r)
    }
    pub fn pipeline(&mut self, source: &Value, backend: Backend) -> Result<Value> {
        let p = compile(source, &self.manifest)?;
        if backend == Backend::Cpu || p.reason.is_some() {
            let mut r = cpu(&p)?;
            r["backend"] = json!("cpu");
            r["reason"] = json!(if backend == Backend::Cpu {
                "explicit CPU selection"
            } else {
                p.reason.as_deref().unwrap()
            });
            return Ok(r);
        }
        let key = json!([
            p.steps
                .iter()
                .map(|s| json!([
                    s.f["index"],
                    s.args
                        .iter()
                        .map(|a| json!([a.step, a.index, a.count]))
                        .collect::<Vec<_>>()
                ]))
                .collect::<Vec<_>>(),
            p.iterations,
            p.feedback,
            p.outputs,
            p.constants
                .iter()
                .map(|c| json!([c.count, c.words.iter().take(8).collect::<Vec<_>>()]))
                .collect::<Vec<_>>()
        ])
        .to_string();
        let selected = (|| -> Result<Value> {
            if let Some(e) = &self.gpu_error {
                return Err(e.clone());
            }
            let setup = Instant::now();
            if self.gpu.is_none() {
                match Gpu::new() {
                    Ok(g) => self.gpu = Some(g),
                    Err(e) => {
                        self.gpu_error = Some(e.clone());
                        return Err(e);
                    }
                }
            }
            self.gpu.as_mut().unwrap().prepare(&p)?;
            let setup_ms = ms(setup);
            if backend == Backend::Gpu {
                let mut r = self.gpu.as_ref().unwrap().execute(&p)?;
                r["backend"] = json!("gpu");
                r["reason"] = json!("explicit GPU selection");
                return Ok(r);
            }
            if self.profiles.get(&key).is_none_or(|p| p.uses >= 32) {
                let mut ct = Vec::new();
                let mut gt = Vec::new();
                for trial in 0..3 {
                    if trial % 2 == 0 {
                        let t = Instant::now();
                        cpu(&p)?;
                        ct.push(ms(t));
                        let t = Instant::now();
                        self.gpu.as_ref().unwrap().execute(&p)?;
                        gt.push(ms(t));
                    } else {
                        let t = Instant::now();
                        self.gpu.as_ref().unwrap().execute(&p)?;
                        gt.push(ms(t));
                        let t = Instant::now();
                        cpu(&p)?;
                        ct.push(ms(t));
                    }
                }
                let cpu_ms = median(ct);
                let gpu_ms = median(gt);
                if self.profiles.len() >= 32 {
                    self.profiles.pop_first();
                }
                self.profiles.insert(
                    key.clone(),
                    Profile {
                        cpu_ms,
                        gpu_ms,
                        setup_ms,
                        uses: 0,
                        gpu: gpu_ms + setup_ms / 32.0 < cpu_ms * 0.9,
                    },
                );
            }
            let profile = self.profiles.get_mut(&key).unwrap();
            profile.uses += 1;
            let profile = profile.clone();
            let mut r = if profile.gpu {
                self.gpu.as_ref().unwrap().execute(&p)?
            } else {
                cpu(&p)?
            };
            r["backend"] = json!(if profile.gpu { "gpu" } else { "cpu" });
            r["reason"]=json!("measured whole pipeline including transfers; setup amortised over 32 uses, 10% minimum saving");
            r["profile"] = profile.json();
            Ok(r)
        })();
        match selected {
            Ok(r) => Ok(r),
            Err(e) => {
                self.profiles.remove(&key);
                let mut r = cpu(&p)?;
                r["backend"] = json!("cpu");
                r["reason"] = json!(format!("GPU fallback: {e}"));
                Ok(r)
            }
        }
    }
}
