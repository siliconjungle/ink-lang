//! wgpu device adapter for the versioned runtime ABI.
use super::*;
pub(super) struct Gpu {
    _instance: wgpu::Instance,
    device: wgpu::Device,
    queue: wgpu::Queue,
    pipelines: BTreeMap<String, wgpu::ComputePipeline>,
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
        let lost = Arc::new(AtomicBool::new(false));
        let flag = lost.clone();
        device.set_device_lost_callback(move |_, _| {
            flag.store(true, Ordering::Relaxed);
        });
        Ok(Self {
            _instance: instance,
            device,
            queue,
            pipelines: BTreeMap::new(),
            lost,
        })
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
    pub(super) fn execute(&self, p: &Plan) -> Result<Value> {
        let scope = self.device.push_error_scope(wgpu::ErrorFilter::Validation);
        let oom = self.device.push_error_scope(wgpu::ErrorFilter::OutOfMemory);
        let result = self.execute_inner(p);
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
    fn execute_inner(&self, p: &Plan) -> Result<Value> {
        if p.steps
            .iter()
            .any(|s| s.f["graph_required"].as_bool() == Some(true))
        {
            return self.execute_graph(p);
        }
        use wgpu::BufferUsages as U;
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
                self.buffer(words.len() * 4, U::STORAGE, Some(&words))
            })
            .collect::<Result<Vec<_>>>()?;
        let banks = (0..2)
            .map(|_| {
                p.steps
                    .iter()
                    .map(|s| {
                        self.buffer(
                            (1 + s.count.unwrap() * width(&s.f["result"])) * 4,
                            U::STORAGE | U::COPY_SRC,
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
        let mut encoder = self.device.create_command_encoder(&Default::default());
        for iteration in 0..p.iterations {
            let phase = if iteration == 0 {
                0
            } else if iteration % 2 == 1 {
                2
            } else {
                1
            };
            for (i, s) in p.steps.iter().enumerate() {
                if s.count == Some(0) {
                    continue;
                }
                let mut pass = encoder.begin_compute_pass(&Default::default());
                pass.set_pipeline(&self.pipelines[s.f["shader"].as_str().unwrap()]);
                pass.set_bind_group(0, &groups[i][phase], &[]);
                pass.dispatch_workgroups(s.count.unwrap().div_ceil(64) as u32, 1, 1);
            }
        }
        let reads = p
            .outputs
            .iter()
            .map(|i| {
                let bytes = (1 + p.steps[*i].count.unwrap() * width(&p.steps[*i].f["result"])) * 4;
                let b = self.buffer(bytes, U::MAP_READ | U::COPY_DST, None)?;
                if bytes > 0 {
                    encoder.copy_buffer_to_buffer(
                        &banks[(p.iterations - 1) % 2][*i],
                        0,
                        &b,
                        0,
                        bytes as u64,
                    );
                }
                Ok((*i, b, bytes))
            })
            .collect::<Result<Vec<_>>>()?;
        let submitted = self.queue.submit([encoder.finish()]);
        let mut values = serde_json::Map::new();
        let mut readback = 0;
        for (i, b, bytes) in reads {
            let (tx, rx) = std::sync::mpsc::channel();
            b.map_async(wgpu::MapMode::Read, .., move |r| {
                let _ = tx.send(r);
            });
            self.device
                .poll(wgpu::PollType::Wait {
                    submission_index: Some(submitted.clone()),
                    timeout: Some(std::time::Duration::from_secs(30)),
                })
                .map_err(|e| e.to_string())?;
            rx.recv_timeout(std::time::Duration::from_secs(30))
                .map_err(|e| e.to_string())?
                .map_err(|e| e.to_string())?;
            let mapped = b.slice(..).get_mapped_range().map_err(|e| e.to_string())?;
            let words: Vec<u32> = mapped[..bytes]
                .chunks_exact(4)
                .map(|b| u32::from_le_bytes(b.try_into().unwrap()))
                .collect();
            let count = words[0] as usize;
            let n = count
                .checked_mul(width(&p.steps[i].f["result"]))
                .ok_or("GPU result length")?;
            if n > words.len() - 1 {
                return Err("invalid GPU result length".into());
            }
            let d = Data {
                words: Arc::new(words[1..1 + n].to_vec()),
                count,
                finite: true,
            };
            values.insert(p.steps[i].id.clone(), unpack(&d, &p.steps[i].f["result"]));
            drop(mapped);
            b.unmap();
            readback += bytes;
        }
        Ok(
            json!({"values":values,"counters":{"upload_bytes":input.iter().map(|b|b.size() as usize).sum::<usize>()+p.steps.iter().map(|s|4*(s.args.len()+1)).sum::<usize>(),"readback_bytes":readback,"dispatches":p.steps.iter().filter(|s|s.count!=Some(0)).count()*p.iterations,"live_buffer_bytes":p.bytes}}),
        )
    }
}

/// Upper bounds only: logical list lengths remain in resident GPU headers.
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
        if !p.feedback.is_empty() {
            return Err("GPU literal graph feedback is unsupported".into());
        }
        let stage_count = p
            .steps
            .iter()
            .map(|s| s.f["graph"]["nodes"].as_array().map_or(0, Vec::len))
            .sum::<usize>();
        if stage_count
            .checked_mul(p.iterations)
            .is_none_or(|n| n > 65536)
        {
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
    fn graph_read(&self, buffer: &wgpu::Buffer, offset: usize, bytes: usize) -> Result<Vec<u32>> {
        if bytes == 0 {
            return Ok(Vec::new());
        }
        let b = self.buffer(
            bytes,
            wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            None,
        )?;
        let mut encoder = self.device.create_command_encoder(&Default::default());
        encoder.copy_buffer_to_buffer(buffer, offset as u64, &b, 0, bytes as u64);
        let submitted = self.queue.submit([encoder.finish()]);
        let (tx, rx) = std::sync::mpsc::channel();
        b.map_async(wgpu::MapMode::Read, .., move |r| {
            let _ = tx.send(r);
        });
        self.device
            .poll(wgpu::PollType::Wait {
                submission_index: Some(submitted),
                timeout: Some(std::time::Duration::from_secs(30)),
            })
            .map_err(|e| e.to_string())?;
        rx.recv_timeout(std::time::Duration::from_secs(30))
            .map_err(|e| e.to_string())?
            .map_err(|e| e.to_string())?;
        let mapped = b.slice(..).get_mapped_range().map_err(|e| e.to_string())?;
        let words = mapped[..bytes]
            .chunks_exact(4)
            .map(|b| u32::from_le_bytes(b.try_into().unwrap()))
            .collect();
        drop(mapped);
        b.unmap();
        Ok(words)
    }
    fn execute_graph(&self, p: &Plan) -> Result<Value> {
        use wgpu::BufferUsages as U;
        if !p.feedback.is_empty() {
            return Err("GPU literal graph feedback is unsupported".into());
        }
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
                    buffer: make(words.len() * 4, U::STORAGE | U::COPY_SRC, Some(&words))?,
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
                let buffer = make(bytes, U::STORAGE | U::COPY_SRC, None)?;
                let inputs = n["args"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|r| graph_ref(r, &args, &nodes))
                    .collect::<Result<Vec<_>>>()?;
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
        drop(make);
        let mut encoder = self.device.create_command_encoder(&Default::default());
        for _ in 0..p.iterations {
            for (name, group, groups) in &dispatches {
                let mut pass = encoder.begin_compute_pass(&Default::default());
                pass.set_pipeline(&self.pipelines[name]);
                pass.set_bind_group(0, group, &[]);
                pass.dispatch_workgroups(*groups as u32, 1, 1);
            }
        }
        self.queue.submit([encoder.finish()]);
        let mut result = serde_json::Map::new();
        let mut readback = 0usize;
        let resident_live = live;
        let mut peak_live = resident_live;
        for i in &p.outputs {
            let v = &values[*i];
            let list = v.ty["kind"] == "list";
            if resident_live
                .checked_add(4)
                .ok_or("readback size overflow")?
                > MAX_BYTES
            {
                return Err("GPU graph readback budget exceeded".into());
            }
            let count = if list {
                peak_live = peak_live.max(resident_live + 4);
                readback += 4;
                let h = self.graph_read(&v.buffer, 0, 4)?;
                h[0] as usize
            } else {
                1
            };
            if count > v.capacity {
                return Err("GPU graph output length exceeds capacity".into());
            }
            let bytes = count * width(&v.ty) * 4;
            readback += bytes;
            let peak = resident_live
                .checked_add(bytes.max(4))
                .ok_or("readback size overflow")?;
            if peak > MAX_BYTES {
                return Err("GPU graph readback budget exceeded".into());
            }
            peak_live = peak_live.max(peak);
            let words = self.graph_read(&v.buffer, if list { 4 } else { 0 }, bytes)?;
            // Readback buffers are sequential and released after each read.
            // Account their maximum simultaneous footprint, not a fake peak.

            let data = Data {
                words: Arc::new(words),
                count,
                finite: true,
            };
            result.insert(p.steps[*i].id.clone(), unpack(&data, &v.ty));
        }
        Ok(
            json!({"values":result,"counters":{"upload_bytes":upload,"readback_bytes":readback,"dispatches":dispatches.len()*p.iterations,"live_buffer_bytes":peak_live}}),
        )
    }
}
