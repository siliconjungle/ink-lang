//! wgpu device adapter for the versioned runtime ABI.
use super::*;
pub(super) struct Gpu {
    _instance: Option<wgpu::Instance>,
    device: wgpu::Device,
    queue: wgpu::Queue,
    pipelines: BTreeMap<String, wgpu::ComputePipeline>,
    /// Runtime-generated kernels (reductions), keyed by shader name.
    extra: std::sync::Mutex<BTreeMap<String, wgpu::ComputePipeline>>,
    lost: Arc<AtomicBool>,
}
impl Gpu {
    pub(super) fn new() -> Result<Self> {
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
        Ok(Self::with_device(Some(instance), device, queue))
    }
    /// Share an application's device, so a renderer can consume session
    /// buffers directly with no readback.
    pub(super) fn with_device(
        instance: Option<wgpu::Instance>,
        device: wgpu::Device,
        queue: wgpu::Queue,
    ) -> Self {
        let lost = Arc::new(AtomicBool::new(false));
        let flag = lost.clone();
        device.set_device_lost_callback(move |_, _| {
            flag.store(true, Ordering::Relaxed);
        });
        Self {
            _instance: instance,
            device,
            queue,
            pipelines: BTreeMap::new(),
            extra: std::sync::Mutex::new(BTreeMap::new()),
            lost,
        }
    }
    pub(super) fn prepare(&mut self, p: &Plan) -> Result<()> {
        if self.lost.load(Ordering::Relaxed) {
            return Err("GPU device lost".into());
        }
        let limits = self.device.limits();
        if p.steps
            .iter()
            .any(|s| s.f["graph_required"].as_bool() == Some(true))
        {
            return self.prepare_graph(p);
        }
        for s in &p.steps {
            if s.args.len() + 2 > limits.max_storage_buffers_per_shader_stage as usize
                || s.count.unwrap().div_ceil(64)
                    > limits.max_compute_workgroups_per_dimension as usize
            {
                return Err("GPU binding/workgroup limits".into());
            }
            let name = s.f["shader"].as_str().unwrap();
            if !self.pipelines.contains_key(name) {
                let scope = self.device.push_error_scope(wgpu::ErrorFilter::Validation);
                let oom = self.device.push_error_scope(wgpu::ErrorFilter::OutOfMemory);
                let code = assets::SHADERS
                    .iter()
                    .find(|(n, _)| *n == name)
                    .ok_or("missing compiled shader")?
                    .1;
                let module = self
                    .device
                    .create_shader_module(wgpu::ShaderModuleDescriptor {
                        label: Some(name),
                        source: wgpu::ShaderSource::Wgsl(code.into()),
                    });
                let entries: Vec<_> = (0..s.args.len() + 2)
                    .map(|i| wgpu::BindGroupLayoutEntry {
                        binding: i as u32,
                        visibility: wgpu::ShaderStages::COMPUTE,
                        ty: wgpu::BindingType::Buffer {
                            ty: wgpu::BufferBindingType::Storage {
                                read_only: i != s.args.len(),
                            },
                            has_dynamic_offset: false,
                            min_binding_size: None,
                        },
                        count: None,
                    })
                    .collect();
                let bindings =
                    self.device
                        .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                            label: None,
                            entries: &entries,
                        });
                let layout = self
                    .device
                    .create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                        label: None,
                        bind_group_layouts: &[Some(&bindings)],
                        immediate_size: 0,
                    });
                let pipe = self
                    .device
                    .create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
                        label: Some(name),
                        layout: Some(&layout),
                        module: &module,
                        entry_point: Some("main"),
                        compilation_options: Default::default(),
                        cache: None,
                    });
                let allocation = pollster::block_on(oom.pop());
                let validation = pollster::block_on(scope.pop());
                if let Some(e) = allocation.or(validation) {
                    return Err(e.to_string());
                }
                self.pipelines.insert(name.into(), pipe);
            }
        }
        Ok(())
    }
    fn buffer(
        &self,
        bytes: usize,
        usage: wgpu::BufferUsages,
        words: Option<&[u32]>,
    ) -> Result<wgpu::Buffer> {
        let bytes = bytes.max(4);
        let l = self.device.limits();
        if bytes > l.max_buffer_size as usize
            || usage.contains(wgpu::BufferUsages::STORAGE)
                && bytes > l.max_storage_buffer_binding_size as usize
        {
            return Err("GPU buffer limits".into());
        }
        let b = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: None,
            size: bytes as u64,
            usage,
            mapped_at_creation: words.is_some(),
        });
        if let Some(w) = words {
            let mut mapped = b
                .slice(..)
                .get_mapped_range_mut()
                .map_err(|e| e.to_string())?;
            for (i, n) in w.iter().enumerate() {
                mapped
                    .slice(i * 4..i * 4 + 4)
                    .copy_from_slice(&n.to_le_bytes());
            }
            drop(mapped);
            b.unmap();
        }
        Ok(b)
    }
    fn scoped<T>(&self, f: impl FnOnce() -> Result<T>) -> Result<T> {
        if self.lost.load(Ordering::Relaxed) {
            return Err("GPU device lost".into());
        }
        let scope = self.device.push_error_scope(wgpu::ErrorFilter::Validation);
        let oom = self.device.push_error_scope(wgpu::ErrorFilter::OutOfMemory);
        let result = f();
        let allocation = pollster::block_on(oom.pop());
        let validation = pollster::block_on(scope.pop());
        if let Some(e) = allocation.or(validation) {
            return Err(e.to_string());
        }
        if self.lost.load(Ordering::Relaxed) {
            return Err("GPU device lost".into());
        }
        result
    }
    /// One complete pipeline call: upload, run every iteration resident on
    /// the device, then read back only the named outputs.
    pub(super) fn execute(&self, p: &Plan) -> Result<Value> {
        self.scoped(|| {
            let mut r = self.open_inner(p)?;
            let advanced = self.advance_inner(&mut r, p, p.iterations as u64)?;
            let (values, readback, peak) = self.read_outputs_inner(&r, p, &p.outputs)?;
            let mut counters = json!({
                "upload_bytes": r.upload(),
                "readback_bytes": readback,
                "dispatches": advanced["dispatches"],
            });
            match &r {
                Resident::Steps(_) => counters["live_buffer_bytes"] = json!(p.bytes),
                Resident::Graph(_) => {
                    counters["live_buffer_bytes"] = json!(peak);
                    counters["resident_copy_bytes"] = advanced["resident_copy_bytes"].clone();
                }
            }
            Ok(json!({"values": values, "counters": counters}))
        })
    }
    /// Allocate and upload once; no iteration runs yet.
    pub(super) fn open(&self, p: &Plan) -> Result<Resident> {
        self.scoped(|| self.open_inner(p))
    }
    /// Run more iterations on resident buffers. Nothing is read back.
    pub(super) fn advance(&self, r: &mut Resident, p: &Plan, iterations: u64) -> Result<Value> {
        self.scoped(|| self.advance_inner(r, p, iterations))
    }
    /// Block until all submitted work has finished (for measurement).
    pub(super) fn finish(&self) -> Result<()> {
        self.device
            .poll(wgpu::PollType::Wait {
                submission_index: None,
                timeout: Some(std::time::Duration::from_secs(600)),
            })
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    pub(super) fn read(&self, r: &Resident, p: &Plan, request: &Value) -> Result<Value> {
        self.scoped(|| self.read_inner(r, p, request))
    }
    pub(super) fn write(&self, r: &mut Resident, p: &Plan, input: &str, d: &Data) -> Result<Value> {
        self.scoped(|| self.write_inner(r, p, input, d))
    }
    /// The device buffer currently holding a step's value, for a renderer or
    /// another pipeline on the same device. Valid until the next advance,
    /// write or close of this session.
    pub(super) fn view(&self, r: &Resident, p: &Plan, step: usize) -> Result<View> {
        let l = r.location(p, step)?;
        Ok(View {
            buffer: l.buffer,
            offset: if l.header { 4 } else { 0 },
            header: l.header,
            ty: l.ty,
            capacity: l.capacity,
        })
    }
    pub(super) fn handles(&self) -> (&wgpu::Device, &wgpu::Queue) {
        (&self.device, &self.queue)
    }
    fn open_inner(&self, p: &Plan) -> Result<Resident> {
        if p.steps
            .iter()
            .any(|s| s.f["graph_required"].as_bool() == Some(true))
        {
            return self.open_graph(p).map(Resident::Graph);
        }
        use wgpu::BufferUsages as U;
        let mut upload = 0usize;
        let input = p
            .constants
            .iter()
            .enumerate()
            .map(|(i, c)| {
                let list = p
                    .steps
                    .iter()
                    .flat_map(|s| &s.args)
                    .any(|a| !a.step && a.index == i && a.ty["kind"] == "list");
                let words = if list {
                    std::iter::once(c.count as u32)
                        .chain(c.words.iter().copied())
                        .collect::<Vec<_>>()
                } else {
                    c.words.as_ref().clone()
                };
                let b = self.buffer(words.len() * 4, U::STORAGE | U::COPY_DST, Some(&words))?;
                upload += b.size() as usize;
                Ok(b)
            })
            .collect::<Result<Vec<_>>>()?;
        let banks = (0..2)
            .map(|_| {
                p.steps
                    .iter()
                    .map(|s| {
                        self.buffer(
                            (1 + s.count.unwrap() * width(&s.f["result"])) * 4,
                            U::STORAGE | U::COPY_SRC | U::COPY_DST | U::VERTEX,
                            None,
                        )
                    })
                    .collect::<Result<Vec<_>>>()
            })
            .collect::<Result<Vec<_>>>()?;
        let metadata = p
            .steps
            .iter()
            .map(|s| {
                let mut w: Vec<u32> = s.args.iter().map(|a| a.count.unwrap() as u32).collect();
                w.push(s.count.unwrap() as u32);
                upload += 4 * w.len();
                self.buffer(w.len() * 4, U::STORAGE, Some(&w))
            })
            .collect::<Result<Vec<_>>>()?;
        let groups = p
            .steps
            .iter()
            .enumerate()
            .map(|(i, s)| {
                (0..3)
                    .map(|phase| {
                        let bank = if phase == 2 { 1 } else { 0 };
                        let mut entries = s
                            .args
                            .iter()
                            .enumerate()
                            .map(|(binding, a)| {
                                let buffer = if let Some(step) = a
                                    .input
                                    .as_ref()
                                    .filter(|_| phase != 0)
                                    .and_then(|n| p.feedback.get(n))
                                {
                                    &banks[1 - bank][*step]
                                } else if a.step {
                                    &banks[bank][a.index]
                                } else {
                                    &input[a.index]
                                };
                                wgpu::BindGroupEntry {
                                    binding: binding as u32,
                                    resource: buffer.as_entire_binding(),
                                }
                            })
                            .collect::<Vec<_>>();
                        entries.push(wgpu::BindGroupEntry {
                            binding: s.args.len() as u32,
                            resource: banks[bank][i].as_entire_binding(),
                        });
                        entries.push(wgpu::BindGroupEntry {
                            binding: s.args.len() as u32 + 1,
                            resource: metadata[i].as_entire_binding(),
                        });
                        let pipe = &self.pipelines[s.f["shader"].as_str().unwrap()];
                        self.device.create_bind_group(&wgpu::BindGroupDescriptor {
                            label: None,
                            layout: &pipe.get_bind_group_layout(0),
                            entries: &entries,
                        })
                    })
                    .collect::<Vec<_>>()
            })
            .collect::<Vec<_>>();
        let [bank0, bank1]: [Vec<wgpu::Buffer>; 2] = banks.try_into().unwrap();
        Ok(Resident::Steps(StepsResident {
            input,
            banks: [bank0, bank1],
            _metadata: metadata,
            groups,
            iteration: 0,
            upload,
        }))
    }
    fn advance_inner(&self, r: &mut Resident, p: &Plan, iterations: u64) -> Result<Value> {
        if iterations.saturating_mul(dispatch_count(p) as u64) > 64 * 1024 * 1024 {
            return Err("GPU dispatch budget exceeded".into());
        }
        let mut chunk = Chunk::new(self);
        let mut copies = 0usize;
        match r {
            Resident::Steps(r) => {
                for _ in 0..iterations {
                    let t = r.iteration;
                    let phase = if t == 0 {
                        0
                    } else if t % 2 == 1 {
                        2
                    } else {
                        1
                    };
                    for (i, s) in p.steps.iter().enumerate() {
                        if s.count == Some(0) {
                            continue;
                        }
                        chunk.dispatch(
                            &self.pipelines[s.f["shader"].as_str().unwrap()],
                            &r.groups[i][phase],
                            s.count.unwrap().div_ceil(64) as u32,
                        );
                    }
                    r.iteration += 1;
                }
            }
            Resident::Graph(r) => {
                for _ in 0..iterations {
                    // Feedback owed by the previous iteration is published
                    // before this one reads its inputs. Every source is
                    // snapshotted first: outputs may alias inputs.
                    if r.owed {
                        let e = chunk.encoder();
                        for f in r.pending.iter().filter(|f| !f.skip && f.bytes > 0) {
                            e.copy_buffer_to_buffer(&f.source, 0, &f.temporary, 0, f.bytes as u64);
                            copies += f.bytes;
                        }
                        for f in r.pending.iter().filter(|f| !f.skip && f.bytes > 0) {
                            e.copy_buffer_to_buffer(&f.temporary, 0, &f.target, 0, f.bytes as u64);
                            copies += f.bytes;
                        }
                        for f in &mut r.pending {
                            f.skip = false;
                        }
                    }
                    for (name, group, groups) in &r.dispatches {
                        chunk.dispatch(&self.pipelines[name], group, *groups as u32);
                    }
                    r.iteration += 1;
                    r.owed = !r.pending.is_empty();
                }
            }
        }
        let dispatches = chunk.finish();
        Ok(json!({"iteration": r.iteration(), "dispatches": dispatches, "resident_copy_bytes": copies}))
    }
    fn staging(&self, ranges: &[(&wgpu::Buffer, usize, usize)]) -> Result<Vec<Vec<u32>>> {
        use wgpu::BufferUsages as U;
        let total: usize = ranges.iter().map(|r| r.2).sum();
        if total == 0 {
            return Ok(ranges.iter().map(|_| Vec::new()).collect());
        }
        let b = self.buffer(total, U::MAP_READ | U::COPY_DST, None)?;
        let mut encoder = self.device.create_command_encoder(&Default::default());
        let mut at = 0u64;
        for (source, offset, bytes) in ranges {
            if *bytes > 0 {
                encoder.copy_buffer_to_buffer(source, *offset as u64, &b, at, *bytes as u64);
            }
            at += *bytes as u64;
        }
        let submitted = self.queue.submit([encoder.finish()]);
        let (tx, rx) = std::sync::mpsc::channel();
        b.map_async(wgpu::MapMode::Read, .., move |r| {
            let _ = tx.send(r);
        });
        self.device
            .poll(wgpu::PollType::Wait {
                submission_index: Some(submitted),
                timeout: Some(std::time::Duration::from_secs(600)),
            })
            .map_err(|e| e.to_string())?;
        rx.recv_timeout(std::time::Duration::from_secs(600))
            .map_err(|e| e.to_string())?
            .map_err(|e| e.to_string())?;
        let mapped = b.slice(..).get_mapped_range().map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        let mut at = 0usize;
        for (_, _, bytes) in ranges {
            out.push(
                mapped[at..at + bytes]
                    .chunks_exact(4)
                    .map(|b| u32::from_le_bytes(b.try_into().unwrap()))
                    .collect(),
            );
            at += bytes;
        }
        drop(mapped);
        b.unmap();
        Ok(out)
    }
    /// Read whole step values. Element-wise steps copy their bounded result
    /// in one transfer; graph lists read the header, then the populated lanes.
    fn read_outputs_inner(
        &self,
        r: &Resident,
        p: &Plan,
        outputs: &[usize],
    ) -> Result<(serde_json::Map<String, Value>, usize, usize)> {
        let mut values = serde_json::Map::new();
        let mut readback = 0usize;
        let resident_live = r.live();
        let mut peak = resident_live;
        for i in outputs {
            let l = r.location(p, *i)?;
            let w = width(&l.ty);
            let words = if let Resident::Steps(_) = r {
                let bytes = (1 + l.capacity * w) * 4;
                let words = self.staging(&[(&l.buffer, 0, bytes)])?.remove(0);
                readback += bytes;
                let count = words[0] as usize;
                let n = count.checked_mul(w).ok_or("GPU result length")?;
                if n > words.len() - 1 {
                    return Err("invalid GPU result length".into());
                }
                (words[1..1 + n].to_vec(), count)
            } else {
                let count = if l.header {
                    if resident_live.checked_add(4).ok_or("readback size overflow")? > MAX_BYTES {
                        return Err("GPU graph readback budget exceeded".into());
                    }
                    peak = peak.max(resident_live + 4);
                    readback += 4;
                    self.staging(&[(&l.buffer, 0, 4)])?.remove(0)[0] as usize
                } else {
                    1
                };
                if count > l.capacity {
                    return Err("GPU graph output length exceeds capacity".into());
                }
                let bytes = count * w * 4;
                readback += bytes;
                let top = resident_live
                    .checked_add(bytes.max(4))
                    .ok_or("readback size overflow")?;
                if top > MAX_BYTES {
                    return Err("GPU graph readback budget exceeded".into());
                }
                peak = peak.max(top);
                (
                    self.staging(&[(&l.buffer, if l.header { 4 } else { 0 }, bytes)])?
                        .remove(0),
                    count,
                )
            };
            let d = Data {
                words: Arc::new(words.0),
                count: words.1,
                finite: true,
            };
            values.insert(p.steps[*i].id.clone(), unpack(&d, &l.ty));
        }
        Ok((values, readback, peak))
    }
    fn read_inner(&self, r: &Resident, p: &Plan, q: &Value) -> Result<Value> {
        if r.iteration() == 0 {
            return Err("session has not run an iteration".into());
        }
        if let Some(ids) = q.get("outputs") {
            let outputs = step_indices(p, ids)?;
            let (values, readback, _) = self.read_outputs_inner(r, p, &outputs)?;
            return Ok(json!({"values": values, "counters": {"readback_bytes": readback}}));
        }
        let i = step_index(p, q)?;
        let l = r.location(p, i)?;
        let list = l.ty["kind"] == "list";
        let element = if list { l.ty["element"].clone() } else { l.ty.clone() };
        let w = width(&element);
        let header = |words: &[u32]| -> Result<usize> {
            let n = words[0] as usize;
            if n > l.capacity {
                return Err("GPU length exceeds capacity".into());
            }
            Ok(n)
        };
        if q.get("length").and_then(Value::as_bool) == Some(true) {
            let n = if l.header {
                header(&self.staging(&[(&l.buffer, 0, 4)])?[0])?
            } else {
                1
            };
            return Ok(json!({"length": n, "counters": {"readback_bytes": if l.header {4} else {0}}}));
        }
        if let Some(slice) = q.get("slice") {
            let (start, want) = slice_bounds(slice)?;
            if !list {
                return Err("slice requires a list value".into());
            }
            let start = start.min(l.capacity);
            let take = want.min(l.capacity - start);
            let mut parts = self.staging(&[
                (&l.buffer, 0, 4),
                (&l.buffer, 4 + start * w * 4, take * w * 4),
            ])?;
            let n = header(&parts[0])?;
            let available = n.saturating_sub(start).min(take);
            let words = parts.remove(1)[..available * w].to_vec();
            let d = Data {
                words: Arc::new(words),
                count: available,
                finite: true,
            };
            return Ok(json!({
                "value": unpack(&d, &l.ty),
                "length": n,
                "start": start.min(n),
                "counters": {"readback_bytes": 4 + take * w * 4}
            }));
        }
        if let Some(op) = q.get("reduce").and_then(Value::as_str) {
            let (offset, field) = field_path(&element, q.get("field"))?;
            let (kind, components) = reducible(&field)?;
            let ops: &[&str] = match op {
                "sum" | "min" | "max" => &[op][..],
                "bounds" => &["min", "max"],
                _ => return Err("reduce must be sum, min, max or bounds".into()),
            };
            let mut results = Vec::new();
            let mut length = 0;
            for o in ops {
                let (n, value) = self.reduce(&l, w, offset, &kind, components, o)?;
                length = n;
                results.push(value);
            }
            let value = if op == "bounds" {
                json!({"min": results[0], "max": results[1]})
            } else {
                results.remove(0)
            };
            return Ok(json!({
                "value": value,
                "length": length,
                "counters": {"readback_bytes": ops.len() * 4 * (2 + components * lanes(&kind)), "dispatches": ops.len() * 2}
            }));
        }
        Err("read requires outputs, length, slice or reduce".into())
    }
    /// Two-pass workgroup tree reduction; returns the logical length and the
    /// decoded result. Integer sums wrap exactly; f32 sums use tree order.
    fn reduce(
        &self,
        l: &Location,
        stride: usize,
        offset: usize,
        kind: &str,
        components: usize,
        op: &str,
    ) -> Result<(usize, Value)> {
        use wgpu::BufferUsages as U;
        let name = format!("ink-reduce-{kind}-{components}-{op}");
        let pipe = self.reduction_pipeline(&name, &reduce_shader(kind, components, op))?;
        let ln = lanes(kind);
        let record = 1 + components * ln;
        let groups = l.capacity.div_ceil(256).clamp(1, 256);
        let partial = self.buffer((1 + groups * record) * 4, U::STORAGE, None)?;
        let result = self.buffer((1 + record) * 4, U::STORAGE | U::COPY_SRC, None)?;
        let base = if l.header { 1 } else { 0 };
        let first = [1u32, l.header as u32, if l.header { 0 } else { 1 }, base, stride as u32, offset as u32];
        let second = [2u32, 0, groups as u32, 1, record as u32, 1];
        let p1 = self.buffer(24, U::STORAGE, Some(&first))?;
        let p2 = self.buffer(24, U::STORAGE, Some(&second))?;
        let group = |data: &wgpu::Buffer, out: &wgpu::Buffer, params: &wgpu::Buffer| {
            self.device.create_bind_group(&wgpu::BindGroupDescriptor {
                label: None,
                layout: &pipe.get_bind_group_layout(0),
                entries: &[
                    wgpu::BindGroupEntry { binding: 0, resource: data.as_entire_binding() },
                    wgpu::BindGroupEntry { binding: 1, resource: out.as_entire_binding() },
                    wgpu::BindGroupEntry { binding: 2, resource: params.as_entire_binding() },
                ],
            })
        };
        let g1 = group(&l.buffer, &partial, &p1);
        let g2 = group(&partial, &result, &p2);
        let mut chunk = Chunk::new(self);
        chunk.dispatch(&pipe, &g1, groups as u32);
        chunk.dispatch(&pipe, &g2, 1);
        chunk.finish();
        let words = self.staging(&[(&result, 0, (1 + record) * 4)])?.remove(0);
        let n = words[0] as usize;
        if n > l.capacity {
            return Err("GPU length exceeds capacity".into());
        }
        let value = if words[1] == 0 {
            if op == "sum" { decode_components(kind, components, &vec![0; components * ln]) } else { Value::Null }
        } else {
            decode_components(kind, components, &words[2..2 + components * ln])
        };
        Ok((n, value))
    }
    fn reduction_pipeline(&self, name: &str, code: &str) -> Result<wgpu::ComputePipeline> {
        if let Some(p) = self.extra.lock().unwrap().get(name) {
            return Ok(p.clone());
        }
        let module = self.device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some(name),
            source: wgpu::ShaderSource::Wgsl(code.into()),
        });
        let entries = (0..3)
            .map(|i| wgpu::BindGroupLayoutEntry {
                binding: i,
                visibility: wgpu::ShaderStages::COMPUTE,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Storage { read_only: i != 1 },
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            })
            .collect::<Vec<_>>();
        let bindings = self.device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: None,
            entries: &entries,
        });
        let layout = self.device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: None,
            bind_group_layouts: &[Some(&bindings)],
            immediate_size: 0,
        });
        let pipe = self.device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some(name),
            layout: Some(&layout),
            module: &module,
            entry_point: Some("main"),
            compilation_options: Default::default(),
            cache: None,
        });
        self.extra.lock().unwrap().insert(name.into(), pipe.clone());
        Ok(pipe)
    }
    fn write_inner(&self, r: &mut Resident, p: &Plan, input: &str, d: &Data) -> Result<Value> {
        let reference = p.inputs.get(input).ok_or("unknown pipeline input")?;
        let list = reference.ty["kind"] == "list";
        let mut words = Vec::with_capacity(d.words.len() + 1);
        match r {
            Resident::Steps(r) => {
                if Some(d.count) != reference.count {
                    return Err("steps sessions keep input shapes; reopen to change a length".into());
                }
                // A fed-back input's carried value is its step's last output,
                // which the next iteration reads; replace it there.
                let target = match p.feedback.get(input) {
                    Some(step) if r.iteration > 0 => {
                        words.push(d.count as u32);
                        &r.banks[((r.iteration - 1) % 2) as usize][*step]
                    }
                    _ => {
                        if list {
                            words.push(d.count as u32);
                        }
                        &r.input[reference.index]
                    }
                };
                words.extend(d.words.iter().copied());
                self.queue.write_buffer(target, 0, bytes_of(&words));
            }
            Resident::Graph(r) => {
                let target = &r.constants[reference.index];
                if d.count > target.capacity || (!list && d.count != 1) {
                    return Err("written input exceeds the session capacity".into());
                }
                if list {
                    words.push(d.count as u32);
                }
                words.extend(d.words.iter().copied());
                // A fed-back input's carried value is its step's last output.
                // Replace that output when it has its own buffer; the owed
                // copy then publishes it. An output aliasing an input buffer
                // is replaced at the input, and its owed copy is skipped.
                let carried = p.feedback.get(input).filter(|_| r.iteration > 0).map(|step| {
                    &r.values[*step]
                });
                let aliased = |b: &wgpu::Buffer| r.constants.iter().any(|c| c.buffer == *b);
                match carried {
                    Some(v) if !aliased(&v.buffer) => {
                        self.queue.write_buffer(&v.buffer, 0, bytes_of(&words));
                    }
                    _ => {
                        self.queue.write_buffer(&target.buffer, 0, bytes_of(&words));
                        for f in &mut r.pending {
                            if f.input == input {
                                f.skip = true;
                            }
                        }
                    }
                }
            }
        }
        Ok(json!({"counters": {"upload_bytes": words.len() * 4}}))
    }
    fn open_graph(&self, p: &Plan) -> Result<GraphResident> {
        use wgpu::BufferUsages as U;
        let mut live = 0usize;
        let mut upload = 0usize;
        let mut make = |bytes: usize, usage: U, words: Option<&[u32]>| -> Result<wgpu::Buffer> {
            let bytes = bytes.max(4);
            live = live
                .checked_add(bytes)
                .ok_or("GPU graph allocation overflow")?;
            if live > MAX_BYTES {
                return Err("GPU graph live-buffer budget exceeded".into());
            }
            self.buffer(bytes, usage, words)
        };
        let mut input_types = vec![Value::Null; p.constants.len()];
        for s in &p.steps {
            for a in &s.args {
                if !a.step {
                    input_types[a.index] = a.ty.clone();
                }
            }
        }
        let constants = p
            .constants
            .iter()
            .zip(input_types)
            .map(|(c, t)| {
                let mut words = Vec::new();
                if t["kind"] == "list" {
                    words.push(c.count as u32);
                }
                words.extend(c.words.iter().copied());
                upload += words.len() * 4;
                Ok(GraphData {
                    buffer: make(
                        words.len() * 4,
                        U::STORAGE | U::COPY_SRC | U::COPY_DST,
                        Some(&words),
                    )?,
                    ty: t,
                    capacity: c.count,
                })
            })
            .collect::<Result<Vec<_>>>()?;
        let mut values: Vec<GraphData> = Vec::new();
        let mut dispatches = Vec::new();
        for s in &p.steps {
            let args = s
                .args
                .iter()
                .map(|a| {
                    if a.step {
                        values.get(a.index)
                    } else {
                        constants.get(a.index)
                    }
                    .cloned()
                    .ok_or("invalid graph pipeline reference".into())
                })
                .collect::<Result<Vec<_>>>()?;
            let g = &s.f["graph"];
            let (caps, _) =
                graph_capacity(g, &args.iter().map(|a| a.capacity).collect::<Vec<_>>())?;
            let mut nodes = Vec::new();
            for (i, n) in g["nodes"]
                .as_array()
                .ok_or("missing mixed graph descriptor")?
                .iter()
                .enumerate()
            {
                let count = caps[i];
                let list = n["result"]["kind"] == "list";
                let bytes = (count * width(&n["result"]) + usize::from(list)) * 4;
                let buffer = make(bytes, U::STORAGE | U::COPY_SRC | U::COPY_DST | U::VERTEX, None)?;
                let inputs = n["args"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|r| graph_ref(r, &args, &nodes))
                    .collect::<Result<Vec<_>>>()?;
                if n["schedule"].is_object() {
                    let extent = inputs.iter().map(|a| a.capacity).fold(count, usize::max);
                    let scratch = n["schedule"]["scratch"]
                        .as_array()
                        .ok_or("invalid schedule scratch")?
                        .iter()
                        .map(|w| make(scratch_words(w, extent)? * 4, U::STORAGE, None))
                        .collect::<Result<Vec<_>>>()?;
                    for pass in n["schedule"]["passes"].as_array().ok_or("invalid schedule")? {
                        let name = pass["shader"].as_str().ok_or("missing pass shader")?;
                        let pipe = self.pipelines.get(name).ok_or("unprepared pass shader")?;
                        let entries = pass["bind"]
                            .as_array()
                            .ok_or("invalid schedule bindings")?
                            .iter()
                            .enumerate()
                            .map(|(k, r)| {
                                let b = if let Some(a) = r["arg"].as_u64() {
                                    &inputs.get(a as usize).ok_or("invalid pass argument")?.buffer
                                } else if let Some(j) = r["scratch"].as_u64() {
                                    scratch.get(j as usize).ok_or("invalid pass scratch")?
                                } else {
                                    &buffer
                                };
                                Ok(wgpu::BindGroupEntry {
                                    binding: k as u32,
                                    resource: b.as_entire_binding(),
                                })
                            })
                            .collect::<Result<Vec<_>>>()?;
                        let group = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
                            label: None,
                            layout: &pipe.get_bind_group_layout(0),
                            entries: &entries,
                        });
                        let groups = quantity(pass["groups"].as_str().unwrap_or(""), extent)?;
                        dispatches.push((name.to_string(), group, groups));
                    }
                    nodes.push(GraphData {
                        buffer,
                        ty: n["result"].clone(),
                        capacity: count,
                    });
                    continue;
                }
                let name = n["shader"].as_str().ok_or("missing graph shader")?;
                let pipe = self.pipelines.get(name).ok_or("unprepared graph shader")?;
                let mut entries = inputs
                    .iter()
                    .enumerate()
                    .map(|(i, a)| wgpu::BindGroupEntry {
                        binding: i as u32,
                        resource: a.buffer.as_entire_binding(),
                    })
                    .collect::<Vec<_>>();
                entries.push(wgpu::BindGroupEntry {
                    binding: inputs.len() as u32,
                    resource: buffer.as_entire_binding(),
                });
                let group = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
                    label: None,
                    layout: &pipe.get_bind_group_layout(0),
                    entries: &entries,
                });
                let groups = if n["ordered"].as_bool() == Some(true) {
                    1
                } else {
                    count
                        .div_ceil(n["workgroup_size"].as_u64().unwrap() as usize)
                        .max(1)
                };
                dispatches.push((name.to_string(), group, groups));
                nodes.push(GraphData {
                    buffer,
                    ty: n["result"].clone(),
                    capacity: count,
                });
            }
            values.push(graph_ref(&g["output"], &args, &nodes)?);
        }
        // Logical lengths travel with each list header; capacities stay bounded.
        let pending = p
            .feedback
            .iter()
            .map(|(name, i)| {
                let source = &values[*i];
                let target = &constants[p.inputs[name].index];
                if source.ty != target.ty || source.capacity != target.capacity {
                    return Err("GPU graph feedback capacity/type mismatch".into());
                }
                let bytes = (source.capacity * width(&source.ty)
                    + usize::from(source.ty["kind"] == "list"))
                    * 4;
                Ok(Feedback {
                    input: name.clone(),
                    source: source.buffer.clone(),
                    target: target.buffer.clone(),
                    temporary: make(bytes, U::COPY_DST | U::COPY_SRC, None)?,
                    bytes,
                    skip: false,
                })
            })
            .collect::<Result<Vec<_>>>()?;
        Ok(GraphResident {
            constants,
            values,
            dispatches,
            pending,
            iteration: 0,
            owed: false,
            live,
            upload,
        })
    }
}

