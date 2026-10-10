//! Standalone native host: generated C CPU code, the same WGSL as the browser,
//! and bounded measured selection. No Ink AST interpreter is linked.
mod assets;
use serde_json::{json, Value};
use std::{
    collections::BTreeMap,
    ffi::c_void,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::{Duration, Instant},
};
type Result<T> = std::result::Result<T, String>;
extern "C" {
    fn ink_cpu_call(
        function: u32,
        lists: *const *const c_void,
        lengths: *const usize,
        scalars: *const u64,
    ) -> u64;
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
#[derive(Clone)]
enum Arg {
    Scalar(u64),
    U32List(Vec<u32>),
    U64List(Vec<u64>),
}
fn parse_args(f: &Value, args: &Value) -> Result<Vec<Arg>> {
    let args = args.as_array().ok_or("arguments must be a JSON array")?;
    let params = f["params"].as_array().ok_or("invalid compiled manifest")?;
    if args.len() != params.len() {
        return Err("argument count mismatch".into());
    }
    args.iter()
        .zip(params)
        .map(|(v, p)| {
            let t = p["type"].as_str().ok_or("invalid compiled type")?;
            let word = |x: &Value, small: bool| -> Result<u64> {
                let n = x.as_u64().ok_or("expected unsigned integer")?;
                if small && n > u32::MAX as u64 {
                    return Err("u32 outside range".into());
                }
                Ok(n)
            };
            Ok(match t {
                "u32" => Arg::Scalar(word(v, true)?),
                "u64" => Arg::Scalar(word(v, false)?),
                "bool" => Arg::Scalar(v.as_bool().ok_or("expected Bool")? as u64),
                "list_u32" => Arg::U32List(
                    v.as_array()
                        .ok_or("expected list")?
                        .iter()
                        .map(|x| word(x, true).map(|n| n as u32))
                        .collect::<Result<_>>()?,
                ),
                "list_u64" => Arg::U64List(
                    v.as_array()
                        .ok_or("expected list")?
                        .iter()
                        .map(|x| word(x, false))
                        .collect::<Result<_>>()?,
                ),
                _ => return Err("unsupported compiled type".into()),
            })
        })
        .collect()
}
fn cpu(f: &Value, args: &[Arg]) -> u64 {
    let mut lists = vec![std::ptr::null(); args.len()];
    let mut lengths = vec![0; args.len()];
    let mut scalars = vec![0; args.len()];
    for (i, v) in args.iter().enumerate() {
        match v {
            Arg::Scalar(n) => scalars[i] = *n,
            Arg::U32List(xs) => {
                lists[i] = xs.as_ptr().cast();
                lengths[i] = xs.len();
            }
            Arg::U64List(xs) => {
                lists[i] = xs.as_ptr().cast();
                lengths[i] = xs.len();
            }
        }
    }
    // Validated ABI arrays remain live for this synchronous generated C call.
    unsafe {
        ink_cpu_call(
            f["index"].as_u64().unwrap() as u32,
            lists.as_ptr(),
            lengths.as_ptr(),
            scalars.as_ptr(),
        )
    }
}
fn list<'a>(f: &Value, args: &'a [Arg]) -> Result<&'a [u32]> {
    match &args[f["gpu"]["list_param"].as_u64().ok_or("missing GPU list")? as usize] {
        Arg::U32List(xs) => Ok(xs),
        _ => Err("GPU needs u32 list".into()),
    }
}
fn key(f: &Value, args: &[Arg]) -> Result<String> {
    let xs = list(f, args)?;
    let n = xs.len();
    let mut zero = 0;
    let mut high = 0;
    let mut count = 0;
    for x in xs.iter().step_by((n / 64).max(1)).take(64) {
        zero += (*x == 0) as usize;
        high += (*x >= 0x80000000) as usize;
        count += 1;
    }
    let scalars: Vec<_> = args
        .iter()
        .filter_map(|a| {
            if let Arg::Scalar(n) = a {
                Some(*n)
            } else {
                None
            }
        })
        .collect();
    Ok(json!([
        f["index"],
        if n == 0 { 0 } else { n.ilog2() },
        zero * 4 / count.max(1),
        high * 4 / count.max(1),
        scalars
    ])
    .to_string())
}
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
        json!({"cpu_ms":self.cpu_ms,"gpu_ms":self.gpu_ms,"gpu_setup_ms":self.setup_ms,"expected_calls":32,"uses":self.uses})
    }
}
fn ms(t: Instant) -> f64 {
    t.elapsed().as_secs_f64() * 1000.0
}
fn median(mut v: Vec<f64>) -> f64 {
    v.sort_by(f64::total_cmp);
    v[v.len() / 2]
}

