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
};
type Result<T> = std::result::Result<T, String>;
const MAX_BYTES: usize = 256 * 1024 * 1024;
/// Per pipeline call or per session step.
const MAX_ITERATIONS: usize = 1_000_000;
const MAX_DISPATCHES: usize = 64 * 1024 * 1024;
mod cpu;
use cpu::{ink_compute_call,ink_compute_reset,ink_compute_into};

mod backend;
pub use backend::Backend;
use ink_abi::packed::{width,Data,pack,unpack};
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
    // Iterations run resident on the device and are submitted in bounded
    // chunks, so long runs need no per-call cap beyond these sanity bounds.
    if iterations == 0
        || iterations > MAX_ITERATIONS
        || iterations.saturating_mul(source.len()) > MAX_DISPATCHES
    {
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
    if steps
        .iter()
        .any(|s| s.f["graph_required"].as_bool() == Some(true))
        && steps.iter().any(|s| !s.f["graph"].is_object())
    {
        reason.get_or_insert(
            "GPU mixed stage graph requires a graph descriptor for every stage".into(),
        );
    }
    let mut feedback = BTreeMap::new();
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
    let feedback_bytes = if steps
        .iter()
        .any(|s| s.f["graph_required"].as_bool() == Some(true))
    {
        feedback.values().try_fold(0usize, |bytes, i| {
            let step = &steps[*i];
            let words = step
                .count
                .unwrap_or(0)
                .checked_mul(width(&step.f["result"]))
                .and_then(|n| n.checked_add(usize::from(step.f["result"]["kind"] == "list")))
                .ok_or("feedback snapshot size overflow")?;
            bytes
                .checked_add(
                    words
                        .checked_mul(4)
                        .ok_or("feedback snapshot size overflow")?
                        .max(4),
                )
                .ok_or("feedback snapshot size overflow")
        })?
    } else {
        0
    };
    let bytes = feedback_bytes
        + constants
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
    let p = Plan {
        constants,
        inputs,
        steps,
        outputs,
        feedback,
        iterations,
        reason,
        bytes,
    };
    if iterations.saturating_mul(device::dispatch_count(&p)) > MAX_DISPATCHES {
        return Err("pipeline iteration/dispatch limit".into());
    }
    Ok(p)
}
fn cpu_call(f: &Value, args: &[Data]) -> Result<Data> {
    if !f["precondition"].is_null() && cpu_call(&f["precondition"],args)?.words.first()!=Some(&1) {
        return Err("contract precondition failed".into());
    }
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
pub use device::View;

/// Host twin of a resident GPU session, with identical semantics.
struct CpuSession {
    inputs: BTreeMap<String, Data>,
    values: Vec<Option<Data>>,
    iteration: u64,
}
fn cpu_open(p: &Plan) -> CpuSession {
    CpuSession {
        inputs: p
            .inputs
            .iter()
            .map(|(n, r)| (n.clone(), p.constants[r.index].clone()))
            .collect(),
        values: vec![None; p.steps.len()],
        iteration: 0,
    }
}
fn cpu_step(p: &Plan, s: &mut CpuSession, iterations: u64) -> Result<()> {
    for _ in 0..iterations {
        for (i, step) in p.steps.iter().enumerate() {
            let args = step
                .args
                .iter()
                .map(|r| {
                    if let Some(n) = &r.input {
                        s.inputs[n].clone()
                    } else if r.step {
                        s.values[r.index].as_ref().unwrap().clone()
                    } else {
                        p.constants[r.index].clone()
                    }
                })
                .collect::<Vec<_>>();
            s.values[i] = Some(cpu_call(&step.f, &args)?);
        }
        for (n, i) in &p.feedback {
            s.inputs.insert(n.clone(), s.values[*i].as_ref().unwrap().clone());
        }
        s.iteration += 1;
    }
    Ok(())
}
fn graph_mode(p: &Plan) -> bool {
    p.steps
        .iter()
        .any(|s| s.f["graph_required"].as_bool() == Some(true))
}
/// Same shape rules as the device: element-wise sessions keep every input
/// length; graph sessions accept list lengths up to the opened capacity.
fn check_write(p: &Plan, input: &str, d: &Data) -> Result<()> {
    let r = p.inputs.get(input).ok_or("unknown pipeline input")?;
    let capacity = r.count.unwrap_or(0);
    let list = r.ty["kind"] == "list";
    if graph_mode(p) {
        if d.count > capacity || (!list && d.count != 1) {
            return Err("written input exceeds the session capacity".into());
        }
    } else if d.count != capacity {
        return Err("steps sessions keep input shapes; reopen to change a length".into());
    }
    Ok(())
}
fn cpu_write(p: &Plan, s: &mut CpuSession, input: &str, d: Data) -> Result<Value> {
    check_write(p, input, &d)?;
    if let Some(step) = p.feedback.get(input).filter(|_| s.iteration > 0) {
        s.values[*step] = Some(d.clone());
    }
    let bytes = d.words.len() * 4;
    s.inputs.insert(input.into(), d);
    Ok(json!({"counters": {"upload_bytes": bytes}}))
}
fn cpu_read(p: &Plan, s: &CpuSession, q: &Value) -> Result<Value> {
    if s.iteration == 0 {
        return Err("session has not run an iteration".into());
    }
    let index = |id: &Value| -> Result<usize> {
        let id = id.as_str().ok_or("read requires a step id")?;
        p.steps.iter().position(|s| s.id == id).ok_or("unknown step".into())
    };
    let value = |i: usize| s.values[i].as_ref().ok_or("step has no value".to_string());
    if let Some(ids) = q.get("outputs") {
        let mut values = serde_json::Map::new();
        for id in ids.as_array().ok_or("outputs must be an array")? {
            let i = index(id)?;
            values.insert(p.steps[i].id.clone(), unpack(value(i)?, &p.steps[i].f["result"]));
        }
        return Ok(json!({"values": values, "counters": {"readback_bytes": 0}}));
    }
    let i = index(&q["step"])?;
    let d = value(i)?;
    let ty = &p.steps[i].f["result"];
    let list = ty["kind"] == "list";
    let element = if list { &ty["element"] } else { ty };
    let w = width(element);
    let n = d.count;
    if q.get("length").and_then(Value::as_bool) == Some(true) {
        return Ok(json!({"length": n, "counters": {"readback_bytes": 0}}));
    }
    if let Some(slice) = q.get("slice") {
        let a = slice.as_array().filter(|a| a.len() == 2).ok_or("slice must be [start, count]")?;
        let start = a[0].as_u64().ok_or("slice bounds must be naturals")? as usize;
        let want = a[1].as_u64().ok_or("slice bounds must be naturals")? as usize;
        if !list {
            return Err("slice requires a list value".into());
        }
        let start = start.min(n);
        let take = want.min(n - start);
        let part = Data {
            words: Arc::new(d.words[start * w..(start + take) * w].to_vec()),
            count: take,
            finite: true,
        };
        return Ok(json!({"value": unpack(&part, ty), "length": n, "start": start, "counters": {"readback_bytes": 0}}));
    }
    if let Some(op) = q.get("reduce").and_then(Value::as_str) {
        let (offset, field) = device::field_path(element, q.get("field"))?;
        let (kind, components) = device::reducible(&field)?;
        let reduce = |o: &str| -> Value {
            let lanes = if kind == "u64" { 2 } else { 1 };
            let mut acc: Vec<Option<Vec<u32>>> = vec![None; components];
            for e in 0..n {
                for (c, slot) in acc.iter_mut().enumerate() {
                    let at = e * w + offset + c * lanes;
                    let v = d.words[at..at + lanes].to_vec();
                    *slot = Some(match slot.take() {
                        None => v,
                        Some(a) => combine(&kind, o, &a, &v),
                    });
                }
            }
            if n == 0 && o != "sum" {
                return Value::Null;
            }
            let words: Vec<u32> = acc
                .into_iter()
                .flat_map(|a| a.unwrap_or_else(|| vec![0; lanes]))
                .collect();
            device::decode_components(&kind, components, &words)
        };
        let value = match op {
            "sum" | "min" | "max" => reduce(op),
            "bounds" => json!({"min": reduce("min"), "max": reduce("max")}),
            _ => return Err("reduce must be sum, min, max or bounds".into()),
        };
        return Ok(json!({"value": value, "length": n, "counters": {"readback_bytes": 0}}));
    }
    Err("read requires outputs, length, slice or reduce".into())
}
/// Exact integer semantics (wrapping); f32 combines in element order.
fn combine(kind: &str, op: &str, a: &[u32], b: &[u32]) -> Vec<u32> {
    match kind {
        "u64" => {
            let x = a[0] as u64 | ((a[1] as u64) << 32);
            let y = b[0] as u64 | ((b[1] as u64) << 32);
            let r = match op { "sum" => x.wrapping_add(y), "min" => x.min(y), _ => x.max(y) };
            vec![r as u32, (r >> 32) as u32]
        }
        "i32" => {
            let (x, y) = (a[0] as i32, b[0] as i32);
            vec![(match op { "sum" => x.wrapping_add(y), "min" => x.min(y), _ => x.max(y) }) as u32]
        }
        "f32" => {
            let (x, y) = (f32::from_bits(a[0]), f32::from_bits(b[0]));
            vec![(match op { "sum" => x + y, "min" => x.min(y), _ => x.max(y) }).to_bits()]
        }
        _ => vec![match op { "sum" => a[0].wrapping_add(b[0]), "min" => a[0].min(b[0]), _ => a[0].max(b[0]) }],
    }
}
enum State {
    Cpu(CpuSession),
    Gpu(device::Resident),
}
struct Session {
    plan: Plan,
    state: State,
    reason: Value,
}
pub struct Engine {
    manifest: Value,
    gpu: Option<Gpu>,
    gpu_error: Option<String>,
    selection_options: Value,
    sessions: BTreeMap<u64, Session>,
    next_session: u64,
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
            selection_options: json!({}),
            sessions: BTreeMap::new(),
            next_session: 1,
        }
    }
    /// Run on an application's wgpu device, so session buffers can feed its
    /// renderer or other pipelines directly with no readback.
    pub fn with_device(device: wgpu::Device, queue: wgpu::Queue) -> Self {
        let mut engine = Self::new();
        engine.gpu = Some(Gpu::with_device(None, device, queue));
        engine
    }
    /// The engine's device and queue once GPU execution has started.
    pub fn device(&self) -> Option<(&wgpu::Device, &wgpu::Queue)> {
        self.gpu.as_ref().map(Gpu::handles)
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
    pub fn configure_selection(&mut self,options:Value)->Result<()>{
        ink_abi::selection::decide(&options,&json!({}),&["cpu".into()])?;
        self.selection_options=options;Ok(())
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
    fn gpu_ready(&mut self) -> Result<&mut Gpu> {
        if let Some(e) = &self.gpu_error {
            return Err(e.clone());
        }
        if self.gpu.is_none() {
            match Gpu::new() {
                Ok(g) => self.gpu = Some(g),
                Err(e) => {
                    self.gpu_error = Some(e.clone());
                    return Err(e);
                }
            }
        }
        Ok(self.gpu.as_mut().unwrap())
    }
    /// Open a resident session: inputs are uploaded once and every buffer
    /// stays on the device across `step`, `read` and `write` calls. No
    /// iteration runs until `step`. Selection follows `pipeline`; when the
    /// GPU cannot run the plan the session runs on the compiled CPU with the
    /// same semantics.
    pub fn open(&mut self, source: &Value, backend: Backend) -> Result<Value> {
        let p = compile(source, &self.manifest)?;
        if backend == Backend::GpuRequired && p.reason.is_some() {
            return Err(p.reason.clone().unwrap());
        }
        let id = self.next_session;
        let (state, reason) = if backend == Backend::Cpu || p.reason.is_some() {
            let reason = if backend == Backend::Cpu {
                "explicit CPU selection".to_string()
            } else {
                p.reason.clone().unwrap()
            };
            (State::Cpu(cpu_open(&p)), json!(reason))
        } else {
            let opened = (|| -> Result<device::Resident> {
                let gpu = self.gpu_ready()?;
                gpu.prepare(&p)?;
                gpu.open(&p)
            })();
            match opened {
                Ok(r) => (State::Gpu(r), json!("resident GPU session")),
                Err(e) if backend != Backend::GpuRequired => {
                    (State::Cpu(cpu_open(&p)), json!(format!("GPU fallback: {e}")))
                }
                Err(e) => return Err(e),
            }
        };
        let (name, upload) = match &state {
            State::Cpu(_) => ("cpu", 0),
            State::Gpu(_) => ("gpu", p.constants.iter().map(|c| (c.words.len() + 1) * 4).sum::<usize>()),
        };
        self.next_session += 1;
        self.sessions.insert(id, Session { plan: p, state, reason: reason.clone() });
        Ok(json!({"session": id, "backend": name, "reason": reason, "counters": {"upload_bytes": upload}}))
    }
    /// Run more iterations. Nothing is read back; GPU work is submitted and
    /// may still be executing when this returns (see `finish`).
    pub fn step(&mut self, session: u64, iterations: u64) -> Result<Value> {
        if iterations == 0 || iterations as usize > MAX_ITERATIONS {
            return Err("session step iteration limit".into());
        }
        let s = self.sessions.get_mut(&session).ok_or("unknown session")?;
        if iterations.saturating_mul(device::dispatch_count(&s.plan) as u64) > MAX_DISPATCHES as u64 {
            return Err("session step iteration limit".into());
        }
        match &mut s.state {
            State::Cpu(c) => {
                cpu_step(&s.plan, c, iterations)?;
                Ok(json!({"iteration": c.iteration, "backend": "cpu", "counters": {"dispatches": 0}}))
            }
            State::Gpu(r) => {
                let gpu = self.gpu.as_ref().ok_or("GPU unavailable")?;
                let mut v = gpu.advance(r, &s.plan, iterations)?;
                let iteration = v["iteration"].clone();
                v.as_object_mut().unwrap().remove("iteration");
                Ok(json!({"iteration": iteration, "backend": "gpu", "counters": v}))
            }
        }
    }
    /// Wait for submitted GPU work (measurement only; reads also wait).
    pub fn finish(&mut self, session: u64) -> Result<()> {
        let s = self.sessions.get(&session).ok_or("unknown session")?;
        if let State::Gpu(_) = s.state {
            self.gpu.as_ref().ok_or("GPU unavailable")?.finish()?;
        }
        Ok(())
    }
    /// Read a step's current value: `{"outputs":[ids]}` (whole values),
    /// `{"step":id,"length":true}`, `{"step":id,"slice":[start,count]}`, or
    /// `{"step":id,"reduce":"sum"|"min"|"max"|"bounds","field":"a.b"}`.
    /// Reductions run on the device and return a few words. Integer sums
    /// wrap exactly; GPU f32 sums use tree order.
    pub fn read(&mut self, session: u64, request: &Value) -> Result<Value> {
        let s = self.sessions.get(&session).ok_or("unknown session")?;
        match &s.state {
            State::Cpu(c) => cpu_read(&s.plan, c, request),
            State::Gpu(r) => self.gpu.as_ref().ok_or("GPU unavailable")?.read(r, &s.plan, request),
        }
    }
    /// Replace a named input for the next iteration. A fed-back input's
    /// carried value is its step's last output, which this replaces.
    pub fn write(&mut self, session: u64, input: &str, value: &Value) -> Result<Value> {
        let s = self.sessions.get_mut(&session).ok_or("unknown session")?;
        let r = s.plan.inputs.get(input).ok_or("unknown pipeline input")?;
        let d = pack(value, &r.ty)?;
        match &mut s.state {
            State::Cpu(c) => cpu_write(&s.plan, c, input, d),
            State::Gpu(g) => {
                check_write(&s.plan, input, &d)?;
                self.gpu.as_ref().ok_or("GPU unavailable")?.write(g, &s.plan, input, &d)
            }
        }
    }
    /// The device buffer holding a step's current value, for zero-copy use
    /// by a renderer on the same device (see `with_device`). Valid until the
    /// next `step`, `write` or `close` of this session.
    pub fn view(&self, session: u64, step: &str) -> Result<View> {
        let s = self.sessions.get(&session).ok_or("unknown session")?;
        let i = s.plan.steps.iter().position(|x| x.id == step).ok_or("unknown step")?;
        match &s.state {
            State::Gpu(r) => self.gpu.as_ref().ok_or("GPU unavailable")?.view(r, &s.plan, i),
            State::Cpu(_) => Err(format!("session runs on CPU: {}", s.reason)),
        }
    }
    /// Release a session's device buffers.
    pub fn close(&mut self, session: u64) -> Result<()> {
        self.sessions.remove(&session).map(|_| ()).ok_or("unknown session".into())
    }
    pub fn pipeline(&mut self, source: &Value, backend: Backend) -> Result<Value> {
        let p = compile(source, &self.manifest)?;
        if backend==Backend::GpuRequired && p.reason.is_some(){return Err(p.reason.clone().unwrap());}
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
        let scope=json!([self.manifest["core_sha256"],self.manifest["cpu_rust_sha256"],self.manifest["javascript_sha256"],p.steps.iter().map(|s|s.f["name"].as_str().unwrap()).collect::<Vec<_>>().join("|")]).to_string();
        let graph_mode=p.steps.iter().any(|s|s.f["graph_required"].as_bool()==Some(true));
        let list_constants=p.inputs.values().chain(p.steps.iter().flat_map(|s|s.args.iter())).filter(|r|!r.step&&r.ty["kind"]=="list").map(|r|r.index).collect::<std::collections::BTreeSet<_>>();
        let inputs=p.constants.iter().enumerate().map(|(i,c)|json!({"list":list_constants.contains(&i),"count":c.count,"bytes":c.words.len()*4})).collect::<Vec<_>>();
        let outputs=p.outputs.iter().map(|i|p.steps[*i].count.unwrap_or(0)).collect::<Vec<_>>();
        let stages=p.steps.iter().map(|s|json!({"dispatches":if graph_mode{s.f["graph"]["nodes"].as_array().map_or(0,|nodes|nodes.iter().map(|n|n["schedule"]["passes"].as_array().map_or(1,Vec::len)).sum::<usize>())}else{usize::from(s.count.unwrap_or(0)>0)}})).collect::<Vec<_>>();
        let features=ink_abi::selection::features(&json!({"inputs":inputs,"outputs":outputs,"stages":stages,"iterations":p.iterations}))?;
        let decision=ink_abi::selection::decide(&self.selection_options,&json!({"scope":scope,"boundary":"captured-owned","features":features}),&["cpu".into(),"gpu".into()])?;
        if backend==Backend::Auto && decision["backend"]=="cpu"{let mut r=cpu(&p)?;r["backend"]=json!("cpu");r["reason"]=decision["reason"].clone();r["profile"]=decision;return Ok(r);}
        let selected = (|| -> Result<Value> {
            if let Some(e) = &self.gpu_error {
                return Err(e.clone());
            }
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
            let mut r=self.gpu.as_ref().unwrap().execute(&p)?;
            r["backend"]=json!("gpu");r["reason"]=if matches!(backend,Backend::Gpu|Backend::GpuRequired){json!("explicit GPU selection")}else{decision["reason"].clone()};r["profile"]=decision;
            Ok(r)
        })();
        match selected {
            Ok(r) => Ok(r),
            Err(e) => {
                if backend==Backend::GpuRequired{return Err(e);}
                let mut r = cpu(&p)?;
                r["backend"] = json!("cpu");
                r["reason"] = json!(format!("GPU fallback: {e}"));
                Ok(r)
            }
        }
    }
}