/// Most compute dispatches encoded into one command buffer. Long runs are
/// split across several submissions; nothing is read back between them.
const CHUNK_PASSES: usize = 2048;
/// Each dispatch is its own synchronisation scope, so one compute pass
/// carries many dispatches; any other command (a feedback copy) ends it.
struct Chunk<'a> {
    gpu: &'a Gpu,
    // Declared before the encoder: an open pass is dropped (ended) first.
    pass: Option<wgpu::ComputePass<'static>>,
    encoder: Option<wgpu::CommandEncoder>,
    passes: usize,
    dispatches: usize,
}
impl<'a> Chunk<'a> {
    fn new(gpu: &'a Gpu) -> Self {
        Self { gpu, pass: None, encoder: None, passes: 0, dispatches: 0 }
    }
    fn encoder(&mut self) -> &mut wgpu::CommandEncoder {
        self.pass = None;
        let device = &self.gpu.device;
        self.encoder
            .get_or_insert_with(|| device.create_command_encoder(&Default::default()))
    }
    fn dispatch(&mut self, pipe: &wgpu::ComputePipeline, group: &wgpu::BindGroup, groups: u32) {
        if self.pass.is_none() {
            let device = &self.gpu.device;
            let encoder = self
                .encoder
                .get_or_insert_with(|| device.create_command_encoder(&Default::default()));
            self.pass = Some(encoder.begin_compute_pass(&Default::default()).forget_lifetime());
        }
        let pass = self.pass.as_mut().unwrap();
        pass.set_pipeline(pipe);
        pass.set_bind_group(0, group, &[]);
        pass.dispatch_workgroups(groups, 1, 1);
        self.passes += 1;
        self.dispatches += 1;
        if self.passes >= CHUNK_PASSES {
            self.submit();
        }
    }
    fn submit(&mut self) {
        self.pass = None;
        if let Some(e) = self.encoder.take() {
            self.gpu.queue.submit([e.finish()]);
        }
        self.passes = 0;
    }
    fn finish(mut self) -> usize {
        self.submit();
        self.dispatches
    }
}

