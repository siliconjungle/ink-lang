//! Distribution adapters for a sealed, completely replayed compile-time plan.
//! Emitted applications contain literal code and fixed runtimes, never search.
use ink_core::{
    physical::{Definitions, Tables},
    planning::CheckedPlan,
    LangResult,
};
use std::{fs, path::Path};
fn write(path: &Path, bytes: impl AsRef<[u8]>) -> LangResult<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(path, bytes).map_err(|e| e.to_string())
}
pub fn emit(plan: &CheckedPlan, target: &str, output: &Path) -> LangResult<()> {
    if plan.protocol().is_some()&&target!="javascript" {return Err("selected state protocol currently requires the JavaScript state capability".into());}
    if plan.maintained().is_some() && !matches!(target,"javascript"|"rust"|"rust-wasm") {return Err("maintained source folds currently require the JavaScript or Rust state capability; choose a target-compatible plan".into());}
    if target!="javascript" && plan.physical().is_some_and(|p|!p.plan().dense_prefixes.is_empty()){return Err("dense source table prefixes currently require the JavaScript state capability".into());}
    if target!="javascript" && plan.physical().is_some_and(|p|!p.plan().record_elisions.is_empty()) {return Err("source record elision currently requires JavaScript".into());}
    if target!="javascript" && plan.physical().is_some_and(|p|!p.plan().sum_spines.is_empty()) {return Err("source sum spines currently require JavaScript".into());}
    if target!="javascript" && plan.physical().is_some_and(|p|!p.plan().dictionary_tables.is_empty()) {return Err("source dictionary tables currently require JavaScript".into());}
    if target!="javascript" && plan.physical().is_some_and(|p|!p.plan().boundary_readers.is_empty()) {return Err("checked literal boundary readers currently require JavaScript".into());}
    let physical = plan.physical().map(|p| p.plan());
    if plan.route().is_some() && !matches!(target, "wgpu" | "webgpu") {
        return Err("pure placement requires the wgpu or webgpu host; CPU lanes must select a plan without routing".into());
    }
    if plan.route().is_some() && plan.representation().is_some() {
        return emit_state_route(plan, target, output);
    }
    if !matches!(target, "rust" | "rust-wasm")
        && physical.is_some_and(|p| {
            !p.columns.is_empty() || p.column_maps.is_some() || p.bounds.is_some() || p.buffers != ink_core::physical::Buffers::Scoped || p.tables != Tables::Ordered
                || !p.borrow_reads.is_empty()
                || !p.borrow_rows.is_empty()
                || p.definitions != Definitions::Shared
                || !p.reservations.is_empty()
                || !p.inline_functions.is_empty()
        })
    {
        return Err("requested physical sites require the Rust or Rust-Wasm capability; select a compatible database plan".into());
    }
    if let Some(representation) = plan.representation() {
        match target {
            "rust" => write(
                output,
                ink_lowering_rust::representation_program::lower_planned(plan)?,
            )?,
            "rust-wasm" => crate::representations::project(
                output,
                &ink_lowering_rust::representation_program::lower_planned(plan)?,
                target,
            )?,
            _ => crate::representations::emit(representation, target, output)?,
        }
    } else {
        match target {
            "rust" => write(output, ink_lowering_rust::state_native::emit_planned(plan)?)?,
            "rust-wasm" => {
                let source = ink_lowering_rust::state_native::emit_planned(plan)?;
                crate::runtime::emit_rust_program(
                    &source,
                    output,
                )?;
            }
            "javascript" => write(output, ink_lowering_js::lower_planned(plan)?.javascript)?,
            "wgpu" | "webgpu" => {
                if plan.route().is_some() {
                    crate::runtime::emit_routed_planned(plan, output)?;
                } else {
                    crate::runtime::emit_planned(plan, output)?;
                }
            }
            _ => return Err("unsupported compiled plan emission target".into()),
        }
    }
    if matches!(target,"wgpu"|"webgpu") && plan.route().is_some() {
        let directory=output;
        let directory=if plan.representation().is_some(){directory.join("route")}else{directory.to_path_buf()};
        crate::runtime::install_usage_identity(&directory,&plan.original().identity()?)?;
    }
    write(
        &output.with_extension("plan.json"),
        ink_core::registry::canonical(plan.package())?,
    )?;
    write(&output.with_extension("plan-receipt.json"),serde_json::to_vec_pretty(&serde_json::json!({
        "schema":1,"status":"checked","input":plan.original().identity()?,"selected":plan.module().identity()?,
        "plan":ink_core::registry::identity(plan.package())?,"target":target,
        "representation":plan.representation().map(|r|r.request().representation.as_str()),
        "physical":physical,"steps":plan.package().steps.len(),
        "trust":"General proof admission; literal lowerers, ownership primitives, codecs and target toolchains remain trusted"
    })).map_err(|e|e.to_string())?)
}

