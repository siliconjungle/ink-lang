//! Literal carriers selected by already checked source codecs. No discovery,
//! JSON recognition, proof authoring or profitability decisions live here.
use super::{descriptor, quote};
use ink_core::{
    syntax::{Program, Type},
    LangResult,
};
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};
#[derive(Clone, Default)]
pub(super) struct Sums {
    specs: BTreeMap<String, Value>,
}
fn nominal(t: &Value) -> Value {
    let kind = t["kind"].as_str().unwrap_or("");
    if kind == "ref" || kind == "record" && t["name"].is_string() {
        return json!(["named", t["name"]]);
    }
    match kind {
        "list" | "vector" | "option" => json!([kind, t["size"], nominal(&t["element"])]),
        "result" => json!([kind, nominal(&t["ok"]), nominal(&t["error"])]),
        "record" => json!([
            kind,
            t["fields"]
                .as_array()
                .unwrap()
                .iter()
                .map(|f| json!([f["name"], nominal(&f["type"])]))
                .collect::<Vec<_>>()
        ]),
        "enum" => json!([kind, t["variants"]]),
        _ => json!([kind]),
    }
}
impl Sums {
    pub fn new(p: &Program, types: &[Type]) -> LangResult<Self> {
        let mut specs = BTreeMap::new();
        for t in types {
            let d = descriptor(t, p, &mut BTreeSet::new())?;
            specs.insert(Self::key(&d), d);
        }
        Ok(Self { specs })
    }
    pub fn leaves(t: &Value) -> Vec<Value> {
        let mut out = Vec::new();
        let mut tail = t;
        while tail["kind"] == "result" {
            out.push(tail["ok"].clone());
            tail = &tail["error"];
        }
        out.push(tail.clone());
        out
    }
    pub fn contains_type(&self, p: &Program, t: &Type) -> LangResult<bool> {
        fn walk(s: &Sums, p: &Program, t: &Type, seen: &mut BTreeSet<String>) -> LangResult<bool> {
            if s.selected(&descriptor(t, p, &mut BTreeSet::new())?) {
                return Ok(true);
            }
            Ok(match t {
                Type::Named(n) if p.records.contains_key(n) && seen.insert(n.clone()) => {
                    let mut found = false;
                    for (_, child) in &p.records[n] {
                        found |= walk(s, p, child, seen)?;
                    }
                    found
                }
                Type::List(t) | Type::Vector(t, _) | Type::Option(t) | Type::Buffer(t) => {
                    walk(s, p, t, seen)?
                }
                Type::Result(a, b) | Type::Map(a, b) | Type::Table(a, b) => {
                    walk(s, p, a, seen)? || walk(s, p, b, seen)?
                }
                _ => false,
            })
        }
        if self.empty() {
            return Ok(false);
        }
        walk(self, p, t, &mut BTreeSet::new())
    }
    pub fn empty(&self) -> bool {
        self.specs.is_empty()
    }
    fn key(t: &Value) -> String {
        serde_json::to_string(&nominal(t)).unwrap()
    }
    pub fn key_if(&self, t: &Value) -> Option<String> {
        let key = Self::key(t);
        self.specs.contains_key(&key).then_some(key)
    }
    pub fn selected(&self, t: &Value) -> bool {
        self.specs.contains_key(&Self::key(t))
    }
    pub fn make(&self, t: &Value, tag: &str, value: &str) -> String {
        if self.selected(t) {
            format!(
                "__sumMake({},{} ,{value})",
                quote(&Self::key(t)),
                tag == "Ok"
            )
        } else {
            format!("({{{tag}:{value}}})")
        }
    }
    pub fn view(&self, t: &Value, value: &str) -> String {
        if self.selected(t) {
            format!("__sumView({},{value})", quote(&Self::key(t)))
        } else {
            value.into()
        }
    }
    pub fn make_type(&self, p: &Program, t: &Type, tag: &str, value: &str) -> LangResult<String> {
        Ok(self.make(&descriptor(t, p, &mut BTreeSet::new())?, tag, value))
    }
    pub fn view_type(&self, p: &Program, t: &Type, value: &str) -> LangResult<String> {
        Ok(self.view(&descriptor(t, p, &mut BTreeSet::new())?, value))
    }
    pub fn source(&self) -> String {
        if self.empty() {
            return String::new();
        }
        format!(
            "const __sumSpecs=new Map({});\n{}",
            serde_json::to_string(&self.specs.iter().collect::<Vec<_>>()).unwrap(),
            include_str!("sum_layout.mjs")
        )
    }
}
