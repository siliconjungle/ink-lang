//! Fixed source-shape codec for removing a record wrapper. Strategy and proof
//! construction are external. The payload uses the existing source value domain,
//! including unbounded strings/integers and finite recursive values.
use crate::{
    action_model,
    core::CheckedModule,
    logic::{self, Declaration, Sort, Term},
    registry, LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Schema {
    pub record: String,
    pub field: String,
    pub payload: Sort,
    pub wrapper: String,
    pub encode: String,
    pub decode: String,
    pub entries: BTreeMap<String, registry::Entry>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Layout {
    pub record: String,
    pub knowledge: registry::Bundle,
    pub roundtrip: String,
    pub inverse: String,
}
fn var(n: &str) -> Term {
    Term::Var(n.into())
}
fn call(f: &str, argument: Term) -> Term {
    Term::Call {
        function: f.into(),
        arguments: vec![argument],
    }
}
fn add(entries: &mut BTreeMap<String, registry::Entry>, d: Declaration) -> LangResult<String> {
    let entry = registry::Entry::from_declaration(&d, entries.keys().cloned().collect())?;
    let id = registry::identity(&entry)?;
    entries.insert(id.clone(), entry);
    Ok(id)
}
pub fn schema(module: &CheckedModule, record: &str) -> LangResult<Schema> {
    let fields = module
        .program()
        .records
        .get(record)
        .ok_or("record codec source record missing")?;
    let [(field, ty)] = fields.as_slice() else {
        return Err("record elision requires exactly one field".into());
    };
    if crate::local_collections::owned(ty, module.program()) {
        return Err("record elision requires a first-order immutable payload".into());
    }
    let carrier = action_model::value_carrier(module, ty)?;
    let mut entries = carrier.objects;
    let wrapper = add(
        &mut entries,
        Declaration::Datatype {
            constructors: vec![logic::Constructor {
                name: "Wrapper".into(),
                fields: vec![carrier.sort.clone()],
            }],
        },
    )?;
    let encode = add(
        &mut entries,
        Declaration::Function {
            params: vec![("wrapped".into(), Sort::Data(wrapper.clone()))],
            result: carrier.sort.clone(),
            body: Term::Match {
                scrutinee: Box::new(var("wrapped")),
                branches: vec![logic::Branch {
                    bindings: vec!["payload".into()],
                    body: var("payload"),
                }],
            },
            recursive: None,
        },
    )?;
    let decode = add(
        &mut entries,
        Declaration::Function {
            params: vec![("payload".into(), carrier.sort.clone())],
            result: Sort::Data(wrapper.clone()),
            body: Term::Construct {
                datatype: wrapper.clone(),
                constructor: 0,
                arguments: vec![var("payload")],
            },
            recursive: None,
        },
    )?;
    Ok(Schema {
        record: record.into(),
        field: field.clone(),
        payload: carrier.sort,
        wrapper,
        encode,
        decode,
        entries,
    })
}
pub fn check(module: &CheckedModule, layout: &Layout) -> LangResult<()> {
    let schema = schema(module, &layout.record)?;
    let context = registry::CheckedBundle::check(&layout.knowledge)?.first_order_context()?;
    for (id, entry) in &schema.entries {
        let d = serde_json::from_value(entry.payload["declaration"].clone())
            .map_err(|e| e.to_string())?;
        context.matches_definition(id, &d)?;
    }
    for (name, sort, from, to, theorem) in [
        (
            "wrapped",
            Sort::Data(schema.wrapper.clone()),
            call(&schema.decode, call(&schema.encode, var("wrapped"))),
            var("wrapped"),
            &layout.roundtrip,
        ),
        (
            "payload",
            schema.payload.clone(),
            call(&schema.encode, call(&schema.decode, var("payload"))),
            var("payload"),
            &layout.inverse,
        ),
    ] {
        context.check(
            &[(name.into(), sort)],
            &[],
            &from,
            &to,
            &logic::Proof::Use {
                theorem: theorem.clone(),
                arguments: vec![var(name)],
                premises: vec![],
            },
        )?;
    }
    Ok(())
}