pub(crate) fn specialization_evidence(plan: &CheckedPlan) -> LangResult<serde_json::Value> {
    Ok(
        serde_json::json!({"semantics":ink_core::planning::SEMANTICS,
        "input_core_sha256":plan.original().identity()?,"selected_core_sha256":plan.module().identity()?,
        "plan_sha256":ink_core::registry::identity(plan.package())?,"steps":plan.package().steps.len()}),
    )
}

/// Initialize an ordinary extension/rewrite plan with the original logical
/// checkpoint namespace. No physical/routing choice may silently disappear.
pub fn build_initialized(
    plan: &CheckedPlan,
    target: &str,
    output: &Path,
    seed: &[u8],
    cargo: Option<&str>,
) -> LangResult<()> {
    if plan.package().steps.iter().any(|step| {
        !matches!(
            step,
            ink_core::planning::Step::Extension(_) | ink_core::planning::Step::Rewrite(_)
                | ink_core::planning::Step::Functions(_)
        )
    }) {
        return Err(
            "initialized composed artifacts currently require extension/rewrite/functions plans".into(),
        );
    }
    crate::stateful::Runtime::restore_portable_checked(plan.original(), seed)?;
    let target = if target == "gpu" { "webgpu" } else { target };
    let cargo = cargo
        .map(String::from)
        .or_else(|| std::env::var("INK_CARGO").ok())
        .unwrap_or_else(|| "cargo".into());
    match target {
        "javascript" => {
            let code = ink_lowering_js::lower_planned(plan)?.javascript;
            crate::initial_state::javascript(output, &code, seed)?;
        }
        "rust" | "native" | "wasm32" => {
            let project = if target == "rust" {
                output.to_path_buf()
            } else {
                std::path::PathBuf::from(format!("{}.project", output.display()))
            };
            crate::runtime::emit_rust_program(
                &ink_lowering_rust::state_native::emit_planned(plan)?,
                &project,
            )?;
            crate::runtime::emit_initial_state(&project, Some(seed))?;
            if target != "rust" {
                crate::runtime::toolchain::complete_program(
                    &project,
                    target == "wasm32",
                    output,
                    &cargo,
                )?;
                if target == "wasm32" {
                    crate::initial_state::wasm(output, seed)?;
                }
            }
        }
        "webgpu" => {
            crate::runtime::emit_planned(plan, output)?;
            crate::initial_state::gpu(output, seed)?;
            build_gpu_fallbacks(output, &cargo)?;
        }
        _ => return Err("unsupported initialized composed artifact target".into()),
    }
    let evidence = specialization_evidence(plan)?;
    let binding = serde_json::json!({"target":target,"input_core_sha256":plan.original().identity()?,
        "selected_core_sha256":plan.module().identity()?,"compiled_plan":plan.package(),"specialization":evidence,
        "initial_state":{"source_core_sha256":plan.original().identity()?,
            "snapshot_sha256":crate::initial_state::descriptor("",seed)["sha256"]},
        "trust":"Complete plan replay; literal emission, runtimes and target toolchains remain trusted"});
    let path = if matches!(target, "rust" | "webgpu") {
        output.join("plan.json")
    } else {
        std::path::PathBuf::from(format!("{}.plan.json", output.display()))
    };
    write(
        &path,
        serde_json::to_vec(&binding).map_err(|e| e.to_string())?,
    )
}

