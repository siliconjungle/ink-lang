//! Build the fixed-function render host interface from checked Ink values and WGSL.
use crate::{core::CheckedModule, eval, LangResult};
use serde_json::Value;
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::Path,
};

#[path = "../hosts/render/schema.rs"]
mod schema;
use schema::{Frame, Pass, Resource};

pub fn build(module: &CheckedModule, function: &str, shader: &str, output: &Path) -> LangResult<()> {
    let mut rendered = eval::call_checked(module, function, vec![], &mut 200_000)?.json();
    normalize(&mut rendered);
    let mut frame: Frame = serde_json::from_value(rendered)
        .map_err(|error| format!("expected std:render Frame: {error}"))?;
    for pass in &mut frame.passes {
        pass.bindings.sort_by_key(|binding| binding.slot);
    }
    check(&frame, shader)?;
    let data = serde_json::to_string(&frame).map_err(|error| error.to_string())?;
    let shader_js = serde_json::to_string(shader).map_err(|error| error.to_string())?;
    fs::create_dir_all(output).map_err(|error| error.to_string())?;
    for (filename, content) in [
        ("frame.json", data.clone()),
        ("shader.wgsl", shader.to_owned()),
        ("schema.rs", include_str!("../hosts/render/schema.rs").to_owned()),
        ("render.rs", include_str!("../hosts/render/wgpu.rs").to_owned()),
        ("render.mjs", format!(
            "const frame = {data};\nconst shader = {shader_js};\n{}",
            include_str!("../hosts/render/webgpu.mjs"),
        )),
    ] {
        fs::write(output.join(filename), content).map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn normalize(value: &mut Value) {
    match value {
        Value::Array(items) => items.iter_mut().for_each(normalize),
        Value::Object(fields) => {
            for (name, value) in fields.iter_mut() {
                match name.as_str() {
                    "format" | "resource" | "topology" => {
                        if let Some((_, variant)) = value.as_str().and_then(|text| text.rsplit_once('.')) {
                            *value = Value::String(variant.to_owned());
                        }
                    }
                    "clear_parameter" | "packed_count" if value.as_object().is_some_and(|object| object.len() == 1) => {
                        if let Some(some) = value.get_mut("Some") {
                            *value = some.take();
                        } else if value.get("None").is_some_and(Value::is_null) {
                            *value = Value::Null;
                        }
                    }
                    _ => normalize(value),
                }
            }
        }
        _ => {}
    }
}

fn identifier(name: &str) -> bool {
    !name.is_empty() && name.len() <= 64 && name.bytes().enumerate().all(|(index, byte)| {
        byte == b'_' || byte.is_ascii_alphabetic() || (index > 0 && byte.is_ascii_digit())
    })
}

fn check(frame: &Frame, shader: &str) -> LangResult<()> {
    use naga::valid::{Capabilities, ValidationFlags, Validator};
    if frame.textures.len() > 32 || frame.passes.is_empty() || frame.passes.len() > 32 {
        return Err("render frame requires one to thirty-two passes and at most thirty-two textures".into());
    }
    let mut scales = BTreeMap::from([("surface", 1)]);
    for texture in &frame.textures {
        if !identifier(&texture.name) || !(1..=4).contains(&texture.scale)
            || scales.insert(&texture.name, texture.scale).is_some()
        {
            return Err(format!("invalid or duplicate render texture {}", texture.name));
        }
    }
    let module = naga::front::wgsl::parse_str(shader)
        .map_err(|error| error.emit_to_string(shader))?;
    let info = Validator::new(ValidationFlags::all(), Capabilities::empty())
        .validate(&module).map_err(|error| error.emit_to_string(shader))?;
    let mut written = BTreeSet::new();
    let mut buffer_kinds = BTreeMap::new();
    for pass in &frame.passes {
        check_shader(pass, &module, &info)?;
        let mut targets = BTreeSet::new();
        if pass.attachments.is_empty() || pass.attachments.len() > 4 || pass.bindings.len() > 16 {
            return Err("render pass requires one to four color attachments and at most sixteen bindings".into());
        }
        let mut target_scale = None;
        for attachment in &pass.attachments {
            let target = attachment.target.as_str();
            let scale = scales.get(target).ok_or_else(|| format!("unknown render target {target}"))?;
            if !targets.insert(target) || target_scale.is_some_and(|previous| previous != scale)
                || attachment.clear_parameter.as_deref().is_some_and(|name| !identifier(name))
                || (attachment.load && (attachment.clear_parameter.is_some() || !written.contains(target)))
            {
                return Err(format!("invalid attachment {target} in {}", pass.fragment));
            }
            target_scale = Some(scale);
        }
        let mut slots = BTreeSet::new();
        for binding in &pass.bindings {
            let source = binding.source.as_str();
            if !identifier(source) || binding.slot > 31 || !slots.insert(binding.slot)
                || !(binding.vertex || binding.fragment)
            {
                return Err(format!("invalid render binding {} in {}", binding.slot, pass.fragment));
            }
            if binding.resource == Resource::FloatTexture {
                if source == "surface" || !written.contains(source) || targets.contains(source) {
                    return Err(format!("texture {source} must come from a prior pass and cannot be its own target"));
                }
            } else if scales.contains_key(source)
                || buffer_kinds.insert(source, binding.resource).is_some_and(|previous| previous != binding.resource)
            {
                return Err(format!("inconsistent render buffer {source}"));
            }
        }
        if pass.draw.vertices == 0
            || match &pass.draw.packed_count {
                Some(source) => pass.draw.instances != 0 || buffer_kinds.get(source.as_str()) != Some(&Resource::ReadOnlyStorage),
                None => pass.draw.instances == 0,
            }
        {
            return Err(format!("invalid draw in {}", pass.fragment));
        }
        written.extend(targets);
    }
    if !written.contains("surface") {
        return Err("render frame must write the surface".into());
    }
    Ok(())
}

fn check_shader(pass: &Pass, module: &naga::Module, info: &naga::valid::ModuleInfo) -> LangResult<()> {
    use naga::{AddressSpace, ImageClass, ImageDimension, ScalarKind, ShaderStage, StorageAccess, TypeInner};
    let mut active = BTreeSet::new();
    for (name, stage) in [(&pass.vertex, ShaderStage::Vertex), (&pass.fragment, ShaderStage::Fragment)] {
        let index = module.entry_points.iter().position(|entry| entry.name == *name && entry.stage == stage)
            .ok_or_else(|| format!("missing {stage:?} shader entry {name}"))?;
        if stage == ShaderStage::Fragment {
            let ep = &module.entry_points[index];
            let result = ep.function.result.as_ref().ok_or("fragment requires color outputs")?;
            let mut locations = BTreeSet::new();
            let mut insert = |binding: &Option<naga::Binding>| {
                if let Some(naga::Binding::Location { location, .. }) = binding {
                    locations.insert(*location);
                }
            };
            insert(&result.binding);
            if let TypeInner::Struct { members, .. } = &module.types[result.ty].inner {
                for member in members {
                    insert(&member.binding);
                }
            }
            if !locations.iter().copied().eq(0..pass.attachments.len() as u32) {
                return Err(format!("fragment {name} must write one color per declared attachment"));
            }
        }
        let entry = info.get_entry_point(index);
        for (handle, global) in module.global_variables.iter() {
            if entry[handle].is_empty() {
                continue;
            }
            let Some(binding) = &global.binding else { continue };
            let valid = binding.group == 0 && pass.bindings.iter().any(|declared| {
                declared.slot == binding.binding
                    && (if stage == ShaderStage::Vertex { declared.vertex } else { declared.fragment })
                    && match declared.resource {
                        Resource::Uniform => global.space == AddressSpace::Uniform,
                        Resource::ReadOnlyStorage => global.space == (AddressSpace::Storage { access: StorageAccess::LOAD }),
                        Resource::FloatTexture => matches!(module.types[global.ty].inner,
                            TypeInner::Image { dim: ImageDimension::D2, arrayed: false,
                                class: ImageClass::Sampled { kind: ScalarKind::Float, multi: false } }),
                    }
            });
            if !valid {
                return Err(format!("shader entry {name} has no compatible render binding at group {} slot {}", binding.group, binding.binding));
            }
            active.insert(binding.binding);
        }
    }
    if pass.bindings.iter().any(|binding| !active.contains(&binding.slot)) {
        return Err(format!("render pass {} declares unused bindings", pass.fragment));
    }
    Ok(())
}