/// Device state kept across host calls: inputs uploaded once, every step and
/// graph buffer allocated once, and a global iteration counter.
pub(super) enum Resident {
    Steps(StepsResident),
    Graph(GraphResident),
}
pub(super) struct StepsResident {
    input: Vec<wgpu::Buffer>,
    banks: [Vec<wgpu::Buffer>; 2],
    _metadata: Vec<wgpu::Buffer>,
    groups: Vec<Vec<wgpu::BindGroup>>,
    iteration: u64,
    upload: usize,
}
pub(super) struct GraphResident {
    constants: Vec<GraphData>,
    values: Vec<GraphData>,
    dispatches: Vec<(String, wgpu::BindGroup, usize)>,
    pending: Vec<Feedback>,
    iteration: u64,
    owed: bool,
    live: usize,
    upload: usize,
}
struct Feedback {
    input: String,
    source: wgpu::Buffer,
    target: wgpu::Buffer,
    temporary: wgpu::Buffer,
    bytes: usize,
    skip: bool,
}
struct Location {
    buffer: wgpu::Buffer,
    header: bool,
    ty: Value,
    capacity: usize,
}
/// A step's current device buffer. `offset` is the byte offset of element 0;
/// when `header` is set, word 0 holds the logical element count.
pub struct View {
    pub buffer: wgpu::Buffer,
    pub offset: u64,
    pub header: bool,
    pub ty: Value,
    pub capacity: usize,
}
impl Resident {
    pub(super) fn iteration(&self) -> u64 {
        match self {
            Resident::Steps(r) => r.iteration,
            Resident::Graph(r) => r.iteration,
        }
    }
    fn upload(&self) -> usize {
        match self {
            Resident::Steps(r) => r.upload,
            Resident::Graph(r) => r.upload,
        }
    }
    fn live(&self) -> usize {
        match self {
            Resident::Steps(_) => 0,
            Resident::Graph(r) => r.live,
        }
    }
    fn location(&self, p: &Plan, i: usize) -> Result<Location> {
        let s = p.steps.get(i).ok_or("unknown step")?;
        match self {
            Resident::Steps(r) => {
                if r.iteration == 0 {
                    return Err("session has not run an iteration".into());
                }
                Ok(Location {
                    buffer: r.banks[((r.iteration - 1) % 2) as usize][i].clone(),
                    header: true,
                    ty: s.f["result"].clone(),
                    capacity: s.count.unwrap_or(0),
                })
            }
            Resident::Graph(r) => {
                let v = &r.values[i];
                Ok(Location {
                    buffer: v.buffer.clone(),
                    header: v.ty["kind"] == "list",
                    ty: v.ty.clone(),
                    capacity: v.capacity,
                })
            }
        }
    }
}
fn bytes_of(words: &[u32]) -> &[u8] {
    // u32 has no padding; the byte view is the little-endian lane layout.
    unsafe { std::slice::from_raw_parts(words.as_ptr().cast(), words.len() * 4) }
}
fn step_index(p: &Plan, q: &Value) -> Result<usize> {
    let id = q["step"].as_str().ok_or("read requires a step id")?;
    p.steps.iter().position(|s| s.id == id).ok_or("unknown step".into())
}
fn step_indices(p: &Plan, ids: &Value) -> Result<Vec<usize>> {
    ids.as_array()
        .ok_or("outputs must be an array")?
        .iter()
        .map(|id| step_index(p, &json!({"step": id})))
        .collect()
}
fn slice_bounds(v: &Value) -> Result<(usize, usize)> {
    let a = v.as_array().filter(|a| a.len() == 2).ok_or("slice must be [start, count]")?;
    let n = |x: &Value| x.as_u64().map(|n| n as usize).ok_or("slice bounds must be naturals");
    Ok((n(&a[0])?, n(&a[1])?))
}
/// Word offset and type of a dotted record field inside one element.
pub(super) fn field_path(t: &Value, path: Option<&Value>) -> Result<(usize, Value)> {
    let mut t = t.clone();
    let mut offset = 0;
    if let Some(path) = path {
        for name in path.as_str().ok_or("field must be a dotted path")?.split('.') {
            if t["kind"] != "record" {
                return Err("field path requires a record".into());
            }
            let mut found = None;
            for f in t["fields"].as_array().unwrap() {
                if f["name"] == name {
                    found = Some(f["type"].clone());
                    break;
                }
                offset += width(&f["type"]);
            }
            t = found.ok_or("unknown record field")?;
        }
    }
    Ok((offset, t))
}
/// Scalar lane kind and component count of a reducible element.
pub(super) fn reducible(t: &Value) -> Result<(String, usize)> {
    match t["kind"].as_str() {
        Some(k @ ("u32" | "i32" | "f32" | "u64")) => Ok((k.into(), 1)),
        Some("bool") => Ok(("u32".into(), 1)),
        Some("vector") => match t["element"]["kind"].as_str() {
            Some(k @ ("u32" | "i32" | "f32")) => Ok((k.into(), t["size"].as_u64().unwrap() as usize)),
            _ => Err("reduce supports u32, i32 and f32 vectors".into()),
        },
        _ => Err("reduce supports numeric, Bool and vector values (select a record field)".into()),
    }
}
fn lanes(kind: &str) -> usize {
    if kind == "u64" { 2 } else { 1 }
}
pub(super) fn decode_components(kind: &str, components: usize, w: &[u32]) -> Value {
    let one = |i: usize| -> Value {
        match kind {
            "i32" => json!(w[i] as i32),
            "f32" => {
                let f = f32::from_bits(w[i]);
                if f.is_finite() { json!(f) } else { json!({"F32Bits": w[i]}) }
            }
            "u64" => {
                let n = w[i] as u64 | ((w[i + 1] as u64) << 32);
                if n > 9007199254740991 { json!(n.to_string()) } else { json!(n) }
            }
            _ => json!(w[i]),
        }
    };
    if components == 1 {
        one(0)
    } else {
        Value::Array((0..components).map(|c| one(c * lanes(kind))).collect())
    }
}
/// Generic two-pass reduction kernel. Pass 1 reads elements (an optional
/// length header at word 0), pass 2 combines per-workgroup records
/// `[valid, values...]`. Threads without elements contribute nothing, so
/// min/max never need sentinel values.
pub fn reduce_shader(kind: &str, components: usize, op: &str) -> String {
    let (ty, load, store, combine) = match kind {
        "u32" => ("u32", "data[i]", "out[i]=v;", match op { "sum" => "a+b", "min" => "min(a,b)", _ => "max(a,b)" }.to_string()),
        "i32" => ("i32", "bitcast<i32>(data[i])", "out[i]=bitcast<u32>(v);", match op { "sum" => "a+b", "min" => "min(a,b)", _ => "max(a,b)" }.to_string()),
        "f32" => ("f32", "bitcast<f32>(data[i])", "out[i]=bitcast<u32>(v);", match op { "sum" => "a+b", "min" => "min(a,b)", _ => "max(a,b)" }.to_string()),
        _ => ("vec2<u32>", "vec2<u32>(data[i],data[i+1u])", "out[i]=v.x;out[i+1u]=v.y;", match op {
            "sum" => "vec2<u32>(a.x+b.x,a.y+b.y+select(0u,1u,a.x+b.x<a.x))".to_string(),
            "min" => "select(b,a,a.y<b.y||(a.y==b.y&&a.x<=b.x))".to_string(),
            _ => "select(b,a,a.y>b.y||(a.y==b.y&&a.x>=b.x))".to_string(),
        }),
    };
    let l = lanes(kind);
    let c = components;
    format!(
        "@group(0) @binding(0) var<storage,read> data:array<u32>;
@group(0) @binding(1) var<storage,read_write> out:array<u32>;
@group(0) @binding(2) var<storage,read> params:array<u32>;
var<workgroup> acc_s:array<{ty},{shared}>;
var<workgroup> ok_s:array<u32,256>;
fn load(i:u32)->{ty}{{return {load};}}
fn store(i:u32,v:{ty}){{{store}}}
fn combine(a:{ty},b:{ty})->{ty}{{return {combine};}}
@compute @workgroup_size(256)
fn main(@builtin(local_invocation_id) lid:vec3<u32>,@builtin(workgroup_id) wid:vec3<u32>,@builtin(num_workgroups) nwg:vec3<u32>){{
let mode=params[0];
var n=params[2];
if(params[1]==1u){{n=data[0];}}
let base=params[3];let stride=params[4];let offset=params[5];
let total=nwg.x*256u;
var acc:array<{ty},{c}>;
var ok=0u;
for(var e=wid.x*256u+lid.x;e<n;e+=total){{
let at=base+e*stride;
if(mode==2u&&data[at]==0u){{continue;}}
for(var k=0u;k<{c}u;k++){{let v=load(at+offset+k*{l}u);if(ok==0u){{acc[k]=v;}}else{{acc[k]=combine(acc[k],v);}}}}
ok=1u;
}}
for(var k=0u;k<{c}u;k++){{acc_s[lid.x*{c}u+k]=acc[k];}}
ok_s[lid.x]=ok;
workgroupBarrier();
for(var s=128u;s>0u;s=s>>1u){{
if(lid.x<s&&ok_s[lid.x+s]!=0u){{
for(var k=0u;k<{c}u;k++){{let i=lid.x*{c}u+k;let j=(lid.x+s)*{c}u+k;if(ok_s[lid.x]==0u){{acc_s[i]=acc_s[j];}}else{{acc_s[i]=combine(acc_s[i],acc_s[j]);}}}}
ok_s[lid.x]=1u;
}}
workgroupBarrier();
}}
if(lid.x==0u){{
let slot=1u+wid.x*{record}u;
out[slot]=ok_s[0];
for(var k=0u;k<{c}u;k++){{store(slot+1u+k*{l}u,acc_s[k]);}}
if(wid.x==0u){{if(mode==1u){{out[0]=n;}}else{{out[0]=data[0];}}}}
}}
}}
",
        shared = 256 * c,
        record = 1 + c * l,
    )
}