// Complete the browser bundle before its artifact inventory is sealed. Cargo
// targets live outside the published directory (the build driver supplies the
// shared target/lock); CPU fallback modules themselves are included and hashed.
fn build_gpu_fallbacks(bundle: &Path, cargo: &str) -> LangResult<()> {
    let project = bundle.join("cpu");
    if project.join("Cargo.toml").is_file() {
        let manifest: serde_json::Value = serde_json::from_slice(
            &fs::read(bundle.join("manifest.json")).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        if manifest["runtime_abi"] == "ink-module-v1" {
            crate::runtime::toolchain::complete_program(
                &project,
                true,
                &project.join("compiled_state.wasm"),
                cargo,
            )?;
        } else {
            crate::runtime::toolchain::gpu_cpu_wasm_with_cargo(&project, &bundle.join("cpu.wasm"), cargo)?;
        }
    }
    let directory = bundle.join("gpu");
    if directory.is_dir() {
        let mut children = fs::read_dir(directory)
            .map_err(|e| e.to_string())?
            .map(|e| e.map(|e| e.path()).map_err(|e| e.to_string()))
            .collect::<LangResult<Vec<_>>>()?;
        children.sort();
        for child in children {
            if child.join("manifest.json").is_file() {
                build_gpu_fallbacks(&child, cargo)?;
            }
        }
    }
    Ok(())
}

/// One application facade joins independent pure-entry placement and maintained
/// transactional state. Calls inside transactions remain literal host calls;
/// the checked route controls the public pure entry, as in the routing contract.
fn emit_state_route(plan: &CheckedPlan, target: &str, output: &Path) -> LangResult<()> {
    let representation = plan
        .representation()
        .ok_or("state route needs a representation")?;
    let route = plan.route().ok_or("state route needs a pure route")?;
    if !matches!(target, "wgpu" | "webgpu") {
        return Err("state route needs a GPU host target".into());
    }
    if plan.physical().is_some_and(|p| {
        !p.plan().columns.is_empty() || p.plan().column_maps.is_some() || p.plan().bounds.is_some() || p.plan().buffers != ink_core::physical::Buffers::Scoped || p.plan().tables != Tables::Ordered
            || !p.plan().borrow_reads.is_empty()
            || !p.plan().borrow_rows.is_empty()
            || p.plan().definitions != Definitions::Shared
            || !p.plan().inline_functions.is_empty()
    }) {
        return Err("GPU state facade requires host-compatible physical choices".into());
    }
    fs::create_dir_all(output).map_err(|e| e.to_string())?;
    crate::runtime::emit_routed_planned(plan, &output.join("route"))?;
    crate::runtime::install_usage_identity(&output.join("route"),&plan.original().identity()?)?;
    let entry = &route.package().entry;
    let javascript = ink_lowering_js::lower(plan.module())?;
    write(&output.join("pure.mjs"), javascript.javascript)?;
    write(
        &output.join("state.mjs"),
        ink_lowering_js::representation_program::lower(representation)?,
    )?;
    write(
        &output.join("ink-plan.mjs"),
        format!(
            r#"import {{createState}} from './state.mjs';
import {{call as pureCall}} from './pure.mjs';
export {{createState}};
export async function loadInk(base,options={{}}){{
 const root=new URL(base,globalThis.location?.href??'http://localhost/');if(!root.pathname.endsWith('/'))root.pathname+='/';
 const adapter=await import(new URL('route/ink-route.mjs',root));const route=await adapter.loadRoute(new URL('route/',root),options);
 return {{createState,async call(name,args){{return name==={entry:?}?route.run(args):{{value:pureCall(name,args),backend:'cpu'}};}},dispose(){{return route.close?.()??route.dispose?.();}}}};
}}
"#
        ),
    )?;
    crate::representations::emit(representation, "wgpu", &output.join("state"))?;
    write(&output.join("Cargo.toml"),"[package]\nname=\"ink-composed-plan\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[workspace]\nexclude=[\"state\",\"route/native\"]\n[dependencies]\nmaintained={package=\"ink-compiled-representation\",path=\"state\"}\nrouted={package=\"ink-gpu-program\",path=\"route/native\"}\nnum-bigint=\"0.4\"\nsha2=\"0.10\"\nserde_json={version=\"1\",features=[\"float_roundtrip\"]}\n")?;
    write(
        &output.join("src/pure.rs"),
        ink_lowering_rust::state_native::emit(plan.module().program())?,
    )?;
    write(
        &output.join("src/lib.rs"),
        format!(
            r#"use serde_json::Value;
#[path="pure.rs"]mod literal;
pub struct State{{state:maintained::State,route:routed::Engine,pure:literal::State}}
impl State{{
 pub fn new()->Result<Self,String>{{Ok(Self{{state:maintained::State::new()?,route:routed::Engine::new(),pure:literal::State::new()}})}}
 pub fn restore(bytes:&[u8])->Result<Self,String>{{Ok(Self{{state:maintained::State::restore(bytes)?,route:routed::Engine::new(),pure:literal::State::new()}})}}
 pub fn invoke_json(&mut self,name:&str,args:&Value)->Result<Value,String>{{self.state.invoke_json(name,args)}}
 pub fn call_json(&mut self,name:&str,args:&Value)->Result<Value,String>{{if name=={entry:?}{{self.route.call_route(args)}}else{{Ok(serde_json::json!({{"value":self.pure.call_json(name,args)?,"backend":"cpu"}}))}}}}
 pub fn checkpoint(&self)->Result<Vec<u8>,String>{{self.state.checkpoint()}}
 pub fn version(&self)->u64{{self.state.version()}}
 pub fn outbox_json(&self)->Value{{self.state.outbox_json()}}
 pub fn acknowledge_through(&mut self,c:u64,p:u64){{self.state.acknowledge_through(c,p)}}
 pub fn begin_transaction(&mut self)->Result<bool,String>{{self.state.begin_transaction()}}
 pub fn commit_transaction(&mut self){{self.state.commit_transaction()}}
 pub fn rollback_transaction(&mut self){{self.state.rollback_transaction()}}
}}
"#
        ),
    )?;
    write(&output.join("manifest.json"),serde_json::to_vec_pretty(&serde_json::json!({"schema":1,"runtime_abi":"ink-composed-plan-v1",
        "source":plan.original().identity()?,"selected":plan.module().identity()?,"plan":ink_core::registry::identity(plan.package())?,
        "representation":representation.request().representation,"route_entry":entry,"target":target,
        "native":"Cargo.toml","browser":"ink-plan.mjs","scope":"Maintained transactional state and checked public pure-entry routing; transaction-internal pure calls execute on the host"})).map_err(|e|e.to_string())?)?;
    write(
        &output.join("plan.json"),
        ink_core::registry::canonical(plan.package())?,
    )
}
