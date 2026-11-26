//! Ink render host for wgpu.
use std::collections::BTreeMap;
use wgpu::util::DeviceExt;

#[path = "schema.rs"]
mod schema;
use schema::{Frame, Resource, TextureFormat, Topology};

pub struct RenderFrame {
    textures: BTreeMap<String, wgpu::TextureView>,
    passes: Vec<Pass>,
    layouts: Vec<BindingLayout>,
    packed: Vec<Packed>,
}

pub struct RenderBindings {
    groups: Vec<wgpu::BindGroup>,
    packed_sources: Vec<wgpu::Buffer>,
}

struct Pass {
    pipeline: wgpu::RenderPipeline,
    bindings: usize,
    attachments: Vec<Attachment>,
    draw: schema::Draw,
    packed: Option<usize>,
}

struct BindingLayout {
    layout: wgpu::BindGroupLayout,
    resources: Vec<schema::Binding>,
}

struct Attachment {
    view: Option<wgpu::TextureView>,
    load: wgpu::LoadOp<wgpu::Color>,
}

struct Packed {
    source: String,
    args: Option<wgpu::Buffer>,
}

impl RenderFrame {
    pub fn new(
        device: &wgpu::Device,
        surface_format: wgpu::TextureFormat,
        size: [u32; 2],
        clear_parameters: &[(&str, wgpu::Color)],
    ) -> Result<Self, String> {
        let frame: Frame = serde_json::from_str(include_str!("frame.json")).map_err(|e| e.to_string())?;
        let limit = device.limits().max_texture_dimension_2d;
        if size.contains(&0) || size.iter().any(|dimension| *dimension > limit)
            || frame.textures.iter().any(|texture| size.iter().any(|dimension| *dimension > limit / texture.scale))
        {
            return Err("render frame textures exceed device limits".into());
        }
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Ink render frame"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shader.wgsl").into()),
        });
        let formats: BTreeMap<_, _> = frame.textures.iter()
            .map(|texture| (texture.name.as_str(), match texture.format {
                TextureFormat::Rgba8Unorm => wgpu::TextureFormat::Rgba8Unorm,
                TextureFormat::Rgba16Float => wgpu::TextureFormat::Rgba16Float,
            })).collect();
        let mut textures = BTreeMap::new();
        for texture in &frame.textures {
            let [width, height] = size.map(|dimension| dimension * texture.scale);
            let view = device.create_texture(&wgpu::TextureDescriptor {
                label: Some(&texture.name),
                size: wgpu::Extent3d { width, height, depth_or_array_layers: 1 },
                mip_level_count: 1,
                sample_count: 1,
                dimension: wgpu::TextureDimension::D2,
                format: formats[texture.name.as_str()],
                usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
                view_formats: &[],
            }).create_view(&Default::default());
            textures.insert(texture.name.clone(), view);
        }
        let use_indirect = matches!(device.adapter_info().backend,
            wgpu::Backend::Vulkan | wgpu::Backend::Metal | wgpu::Backend::Dx12 | wgpu::Backend::BrowserWebGpu);
        let mut packed = Vec::new();
        let mut packed_slots = BTreeMap::new();
        let mut passes = Vec::new();
        let mut layouts: Vec<BindingLayout> = Vec::new();
        for pass in frame.passes {
            let bindings = layouts.iter().position(|layout| layout.resources == pass.bindings).unwrap_or_else(|| {
                let entries: Vec<_> = pass.bindings.iter().map(layout_entry).collect();
                let layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                    label: Some(&pass.fragment), entries: &entries,
                });
                let index = layouts.len();
                layouts.push(BindingLayout { layout, resources: pass.bindings });
                index
            });
            let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                label: Some(&pass.fragment), bind_group_layouts: &[Some(&layouts[bindings].layout)], immediate_size: 0,
            });
            let targets: Vec<_> = pass.attachments.iter().map(|attachment| {
                Some(wgpu::ColorTargetState {
                    format: formats.get(attachment.target.as_str()).copied().unwrap_or(surface_format),
                    blend: pass.blend.then_some(wgpu::BlendState::PREMULTIPLIED_ALPHA_BLENDING),
                    write_mask: wgpu::ColorWrites::ALL,
                })
            }).collect();
            let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                label: Some(&pass.fragment),
                layout: Some(&pipeline_layout),
                vertex: wgpu::VertexState {
                    module: &shader, entry_point: Some(&pass.vertex),
                    compilation_options: Default::default(), buffers: &[],
                },
                primitive: wgpu::PrimitiveState {
                    topology: match pass.topology {
                        Topology::Triangles => wgpu::PrimitiveTopology::TriangleList,
                        Topology::TriangleStrip => wgpu::PrimitiveTopology::TriangleStrip,
                    },
                    ..Default::default()
                },
                depth_stencil: None,
                multisample: Default::default(),
                fragment: Some(wgpu::FragmentState {
                    module: &shader, entry_point: Some(&pass.fragment),
                    compilation_options: Default::default(), targets: &targets,
                }),
                multiview_mask: None, cache: None,
            });
            let attachments = pass.attachments.iter().map(|attachment| {
                let load = if attachment.load {
                    wgpu::LoadOp::Load
                } else {
                    let value = if let Some(name) = &attachment.clear_parameter {
                        clear_parameters.iter().find(|(key, _)| *key == name)
                            .map(|(_, value)| *value).ok_or_else(|| format!("missing render clear value {name}"))?
                    } else {
                        let [r, g, b, a] = attachment.rgba.to_be_bytes().map(|byte| f64::from(byte) / 255.0);
                        wgpu::Color { r, g, b, a }
                    };
                    wgpu::LoadOp::Clear(value)
                };
                Ok(Attachment { view: textures.get(&attachment.target).cloned(), load })
            }).collect::<Result<Vec<_>, String>>()?;
            let slot = pass.draw.packed_count.as_ref().map(|source| {
                *packed_slots.entry((source.clone(), pass.draw.vertices)).or_insert_with(|| {
                    let args = use_indirect.then(|| device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
                        label: Some(source),
                        contents: wgpu::util::DrawIndirectArgs { vertex_count: pass.draw.vertices, ..Default::default() }.as_bytes(),
                        usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::INDIRECT,
                    }));
                    packed.push(Packed { source: source.clone(), args });
                    packed.len() - 1
                })
            });
            passes.push(Pass { pipeline, bindings, attachments, draw: pass.draw, packed: slot });
        }
        Ok(Self { textures, passes, layouts, packed })
    }

    /// Rebind only when the allocations supplying named inputs change.
    pub fn bind(&self, device: &wgpu::Device, buffers: &[(&str, &wgpu::Buffer)]) -> Result<RenderBindings, String> {
        let buffer = |source: &str| buffers.iter().find(|(name, _)| *name == source)
            .map(|(_, buffer)| *buffer).ok_or_else(|| format!("missing render buffer {source}"));
        let packed_sources = self.packed.iter().map(|packed| {
            let source = buffer(&packed.source)?;
            if packed.args.is_some() && (!source.usage().contains(wgpu::BufferUsages::COPY_SRC) || source.size() < 4) {
                return Err(format!("packed count {} needs a four-byte COPY_SRC header", packed.source));
            }
            Ok(source.clone())
        }).collect::<Result<Vec<_>, String>>()?;
        let groups = self.layouts.iter().map(|layout| {
            let entries = layout.resources.iter().map(|binding| {
                let resource = if binding.resource == Resource::FloatTexture {
                    wgpu::BindingResource::TextureView(&self.textures[&binding.source])
                } else {
                    buffer(&binding.source)?.as_entire_binding()
                };
                Ok(wgpu::BindGroupEntry { binding: binding.slot, resource })
            }).collect::<Result<Vec<_>, String>>()?;
            Ok(device.create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("Ink frame inputs"), layout: &layout.layout, entries: &entries,
            }))
        }).collect::<Result<Vec<_>, String>>()?;
        Ok(RenderBindings { groups, packed_sources })
    }

    pub fn draw(
        &self,
        encoder: &mut wgpu::CommandEncoder,
        target: &wgpu::TextureView,
        bindings: &RenderBindings,
        capacity: impl Fn(&str) -> u32,
    ) {
        for (packed, source) in self.packed.iter().zip(&bindings.packed_sources) {
            if let Some(args) = &packed.args {
                encoder.copy_buffer_to_buffer(source, 0, args, 4, 4);
            }
        }
        for pass in &self.passes {
            let attachments: [_; 4] = std::array::from_fn(|index| pass.attachments.get(index).map(|attachment|
                wgpu::RenderPassColorAttachment {
                    view: attachment.view.as_ref().unwrap_or(target), depth_slice: None, resolve_target: None,
                    ops: wgpu::Operations { load: attachment.load, store: wgpu::StoreOp::Store },
                }
            ));
            let mut raster = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Ink render pass"), color_attachments: &attachments[..pass.attachments.len()],
                ..Default::default()
            });
            raster.set_pipeline(&pass.pipeline);
            raster.set_bind_group(0, &bindings.groups[pass.bindings], &[]);
            if let Some(packed) = pass.packed.map(|index| &self.packed[index]) {
                if let Some(args) = &packed.args {
                    raster.draw_indirect(args, 0);
                } else {
                    raster.draw(0..pass.draw.vertices, 0..capacity(&packed.source));
                }
            } else {
                raster.draw(0..pass.draw.vertices, 0..pass.draw.instances);
            }
        }
    }
}

fn layout_entry(binding: &schema::Binding) -> wgpu::BindGroupLayoutEntry {
    let mut visibility = wgpu::ShaderStages::empty();
    visibility.set(wgpu::ShaderStages::VERTEX, binding.vertex);
    visibility.set(wgpu::ShaderStages::FRAGMENT, binding.fragment);
    let ty = match binding.resource {
        Resource::FloatTexture => wgpu::BindingType::Texture {
            sample_type: wgpu::TextureSampleType::Float { filterable: false },
            view_dimension: wgpu::TextureViewDimension::D2,
            multisampled: false,
        },
        kind => wgpu::BindingType::Buffer {
            ty: if kind == Resource::Uniform { wgpu::BufferBindingType::Uniform }
                else { wgpu::BufferBindingType::Storage { read_only: true } },
            has_dynamic_offset: false,
            min_binding_size: None,
        },
    };
    wgpu::BindGroupLayoutEntry { binding: binding.slot, visibility, ty, count: None }
}