/// Upper bounds only: logical list lengths remain in resident GPU headers.
pub(super) fn dispatch_count(p: &Plan) -> usize {
    if !p.steps.iter().any(|s| s.f["graph_required"] == true) {
        return p.steps.iter().filter(|s| s.count != Some(0)).count();
    }
    p.steps.iter().map(|s| {
        s.f["graph"]["nodes"].as_array().map_or(0, |nodes| {
            nodes.iter().map(|n| n["schedule"]["passes"].as_array().map_or(1, Vec::len)).sum::<usize>()
        })
    }).sum()
}
pub(super) fn graph_capacity(graph: &Value, arguments: &[usize]) -> Result<(Vec<usize>, usize)> {
    let mut capacities = Vec::new();
    fn resolve(r: &Value, args: &[usize], nodes: &[usize]) -> Result<usize> {
        if let Some(i) = r["param"].as_u64() {
            args.get(i as usize).copied()
        } else if let Some(i) = r["node"].as_u64() {
            nodes.get(i as usize).copied()
        } else {
            None
        }
        .ok_or("invalid graph reference".into())
    }
    for node in graph["nodes"].as_array().ok_or("invalid graph nodes")? {
        let args = node["args"]
            .as_array()
            .ok_or("invalid graph arguments")?
            .iter()
            .map(|r| resolve(r, arguments, &capacities))
            .collect::<Result<Vec<_>>>()?;
        let values = node["capacity"]["args"]
            .as_array()
            .ok_or("invalid graph capacity")?
            .iter()
            .map(|i| {
                args.get(i.as_u64().ok_or("invalid capacity argument")? as usize)
                    .copied()
                    .ok_or("invalid capacity reference".into())
            })
            .collect::<Result<Vec<_>>>()?;
        let cap = match node["capacity"]["kind"].as_str() {
            Some("fixed") => usize::try_from(node["capacity"]["value"].as_u64().ok_or("invalid fixed capacity")?)
                .map_err(|_| "fixed capacity overflow")?,
            Some("one") => 1,
            Some("same") => *values.first().ok_or("missing same capacity")?,
            Some("min") => *values.iter().min().ok_or("missing min capacity")?,
            Some("sum") => values.iter().try_fold(0usize, |a, b| {
                a.checked_add(*b).ok_or("graph capacity overflow")
            })?,
            _ => return Err("invalid graph capacity operation".into()),
        };
        if cap > u32::MAX as usize {
            return Err("GPU graph capacity exceeds u32".into());
        }
        capacities.push(cap);
    }
    let output = resolve(&graph["output"], arguments, &capacities)?;
    if output > u32::MAX as usize {
        return Err("GPU graph output capacity exceeds u32".into());
    }
    Ok((capacities, output))
}
#[derive(Clone)]
struct GraphData {
    buffer: wgpu::Buffer,
    ty: Value,
    capacity: usize,
}
fn graph_ref(r: &Value, args: &[GraphData], nodes: &[GraphData]) -> Result<GraphData> {
    if let Some(i) = r["param"].as_u64() {
        args.get(i as usize)
    } else if let Some(i) = r["node"].as_u64() {
        nodes.get(i as usize)
    } else {
        None
    }
    .cloned()
    .ok_or("invalid resident graph reference".into())
}
impl Gpu {
    fn prepare_graph(&mut self, p: &Plan) -> Result<()> {
        let stage_count = p
            .steps
            .iter()
            .flat_map(|s| s.f["graph"]["nodes"].as_array().into_iter().flatten())
            .map(|n| n["schedule"]["passes"].as_array().map_or(1, Vec::len))
            .sum::<usize>();
        // Long runs are split into bounded submissions; one iteration's
        // stages must fit in a single submission.
        if stage_count > CHUNK_PASSES {
            return Err("GPU graph dispatch budget exceeded".into());
        }
        let limits = self.device.limits();
        for s in &p.steps {
            let g = &s.f["graph"];
            let counts = s
                .args
                .iter()
                .map(|a| a.count.ok_or("unknown graph input capacity".into()))
                .collect::<Result<Vec<_>>>()?;
            let (caps, _) = graph_capacity(g, &counts)?;
            for (i, n) in g["nodes"]
                .as_array()
                .ok_or("missing graph descriptor in mixed pipeline")?
                .iter()
                .enumerate()
            {
                if n["schedule"].is_object() {
                    let extent = schedule_extent(n, &counts, &caps, i)?;
                    if extent > PARALLEL_MAX {
                        return Err("GPU parallel stage capacity exceeds 256^3".into());
                    }
                    for pass in n["schedule"]["passes"].as_array().ok_or("invalid schedule")? {
                        let bind = pass["bind"].as_array().ok_or("invalid schedule bindings")?;
                        if bind.len() > limits.max_storage_buffers_per_shader_stage as usize {
                            return Err("GPU graph binding limits".into());
                        }
                        let groups = quantity(pass["groups"].as_str().unwrap_or(""), extent)?;
                        if groups > limits.max_compute_workgroups_per_dimension as usize {
                            return Err("GPU graph workgroup limits".into());
                        }
                        let name = pass["shader"].as_str().ok_or("missing pass shader")?;
                        if !self.pipelines.contains_key(name) {
                            let readonly = bind.iter().map(|b| b.get("arg").is_some()).collect::<Vec<_>>();
                            let pipe = self.compile(name, &readonly)?;
                            self.pipelines.insert(name.into(), pipe);
                        }
                    }
                    continue;
                }
                let args = n["args"].as_array().ok_or("invalid graph arguments")?.len();
                if args + 1 > limits.max_storage_buffers_per_shader_stage as usize {
                    return Err("GPU graph binding limits".into());
                }
                let wg = n["workgroup_size"]
                    .as_u64()
                    .ok_or("invalid graph workgroup size")? as usize;
                if n["ordered"].as_bool() != Some(true)
                    && caps[i].div_ceil(wg) > limits.max_compute_workgroups_per_dimension as usize
                {
                    return Err("GPU graph workgroup limits".into());
                }
                let name = n["shader"].as_str().ok_or("missing graph shader")?;
                if self.pipelines.contains_key(name) {
                    continue;
                }
                let scope = self.device.push_error_scope(wgpu::ErrorFilter::Validation);
                let oom = self.device.push_error_scope(wgpu::ErrorFilter::OutOfMemory);
                let code = assets::SHADERS
                    .iter()
                    .find(|(n, _)| *n == name)
                    .ok_or("missing compiled graph shader")?
                    .1;
                let module = self
                    .device
                    .create_shader_module(wgpu::ShaderModuleDescriptor {
                        label: Some(name),
                        source: wgpu::ShaderSource::Wgsl(code.into()),
                    });
                let entries = (0..args + 1)
                    .map(|i| wgpu::BindGroupLayoutEntry {
                        binding: i as u32,
                        visibility: wgpu::ShaderStages::COMPUTE,
                        ty: wgpu::BindingType::Buffer {
                            ty: wgpu::BufferBindingType::Storage {
                                read_only: i != args,
                            },
                            has_dynamic_offset: false,
                            min_binding_size: None,
                        },
                        count: None,
                    })
                    .collect::<Vec<_>>();
                let bindings =
                    self.device
                        .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                            label: None,
                            entries: &entries,
                        });
                let layout = self
                    .device
                    .create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                        label: None,
                        bind_group_layouts: &[Some(&bindings)],
                        immediate_size: 0,
                    });
                let pipe = self
                    .device
                    .create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
                        label: Some(name),
                        layout: Some(&layout),
                        module: &module,
                        entry_point: Some("main"),
                        compilation_options: Default::default(),
                        cache: None,
                    });
                let allocation = pollster::block_on(oom.pop());
                let validation = pollster::block_on(scope.pop());
                if let Some(e) = allocation.or(validation) {
                    return Err(e.to_string());
                }
                self.pipelines.insert(name.into(), pipe);
            }
        }
        Ok(())
    }
}

