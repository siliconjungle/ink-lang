//! Literal WebGPU lowering. Eligibility is a backend capability check, not an
//! optimisation theorem. Every source collection stage remains a separate stage.
use crate::{check, core, native, syntax::*, LangResult};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs, path::Path};

fn kind(t: &Type) -> LangResult<String> {
    Ok(match t {
        Type::U32 => "u32".into(),
        Type::U64 => "u64".into(),
        Type::Bool => "bool".into(),
        Type::List(t) if check::is_word(t) => format!("list_{}", kind(t)?),
        _ => {
            return Err(
                "GPU bundle CPU ABI supports word/Bool results and word-list/scalar parameters"
                    .into(),
            )
        }
    })
}
struct Scalar<'a> {
    p: &'a Program,
    next: usize,
    lines: String,
    remaining: usize,
}
impl Scalar<'_> {
    fn emit(
        &mut self,
        e: &Expr,
        env: &BTreeMap<String, (String, Type)>,
        want: &Type,
    ) -> LangResult<String> {
        if self.remaining == 0 {
            return Err("shader expression budget exceeded".into());
        }
        self.remaining -= 1;
        let types = env
            .iter()
            .map(|(n, (_, t))| (n.clone(), t.clone()))
            .collect();
        let ty = check::infer_as(e, &types, self.p, want)?;
        if !matches!(ty, Type::U32 | Type::Bool) {
            return Err("GPU scalar expressions require u32/Bool".into());
        }
        match e {
            Expr::Num(n) if ty == Type::U32 => Ok(format!("{n}u")),
            Expr::Bool(b) => Ok(b.to_string()),
            Expr::Var(n) => env
                .get(n)
                .map(|(x, _)| x.clone())
                .ok_or_else(|| format!("GPU unknown binding {n}")),
            Expr::Binary(op, a, b) => {
                let operand = if check::is_word(&ty) {
                    ty
                } else {
                    check::hint(a, &types, self.p)
                        .or_else(|| check::hint(b, &types, self.p))
                        .unwrap_or(Type::Bool)
                };
                let x = self.emit(a, env, &operand)?;
                // Statements in choose/calls must retain source branch laziness.
                if op == "&&" || op == "||" {
                    let tmp = format!("ink_tmp_{}", self.next);
                    self.next += 1;
                    self.lines.push_str(&format!(
                        "var {tmp}:bool={x};\nif ({}{}) {{\n",
                        if op == "||" { "!" } else { "" },
                        tmp
                    ));
                    let y = self.emit(b, env, &operand)?;
                    self.lines.push_str(&format!("{tmp}={y};\n}}\n"));
                    Ok(tmp)
                } else {
                    let y = self.emit(b, env, &operand)?;
                    Ok(format!("({x} {op} {y})"))
                }
            }
            Expr::Call(n, args) if n == "choose" => {
                let c = self.emit(&args[0], env, &Type::Bool)?;
                let tmp = format!("ink_tmp_{}", self.next);
                self.next += 1;
                let t = if ty == Type::Bool { "bool" } else { "u32" };
                self.lines
                    .push_str(&format!("var {tmp}:{t};\nif ({c}) {{\n"));
                let a = self.emit(&args[1], env, &ty)?;
                self.lines.push_str(&format!("{tmp}={a};\n}} else {{\n"));
                let b = self.emit(&args[2], env, &ty)?;
                self.lines.push_str(&format!("{tmp}={b};\n}}\n"));
                Ok(tmp)
            }
            Expr::Call(n, args) => {
                let f = self
                    .p
                    .functions
                    .iter()
                    .find(|f| &f.name == n)
                    .ok_or("GPU aggregate/nested collection is outside scalar shader subset")?
                    .clone();
                let mut local = BTreeMap::new();
                for (arg, (name, t)) in args.iter().zip(&f.params) {
                    let v = self.emit(arg, env, t)?;
                    let tmp = format!("ink_tmp_{}", self.next);
                    self.next += 1;
                    self.lines.push_str(&format!(
                        "let {tmp}:{}={v};\n",
                        if *t == Type::Bool { "bool" } else { "u32" }
                    ));
                    local.insert(name.clone(), (tmp, t.clone()));
                }
                self.emit(&f.body, &local, &f.result)
            }
            _ => {
                Err("GPU scalar subset excludes nested lists, folds and non-u32 arithmetic".into())
            }
        }
    }
}
const STAGE_BINDINGS:&str="@group(0) @binding(0) var<storage,read> input_data:array<u32>;\n@group(0) @binding(1) var<storage,read_write> output_data:array<u32>;\n@group(0) @binding(2) var<storage,read> input_length:u32;\n@group(0) @binding(3) var<storage,read_write> output_length:u32;\n@group(0) @binding(4) var<storage,read> params:array<u32>;\n";
fn stages(
    p: &Program,
    f: &Function,
    e: &Expr,
    env: &BTreeMap<String, (String, Type)>,
    out: &mut Vec<(String, String)>,
    want: Option<&Type>,
) -> LangResult<usize> {
    // Context reaches a filter receiver, but never a map receiver. Validate
    // the original checked intermediate width before emitting a u32 stage.
    let types = check::params_env(&f.params)?;
    if check::infer_context(e, &types, p, want)? != Type::List(Box::new(Type::U32)) {
        return Err("GPU pipeline requires u32 at every intermediate stage".into());
    }
    match e {
        Expr::Var(n) => {
            let i = f
                .params
                .iter()
                .position(|(name, _)| name == n)
                .ok_or("GPU list root must be a parameter")?;
            if f.params[i].1 != Type::List(Box::new(Type::U32)) {
                return Err("GPU list elements must be u32".into());
            }
            Ok(i)
        }
        Expr::Method(xs, method, args) if method == "map" || method == "filter" => {
            let root = stages(
                p,
                f,
                xs,
                env,
                out,
                if method == "filter" { want } else { None },
            )?;
            let Expr::Lambda(var, body) = &args[0] else {
                return Err("GPU stage lambda missing".into());
            };
            let mut local = env.clone();
            local.insert(var.clone(), ("input_data[gid.x]".into(), Type::U32));
            let mut scalar = Scalar {
                p,
                next: 0,
                lines: String::new(),
                remaining: 10_000,
            };
            let value = scalar.emit(
                body,
                &local,
                if method == "filter" {
                    &Type::Bool
                } else {
                    &Type::U32
                },
            )?;
            let shader = if method == "map" {
                format!("{STAGE_BINDINGS}\n@compute @workgroup_size(256) fn main(@builtin(global_invocation_id) gid:vec3<u32>) {{\nif(gid.x==0u){{output_length=input_length;}}\nif(gid.x<input_length){{\n{}output_data[gid.x]={value};\n}}\n}}",scalar.lines)
            } else {
                format!("{STAGE_BINDINGS}\n@group(0) @binding(5) var<storage,read_write> prefixes:array<u32>;\n@group(0) @binding(6) var<storage,read_write> counts:array<u32>;\nvar<workgroup> scan:array<u32,256>;\n@compute @workgroup_size(256) fn main(@builtin(global_invocation_id) gid:vec3<u32>,@builtin(local_invocation_id) lid:vec3<u32>,@builtin(workgroup_id) group:vec3<u32>) {{\nvar selected=0u;\nif(gid.x<input_length){{\n{}if({value}){{selected=1u;}}\n}}\nscan[lid.x]=selected;\nworkgroupBarrier();\nfor(var stride=1u;stride<256u;stride*=2u){{\nvar previous=0u;if(lid.x>=stride){{previous=scan[lid.x-stride];}}\nworkgroupBarrier();scan[lid.x]+=previous;workgroupBarrier();\n}}\nif(gid.x<input_length){{prefixes[gid.x]=scan[lid.x];}}\nif(lid.x==255u){{counts[group.x]=scan[255];}}\n}}",scalar.lines)
            };
            out.push((method.clone(), shader));
            Ok(root)
        }
        _ => Err(
            "GPU requires a literal map/filter pipeline rooted in one List<u32> parameter".into(),
        ),
    }
}
fn candidate(p: &Program, f: &Function) -> LangResult<(Value, Vec<(String, String)>)> {
    if f.params
        .iter()
        .filter(|(_, t)| matches!(t, Type::List(_)))
        .count()
        != 1
        || f.params.iter().any(|(_, t)| {
            !matches!(t, Type::U32 | Type::Bool) && *t != Type::List(Box::new(Type::U32))
        })
    {
        return Err("GPU candidate requires one List<u32> and u32/Bool scalar parameters".into());
    }
    let Expr::Call(aggregate, args) = &f.body else {
        return Err("GPU candidate must return sum or count".into());
    };
    if !["sum", "count"].contains(&aggregate.as_str()) {
        return Err(
            "GPU currently supports sum/count results; order-sensitive folds stay on CPU".into(),
        );
    }
    if aggregate == "sum" && f.result != Type::U32 || aggregate == "count" && f.result != Type::U64
    {
        return Err("GPU aggregate result type mismatch".into());
    }
    let env = f
        .params
        .iter()
        .enumerate()
        .filter(|(_, (_, t))| !matches!(t, Type::List(_)))
        .map(|(i, (n, t))| {
            (
                n.clone(),
                (
                    if *t == Type::Bool {
                        format!("(params[{i}] != 0u)")
                    } else {
                        format!("params[{i}]")
                    },
                    t.clone(),
                ),
            )
        })
        .collect();
    let mut output = Vec::new();
    let list_want = Type::List(Box::new(Type::U32));
    let list_param = stages(
        p,
        f,
        &args[0],
        &env,
        &mut output,
        if aggregate == "sum" {
            Some(&list_want)
        } else {
            None
        },
    )?;
    Ok((
        json!({"list_param":list_param,"aggregate":aggregate}),
        output,
    ))
}
fn put(dir: &Path, name: &str, bytes: impl AsRef<[u8]>) -> LangResult<()> {
    fs::write(dir.join(name), bytes).map_err(|e| e.to_string())
}

