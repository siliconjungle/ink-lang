//! Rust protocol implementation for a core-checked machine plan.
use crate::{definition_native, library::Bundle, logic::Sort, LangResult};
use ink_core::machine::{Obligation, Package, SEMANTICS};
use serde::Serialize;
use sha2::{Digest, Sha256};
#[derive(Debug, Serialize)]
pub struct Evidence {
    pub schema: u32,
    pub semantics: String,
    pub package_sha256: String,
    pub source_sha256: String,
    pub definition: definition_native::Receipt,
    pub obligations: Vec<Obligation>,
    pub scope: String,
}
pub struct Emission {
    pub source: String,
    pub evidence: Evidence,
}
fn rust_argument(s: &Sort, n: &str) -> String {
    format!("{}{n}", if matches!(s, Sort::Data(_)) { "&" } else { "" })
}
fn result_value(sort: &Sort, n: &str) -> String {
    definition_native::encode_value(sort, n, false)
}
fn decode_args(args: &[Sort]) -> String {
    args.iter()
        .enumerate()
        .map(|(i, s)| {
            format!(
                "let a{i}={};",
                definition_native::decode_value(s, &format!("&args[{i}]"))
            )
        })
        .collect()
}
fn rust_args(args: &[Sort]) -> String {
    args.iter()
        .enumerate()
        .map(|(i, s)| rust_argument(s, &format!("a{i}")))
        .collect::<Vec<_>>()
        .join(",")
}

pub fn emit(bundle: &Bundle, package: &Package) -> LangResult<Emission> {
    let checked = ink_core::machine::check(bundle, package)?;
    lower(&checked)
}
pub fn lower(checked: &ink_core::machine::CheckedMachine) -> LangResult<Emission> {
    let package = checked.package();
    let l = &package.logical_state;
    let p = &package.physical_state;
    let op_signatures = checked.operations();
    let query_signatures = checked.queries();
    let mut emitted = definition_native::lower(checked.definition())?;
    let state = definition_native::ty(p)?;
    let logical = definition_native::decode_value(l, "logical");
    let input = rust_argument(l, "input");
    let physical = rust_argument(p, "self.state");
    let snapshot = result_value(l, "result");
    emitted.source.push_str(&format!("\npub struct Machine {{ state: {state} }}\nimpl Machine {{\npub fn new(logical: &Value) -> Result<Self,&'static str> {{ validate_inputs(std::slice::from_ref(logical))?; let input={logical}; Ok(Self {{state:f_{}({input})}}) }}\npub fn snapshot(&self) -> Value {{ let result=f_{}({physical}); {snapshot} }}\npub fn restore(&mut self, logical: &Value) -> Result<(),&'static str> {{ let next=Self::new(logical)?; *self=next; Ok(()) }}\n",package.encode,package.decode));
    emitted.source.push_str("pub fn apply(&mut self, name: &str, args: &[Value]) -> Result<Value,&'static str> { validate_inputs(args)?; match name {\n");
    for (op, (args, result)) in package.operations.iter().zip(op_signatures) {
        let sep = if args.is_empty() { "" } else { "," };
        let inputs = rust_args(args);
        let ds = decode_args(args);
        let output = result_value(result, "reply");
        emitted.source.push_str(&format!("\"{}\" if args.len()=={} => {{ {ds} let reply=f_{}({physical}{sep}{inputs}); let next=f_{}({physical}{sep}{inputs}); self.state=next; Ok({output}) }},\n",op.name,args.len(),op.physical_reply,op.physical_step));
    }
    emitted.source.push_str("_=>Err(\"unknown machine operation or argument count mismatch\") } }\npub fn query(&self, name: &str, args: &[Value]) -> Result<Value,&'static str> { validate_inputs(args)?; match name {\n");
    for (q, (args, result)) in package.queries.iter().zip(query_signatures) {
        let sep = if args.is_empty() { "" } else { "," };
        let inputs = rust_args(args);
        let ds = decode_args(args);
        let output = result_value(result, "result");
        emitted.source.push_str(&format!("\"{}\" if args.len()=={} => {{ {ds} let result=f_{}({physical}{sep}{inputs}); Ok({output}) }},\n",q.name,args.len(),q.physical));
    }
    emitted
        .source
        .push_str("_=>Err(\"unknown machine query or argument count mismatch\") } }\n}\n");
    if emitted.source.len() > 16_000_000 {
        return Err("machine source size limit".into());
    }
    let source_sha256 = format!("{:x}", Sha256::digest(emitted.source.as_bytes()));
    let evidence=Evidence {schema:1,semantics:SEMANTICS.into(),package_sha256:format!("{:x}",Sha256::digest(serde_json::to_vec(package).map_err(|e|e.to_string())?)),source_sha256,definition:emitted.receipt,obligations:checked.obligations().to_vec(),scope:"sequential mathematical state/reply/query/snapshot refinement; sealed physical state; exact checked bodies; trusted protocol, codecs and Rust/LLVM lowering; host failures, durability, concurrency, execution costs and actual Ink source actions remain outside this admission domain".into()};
    Ok(Emission {
        source: emitted.source,
        evidence,
    })
}