/// Upper bound on any parallel stage extent: the scan's top level is a
/// single 256-wide group over 256 x 256 blocks.
const PARALLEL_MAX: usize = 256 * 256 * 256;
/// Workgroup or word quantities of a parallel schedule (see the lowering).
fn quantity(q: &str, extent: usize) -> Result<usize> {
    let b1 = extent.div_ceil(256).max(1);
    let b2 = b1.div_ceil(256).max(1);
    Ok(match q {
        "c" => extent,
        "b1" => b1,
        "b2" => b2,
        "r1" => b1.min(256),
        "one" => 1,
        _ => return Err("invalid schedule quantity".into()),
    })
}
/// A parallel stage covers its own capacity and every input's.
fn schedule_extent(n: &Value, args: &[usize], caps: &[usize], own: usize) -> Result<usize> {
    let mut extent = caps[own];
    for r in n["args"].as_array().ok_or("invalid graph arguments")? {
        let c = if let Some(i) = r["param"].as_u64() {
            args.get(i as usize).copied()
        } else if let Some(i) = r["node"].as_u64() {
            caps.get(i as usize).copied()
        } else {
            None
        }
        .ok_or("invalid graph reference")?;
        extent = extent.max(c);
    }
    Ok(extent)
}
fn scratch_words(spec: &Value, extent: usize) -> Result<usize> {
    let w = spec["words"].as_array().filter(|w| w.len() == 3).ok_or("invalid scratch size")?;
    let mult = w[0].as_u64().ok_or("invalid scratch size")? as usize;
    let extra = w[2].as_u64().ok_or("invalid scratch size")? as usize;
    mult.checked_mul(quantity(w[1].as_str().unwrap_or(""), extent)?)
        .and_then(|n| n.checked_add(extra))
        .map(|n| n.max(1))
        .ok_or("scratch size overflow".into())
}
impl Gpu {
    /// Compile a bundled shader whose bindings are read-only where marked.
    fn compile(&self, name: &str, readonly: &[bool]) -> Result<wgpu::ComputePipeline> {
        let scope = self.device.push_error_scope(wgpu::ErrorFilter::Validation);
        let oom = self.device.push_error_scope(wgpu::ErrorFilter::OutOfMemory);
        let code = assets::SHADERS
            .iter()
            .find(|(n, _)| *n == name)
            .ok_or("missing compiled pass shader")?
            .1;
        let module = self.device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some(name),
            source: wgpu::ShaderSource::Wgsl(code.into()),
        });
        let entries = readonly
            .iter()
            .enumerate()
            .map(|(i, ro)| wgpu::BindGroupLayoutEntry {
                binding: i as u32,
                visibility: wgpu::ShaderStages::COMPUTE,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Storage { read_only: *ro },
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            })
            .collect::<Vec<_>>();
        let bindings = self.device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: None,
            entries: &entries,
        });
        let layout = self.device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: None,
            bind_group_layouts: &[Some(&bindings)],
            immediate_size: 0,
        });
        let pipe = self.device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some(name),
            layout: Some(&layout),
            module: &module,
            entry_point: Some("main"),
            compilation_options: Default::default(),
            cache: None,
        });
        let allocation = pollster::block_on(oom.pop());
        let validation = pollster::block_on(scope.pop());
        if let Some(e) = allocation.or(validation) {
            return Err(e.to_string());
        }
        Ok(pipe)
    }
}