/// Emit browser and standalone native host code with the same WGSL primitives.
/// The native project links generated C for CPU fallback, never an interpreter.
pub fn emit(p: &Program, dir: &Path) -> LangResult<()> {
    let checked = core::CheckedModule::from_source(p.clone())?;
    checked.pure_program()?;
    let mut c = native::emit(p)?;
    c.push_str("\nuint64_t ink_cpu_call(uint32_t function,const void *const *lists,const size_t *lengths,const uint64_t *scalars){\n(void)lists;(void)lengths;(void)scalars;\nswitch(function){\n");
    let mut files = Vec::new();
    let mut functions = Vec::new();
    for (index, f) in p.functions.iter().enumerate() {
        let params = f
            .params
            .iter()
            .map(|(n, t)| Ok(json!({"name":n,"type":kind(t)?})))
            .collect::<LangResult<Vec<_>>>()?;
        let mut args = Vec::new();
        for (i, (_, t)) in f.params.iter().enumerate() {
            args.push(match t {
                Type::List(inner) => format!(
                    "(const {}*)lists[{i}], lengths[{i}]",
                    if **inner == Type::U32 {
                        "uint32_t"
                    } else {
                        "uint64_t"
                    }
                ),
                Type::U32 => format!("(uint32_t)scalars[{i}]"),
                Type::U64 => format!("scalars[{i}]"),
                Type::Bool => format!("(bool)scalars[{i}]"),
                _ => return Err("unsupported CPU ABI parameter".into()),
            });
        }
        c.push_str(&format!(
            "case {index}:return (uint64_t)lang_fn_{}({});\n",
            f.name,
            args.join(",")
        ));
        let (gpu, reason) = match candidate(p, f) {
            Ok((mut metadata, stages)) => {
                let mut descriptors = Vec::new();
                for (stage, (kind, shader)) in stages.into_iter().enumerate() {
                    let name = format!("function_{index}_stage_{stage}.wgsl");
                    descriptors.push(json!({"kind":kind,"shader":name}));
                    files.push((name, shader));
                }
                metadata["stages"] = json!(descriptors);
                (metadata, Value::Null)
            }
            Err(reason) => (Value::Null, json!(reason)),
        };
        functions.push(json!({"name":f.name,"index":index,"params":params,"result":kind(&f.result)?,"gpu":gpu,"cpu_reason":reason}));
    }
    c.push_str("default:lang_fail();return 0;\n}\n}\n");
    files.extend([
        (
            "sum.wgsl".into(),
            include_str!("../runtime/gpu-sum.wgsl").into(),
        ),
        (
            "count.wgsl".into(),
            include_str!("../runtime/gpu-count.wgsl").into(),
        ),
        (
            "filter-offsets.wgsl".into(),
            include_str!("../runtime/gpu-filter-offsets.wgsl").into(),
        ),
        (
            "filter-scatter.wgsl".into(),
            include_str!("../runtime/gpu-filter-scatter.wgsl").into(),
        ),
    ]);
    let manifest = json!({"schema":1,"backend":"webgpu-wgpu-v1","core_semantics":core::SEMANTICS,"core_sha256":checked.identity()?,"cpu_c_sha256":format!("{:x}",Sha256::digest(c.as_bytes())),"functions":functions,"shaders":files.iter().map(|(n,s)|(n.clone(),format!("{:x}",Sha256::digest(s.as_bytes())))).collect::<BTreeMap<_,_>>(),"trust":["Rust type checker","literal C and WGSL lowering","parallel u32 sum and stable filter primitives","C/LLVM and wgpu/WebGPU shader toolchains and drivers","host ABI and runtime"],"proof_claim":"no GPU backend or shader correctness proof; no new optimisation laws; literal source stages retained","selection":"bounded host-side measurements, including allocation/upload/dispatch/readback; correctness independent of profiles","limitations":["GPU subset: u32 map/filter followed by sum/count, one list and u32/Bool scalars","u64, exact integers, nested collections, order-sensitive folds and transactions remain on CPU","GPU unavailable, device loss, limits or validation errors fall back to compiled CPU","no universal performance or all-device GPU guarantee"]});
    fs::create_dir_all(dir.join("native/src")).map_err(|e| e.to_string())?;
    let manifest = serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?;
    put(dir, "manifest.json", &manifest)?;
    put(dir, "cpu.c", &c)?;
    put(dir, "ink-gpu.mjs", include_str!("../runtime/ink-gpu.mjs"))?;
    put(
        dir,
        "native/Cargo.toml",
        include_str!("../runtime/gpu-native/Cargo.toml"),
    )?;
    put(
        dir,
        "native/Cargo.lock",
        include_str!("../runtime/gpu-native/Cargo.lock"),
    )?;
    put(
        dir,
        "native/build.rs",
        include_str!("../runtime/gpu-native/build.rs"),
    )?;
    put(
        dir,
        "native/src/lib.rs",
        include_str!("../runtime/gpu-native/src/lib.rs"),
    )?;
    put(
        dir,
        "native/src/main.rs",
        include_str!("../runtime/gpu-native/src/main.rs"),
    )?;
    put(dir, "native/cpu.c", c)?;
    let mut assets =
        format!("pub const MANIFEST:&str={manifest:?};\npub const SHADERS:&[(&str,&str)]=&[\n");
    for (name, shader) in files {
        assets.push_str(&format!("({name:?},{shader:?}),\n"));
        put(dir, &name, shader)?;
    }
    assets.push_str("];\n");
    put(dir, "native/src/assets.rs", assets)?;
    Ok(())
}