pub struct Engine {
    manifest: Value,
    gpu: Option<Gpu>,
    gpu_error: Option<String>,
    disabled: BTreeMap<u64, String>,
    profiles: BTreeMap<String, Profile>,
}
impl Engine {
    pub fn new() -> Self {
        Self {
            manifest: serde_json::from_str(assets::MANIFEST).expect("compiler-generated manifest"),
            gpu: None,
            gpu_error: None,
            disabled: BTreeMap::new(),
            profiles: BTreeMap::new(),
        }
    }
    pub fn manifest(&self) -> &Value {
        &self.manifest
    }
    fn prepare(&mut self, f: &Value, args: &[Arg]) -> Result<()> {
        if let Some(e) = &self.gpu_error {
            return Err(e.clone());
        }
        if let Some(e) = self.disabled.get(&f["index"].as_u64().unwrap()) {
            return Err(e.clone());
        }
        if self.gpu.is_none() {
            match Gpu::new() {
                Ok(gpu) => self.gpu = Some(gpu),
                Err(e) => {
                    self.gpu_error = Some(e.clone());
                    return Err(e);
                }
            }
        }
        self.gpu.as_mut().unwrap().prepare(f, args)
    }
    pub fn call(&mut self, name: &str, args: &Value, backend: Backend) -> Result<Value> {
        let f = self.manifest["functions"]
            .as_array()
            .unwrap()
            .iter()
            .find(|f| f["name"] == name)
            .ok_or_else(|| format!("unknown function {name}"))?
            .clone();
        let args = parse_args(&f, args)?;
        let output = |value: u64, backend: &str, reason: String, profile: Option<&Profile>| json!({"value":if f["result"]=="bool" {json!(value!=0)}else{json!(value)},"backend":backend,"reason":reason,"profile":profile.map(Profile::json)});
        if backend == Backend::Cpu || f["gpu"].is_null() {
            return Ok(output(
                cpu(&f, &args),
                "cpu",
                if backend == Backend::Cpu {
                    "explicit CPU selection".into()
                } else {
                    f["cpu_reason"]
                        .as_str()
                        .unwrap_or("CPU-only function")
                        .into()
                },
                None,
            ));
        }
        let key = key(&f, &args)?;
        let selected = (|| -> Result<(u64, bool, String, Option<Profile>)> {
            let setup_start = Instant::now();
            self.prepare(&f, &args)?;
            let setup_ms = ms(setup_start);
            if backend == Backend::Gpu {
                return Ok((
                    self.gpu.as_mut().unwrap().execute(&f, &args)?,
                    true,
                    "explicit GPU selection".into(),
                    None,
                ));
            }
            let stale = self.profiles.get(&key).is_none_or(|p| p.uses >= 32);
            if stale {
                let mut cpu_times = Vec::new();
                let mut gpu_times = Vec::new();
                for trial in 0..3 {
                    let (reference, result);
                    if trial % 2 == 0 {
                        let t = Instant::now();
                        reference = cpu(&f, &args);
                        cpu_times.push(ms(t));
                        let t = Instant::now();
                        result = self.gpu.as_mut().unwrap().execute(&f, &args)?;
                        gpu_times.push(ms(t));
                    } else {
                        let t = Instant::now();
                        result = self.gpu.as_mut().unwrap().execute(&f, &args)?;
                        gpu_times.push(ms(t));
                        let t = Instant::now();
                        reference = cpu(&f, &args);
                        cpu_times.push(ms(t));
                    }
                    if reference != result {
                        return Err("GPU/compiled CPU result mismatch".into());
                    }
                }
                let cpu_ms = median(cpu_times);
                let gpu_ms = median(gpu_times);
                if self.profiles.len() >= 32 && !self.profiles.contains_key(&key) {
                    let oldest = self.profiles.keys().next().cloned().unwrap();
                    self.profiles.remove(&oldest);
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
            let value = if profile.gpu {
                self.gpu.as_mut().unwrap().execute(&f, &args)?
            } else {
                cpu(&f, &args)
            };
            Ok((
                value,
                profile.gpu,
                "measured full execution cost with setup amortisation and 10% minimum saving"
                    .into(),
                Some(profile),
            ))
        })();
        match selected {
            Ok((value, gpu, reason, profile)) => Ok(output(
                value,
                if gpu { "gpu" } else { "cpu" },
                reason,
                profile.as_ref(),
            )),
            Err(e) => {
                self.profiles.remove(&key);
                // Cache failed shader/device decisions per function. A fresh Engine
                // can retry after a host/device change; no application state exists.
                if !e.contains("limits") && !e.contains("budget") {
                    self.disabled
                        .insert(f["index"].as_u64().unwrap(), e.clone());
                }
                Ok(output(
                    cpu(&f, &args),
                    "cpu",
                    format!("GPU fallback: {e}"),
                    None,
                ))
            }
        }
    }
}
impl Default for Engine {
    fn default() -> Self {
        Self::new()
    }
}
struct Gpu {
    _instance: wgpu::Instance,
    device: wgpu::Device,
    queue: wgpu::Queue,
    pipelines: BTreeMap<String, wgpu::ComputePipeline>,
    lost: Arc<AtomicBool>,
}
impl Gpu {
    fn new() -> Result<Self> {
        if std::env::var_os("INK_GPU_DISABLE").is_some() {
            return Err("GPU disabled by INK_GPU_DISABLE".into());
        }
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor::new_without_display_handle());
        let adapter = pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance,
            ..Default::default()
        }))
        .map_err(|e| e.to_string())?;
        let (device, queue) =
            pollster::block_on(adapter.request_device(&wgpu::DeviceDescriptor::default()))
                .map_err(|e| e.to_string())?;
        let lost = Arc::new(AtomicBool::new(false));
        let notify = lost.clone();
        device.set_device_lost_callback(move |_, _| {
            notify.store(true, Ordering::Relaxed);
        });
        Ok(Self {
            _instance: instance,
            device,
            queue,
            pipelines: BTreeMap::new(),
            lost,
        })
    }
    fn pipeline(&mut self, name: &str, access: &[bool]) -> Result<()> {
        if self.pipelines.contains_key(name) {
            return Ok(());
        }
        let code = assets::SHADERS
            .iter()
            .find(|(n, _)| *n == name)
            .ok_or("missing compiled shader")?
            .1;
        let oom = self.device.push_error_scope(wgpu::ErrorFilter::OutOfMemory);
        let scope = self.device.push_error_scope(wgpu::ErrorFilter::Validation);
        let entries: Vec<_> = access
            .iter()
            .enumerate()
            .map(|(i, write)| wgpu::BindGroupLayoutEntry {
                binding: i as u32,
                visibility: wgpu::ShaderStages::COMPUTE,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Storage { read_only: !*write },
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            })
            .collect();
        let bindings = self
            .device
            .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                label: Some(name),
                entries: &entries,
            });
        let layout = self
            .device
            .create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                label: Some(name),
                bind_group_layouts: &[Some(&bindings)],
                immediate_size: 0,
            });
        let module = self
            .device
            .create_shader_module(wgpu::ShaderModuleDescriptor {
                label: Some(name),
                source: wgpu::ShaderSource::Wgsl(code.into()),
            });
        let pipeline = self
            .device
            .create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
                label: Some(name),
                layout: Some(&layout),
                module: &module,
                entry_point: Some("main"),
                compilation_options: Default::default(),
                cache: None,
            });
        let validation = pollster::block_on(scope.pop());
        let allocation = pollster::block_on(oom.pop());
        if let Some(error) = validation.or(allocation) {
            return Err(error.to_string());
        }
        self.pipelines.insert(name.into(), pipeline);
        Ok(())
    }
    fn prepare(&mut self, f: &Value, args: &[Arg]) -> Result<()> {
        if self.lost.load(Ordering::Relaxed) {
            return Err("GPU device lost".into());
        }
        let cap = list(f, args)?.len().max(1);
        let groups = cap.div_ceil(256);
        let limits = self.device.limits();
        if cap as u64 * 4 > limits.max_storage_buffer_binding_size as u64
            || cap as u64 * 4 > limits.max_buffer_size
            || groups > limits.max_compute_workgroups_per_dimension as usize
        {
            return Err("input exceeds GPU buffer/dispatch limits".into());
        }
        let stages = f["gpu"]["stages"].as_array().unwrap();
        let filter = stages.iter().any(|s| s["kind"] == "filter");
        let filters = stages.iter().filter(|s| s["kind"] == "filter").count();
        if cap as u64 * 4 * (1 + stages.len() + filters) as u64 + groups as u64 * 8 * filters as u64
            > 268435456
        {
            return Err("GPU working buffers exceed runtime allocation budget".into());
        }
        if filter && cap > 1048576 {
            return Err("input exceeds this backend's stable-filter prefix budget".into());
        }
        for stage in stages {
            self.pipeline(
                stage["shader"].as_str().unwrap(),
                if stage["kind"] == "filter" {
                    &[false, true, false, true, false, true, true]
                } else {
                    &[false, true, false, true, false]
                },
            )?;
        }
        if filter {
            self.pipeline("filter-offsets.wgsl", &[false, true, true])?;
            self.pipeline("filter-scatter.wgsl", &[false, true, false, false, false])?;
        }
        self.pipeline(
            if f["gpu"]["aggregate"] == "sum" {
                "sum.wgsl"
            } else {
                "count.wgsl"
            },
            if f["gpu"]["aggregate"] == "sum" {
                &[false, true, false, true]
            } else {
                &[false, true]
            },
        )?;
        Ok(())
    }
    fn buffer(&self, size: usize) -> wgpu::Buffer {
        self.device.create_buffer(&wgpu::BufferDescriptor {
            label: None,
            size: size.max(4) as u64,
            usage: wgpu::BufferUsages::STORAGE
                | wgpu::BufferUsages::COPY_DST
                | wgpu::BufferUsages::COPY_SRC,
            mapped_at_creation: false,
        })
    }
    fn upload(&self, words: &[u32]) -> wgpu::Buffer {
        let b = self.buffer(words.len() * 4);
        let bytes: Vec<_> = words.iter().flat_map(|x| x.to_le_bytes()).collect();
        if !bytes.is_empty() {
            self.queue.write_buffer(&b, 0, &bytes);
        }
        b
    }
    fn dispatch(
        &self,
        encoder: &mut wgpu::CommandEncoder,
        name: &str,
        buffers: &[&wgpu::Buffer],
        groups: usize,
    ) {
        let pipeline = &self.pipelines[name];
        let entries: Vec<_> = buffers
            .iter()
            .enumerate()
            .map(|(i, b)| wgpu::BindGroupEntry {
                binding: i as u32,
                resource: b.as_entire_binding(),
            })
            .collect();
        let group = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: None,
            layout: &pipeline.get_bind_group_layout(0),
            entries: &entries,
        });
        let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor::default());
        pass.set_pipeline(pipeline);
        pass.set_bind_group(0, &group, &[]);
        pass.dispatch_workgroups(groups.max(1) as u32, 1, 1);
    }
    fn execute(&mut self, f: &Value, args: &[Arg]) -> Result<u64> {
        self.prepare(f, args)?;
        let oom = self.device.push_error_scope(wgpu::ErrorFilter::OutOfMemory);
        let scope = self.device.push_error_scope(wgpu::ErrorFilter::Validation);
        let result = (|| -> Result<u64> {
            let xs = list(f, args)?;
            let mut cap = xs.len().max(1);
            let mut data = self.upload(xs);
            let mut length = self.upload(&[xs.len() as u32]);
            let parameters = self.upload(
                &args
                    .iter()
                    .map(|v| if let Arg::Scalar(n) = v { *n as u32 } else { 0 })
                    .collect::<Vec<_>>(),
            );
            let mut encoder = self
                .device
                .create_command_encoder(&wgpu::CommandEncoderDescriptor::default());
            let mut resources = vec![data.clone(), length.clone(), parameters.clone()];
            for stage in f["gpu"]["stages"].as_array().unwrap() {
                let output = self.buffer(cap * 4);
                let outlen = self.buffer(4);
                let groups = cap.div_ceil(256);
                if stage["kind"] == "map" {
                    self.dispatch(
                        &mut encoder,
                        stage["shader"].as_str().unwrap(),
                        &[&data, &output, &length, &outlen, &parameters],
                        groups,
                    );
                } else {
                    let prefixes = self.buffer(cap * 4);
                    let counts = self.buffer(groups * 4);
                    let offsets = self.buffer(groups * 4);
                    self.dispatch(
                        &mut encoder,
                        stage["shader"].as_str().unwrap(),
                        &[
                            &data,
                            &output,
                            &length,
                            &outlen,
                            &parameters,
                            &prefixes,
                            &counts,
                        ],
                        groups,
                    );
                    self.dispatch(
                        &mut encoder,
                        "filter-offsets.wgsl",
                        &[&counts, &offsets, &outlen],
                        groups.div_ceil(64),
                    );
                    self.dispatch(
                        &mut encoder,
                        "filter-scatter.wgsl",
                        &[&data, &output, &length, &prefixes, &offsets],
                        groups,
                    );
                    resources.extend([prefixes, counts, offsets]);
                }
                resources.extend([output.clone(), outlen.clone()]);
                data = output;
                length = outlen;
            }
            if f["gpu"]["aggregate"] == "count" {
                let output = self.buffer(4);
                self.dispatch(&mut encoder, "count.wgsl", &[&length, &output], 1);
                data = output;
            } else {
                loop {
                    let groups = cap.div_ceil(256);
                    let output = self.buffer(groups * 4);
                    let outlen = self.buffer(4);
                    self.dispatch(
                        &mut encoder,
                        "sum.wgsl",
                        &[&data, &output, &length, &outlen],
                        groups,
                    );
                    resources.extend([output.clone(), outlen.clone()]);
                    data = output;
                    length = outlen;
                    cap = groups;
                    if cap == 1 {
                        break;
                    }
                }
            }
            let readback = self.device.create_buffer(&wgpu::BufferDescriptor {
                label: None,
                size: 4,
                usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
                mapped_at_creation: false,
            });
            encoder.copy_buffer_to_buffer(&data, 0, &readback, 0, 4);
            let submission = self.queue.submit([encoder.finish()]);
            let (sender, receiver) = std::sync::mpsc::channel();
            readback.map_async(wgpu::MapMode::Read, .., move |r| {
                let _ = sender.send(r);
            });
            self.device
                .poll(wgpu::PollType::Wait {
                    submission_index: Some(submission),
                    timeout: Some(Duration::from_secs(10)),
                })
                .map_err(|e| e.to_string())?;
            receiver
                .recv_timeout(Duration::from_secs(1))
                .map_err(|e| e.to_string())?
                .map_err(|e| e.to_string())?;
            let bytes = readback.get_mapped_range(..).map_err(|e| e.to_string())?;
            let value = u32::from_le_bytes(bytes[..4].try_into().unwrap());
            drop(bytes);
            readback.unmap();
            Ok(value as u64)
        })();
        let validation = pollster::block_on(scope.pop());
        let allocation = pollster::block_on(oom.pop());
        if let Some(error) = validation.or(allocation) {
            return Err(error.to_string());
        }
        result
    }
}
