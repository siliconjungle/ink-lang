//! Literal folds over private values. Host algebras receive scalars and their
//! own child results, never private records, sums or collections.
use super::quote;
use ink_core::LangResult;
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};

pub(super) struct Reductions<'a> {
    elisions: &'a BTreeSet<String>,
    sums: &'a super::sum_layout::Sums,
    native_f32: bool,
    indices: BTreeMap<String, usize>,
    nodes: Vec<Value>,
    functions: Vec<String>,
}

impl<'a> Reductions<'a> {
    pub fn new(
        elisions: &'a BTreeSet<String>,
        sums: &'a super::sum_layout::Sums,
        native_f32: bool,
    ) -> Self {
        Self {
            elisions,
            sums,
            native_f32,
            indices: BTreeMap::new(),
            nodes: vec![],
            functions: vec![],
        }
    }
    pub fn compile(&mut self, ty: &Value, named: &Value) -> LangResult<usize> {
        if ty["kind"] == "ref" {
            return self.compile(
                &named[ty["name"].as_str().ok_or("reduction reference")?],
                named,
            );
        }
        let key = serde_json::to_string(ty).map_err(|e| e.to_string())?;
        if let Some(index) = self.indices.get(&key) {
            return Ok(*index);
        }
        if self.nodes.len() >= 4096 {
            return Err("reduction schema limit".into());
        }
        let index = self.nodes.len();
        self.indices.insert(key, index);
        self.nodes.push(Value::Null);
        self.functions.push(String::new());
        let kind = ty["kind"].as_str().ok_or("reduction kind")?;
        let mut node = json!({"kind":kind,"children":[]});
        if let Some(name) = ty["name"].as_str() {
            node["name"] = json!(name);
        }
        let (bytes, body) = match kind {
            "unit" => (4, format!("return r[{index}](null,c);")),
            "bool" | "u32" | "i32" | "u64" => (if kind == "bool" {5} else if kind == "u64" {12} else {8}, format!("return r[{index}](value,c);")),
            "f32" => (8, format!("return r[{index}]({{F32Bits:{}}},c);", if self.native_f32 {"__nfBits(value)"} else {"value"})),
            "int" => (4, format!("const text=typeof value==='bigint'?value.toString():value.Int;b.text(text);return r[{index}]({{Int:text}},c);")),
            "string" | "id" | "enum" => (4, format!("b.text(value);return r[{index}](value,c);")),
            "record" => {
                let mut children = vec![];
                let mut labels = vec![];
                let mut arguments = vec![];
                for field in ty["fields"].as_array().ok_or("reduction fields")? {
                    let child = self.compile(&field["type"], named)?;
                    let label = field["name"].as_str().ok_or("reduction field name")?;
                    let input = if ty["name"].as_str().is_some_and(|n| self.elisions.contains(n)) { "value".into() } else { format!("value[{}]", quote(label)) };
                    children.push(child); labels.push(label);
                    arguments.push(format!("__reduceValue{child}({input},r,b,d+1,c)"));
                }
                node["children"] = json!(children); node["fields"] = json!(labels);
                arguments.push("c".into());
                (4, format!("return r[{index}]({});", arguments.join(",")))
            }
            "list" | "vector" => {
                let child = self.compile(&ty["element"], named)?;
                node["children"] = json!([child]);
                (8, format!("const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[{index}];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue{child}(value[i],r,b,d+1,c),i,c);return a.finish(out,c);"))
            }
            "option" => {
                let child = self.compile(&ty["element"], named)?;
                node["children"] = json!([child]);
                (5, format!("return Object.hasOwn(value,'None')&&value.None===null?r[{index}](0,null,c):r[{index}](1,__reduceValue{child}(value.Some,r,b,d+1,c),c);"))
            }
            "result" => {
                let yes = self.compile(&ty["ok"], named)?;
                let no = self.compile(&ty["error"], named)?;
                node["children"] = json!([yes,no]);
                if self.sums.selected(ty) {
                    let leaves = super::sum_layout::Sums::leaves(ty);
                    let count = leaves.len()-1;
                    let mut cases = String::new();
                    for (tag, leaf) in leaves.iter().enumerate() {
                        let child = self.compile(leaf, named)?;
                        let levels = if tag<count {tag+1} else {count};
                        let charges = (1..levels).map(|level| format!("b.enter(d+{level},5);")).collect::<String>();
                        let mut chain = vec![index];
                        let mut tail = ty;
                        for _ in 1..levels { tail=&tail["error"]; chain.push(self.compile(tail,named)?); }
                        let mut result = format!("__reduceValue{child}(value.payload,r,b,d+{levels},c)");
                        for (level, reducer) in chain.iter().enumerate().rev() {
                            let branch = if tag<count && level==tag {0} else {1};
                            result = format!("r[{reducer}]({branch},{result},c)");
                        }
                        cases.push_str(&format!("case {tag}:{{{charges}return {result};}}"));
                    }
                    (5, format!("switch(value.tag){{{cases}default:throw Error('private sum tag');}}"))
                } else {
                    (5, format!("return Object.hasOwn(value,'Ok')?r[{index}](0,__reduceValue{yes}(value.Ok,r,b,d+1,c),c):r[{index}](1,__reduceValue{no}(value.Err,r,b,d+1,c),c);"))
                }
            }
            _ => return Err("unsupported reduction type".into()),
        };
        self.nodes[index] = node;
        self.functions[index] =
            format!("function __reduceValue{index}(value,r,b,d,c){{b.enter(d,{bytes});{body}}}\n");
        Ok(index)
    }
    pub fn source(&self) -> String {
        let nodes = self
            .nodes
            .iter()
            .map(|node| {
                let mut fields = node
                    .as_object()
                    .unwrap()
                    .iter()
                    .map(|(key, value)| {
                        let encoded = value.to_string();
                        format!(
                            "{}:{}",
                            quote(key),
                            if value.is_array() {
                                format!("Object.freeze({encoded})")
                            } else {
                                encoded
                            }
                        )
                    })
                    .collect::<Vec<_>>();
                fields.sort();
                format!("Object.freeze({{{}}})", fields.join(","))
            })
            .collect::<Vec<_>>()
            .join(",");
        self.functions.join("") + &format!("let __reductionNodeCache;function __reductionNodes(){{return __reductionNodeCache??=Object.freeze([{nodes}]);}}\n")
    }
}
