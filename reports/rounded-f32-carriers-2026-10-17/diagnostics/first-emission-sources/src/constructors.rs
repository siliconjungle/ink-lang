//! Literal constructor plans for checked first-order source schemas. This is
//! boundary machinery, not program evaluation or implementation discovery.
use super::{quote, sum_layout::Sums, value_capture::Captures};
use ink_core::LangResult;
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

pub(super) struct Constructors<'a> {
    elisions: &'a BTreeSet<String>,
    sums: &'a Sums,
    nodes: BTreeMap<String, (usize, String)>,
}
impl<'a> Constructors<'a> {
    pub fn new(elisions: &'a BTreeSet<String>, sums: &'a Sums) -> Self {
        Self {
            elisions,
            sums,
            nodes: BTreeMap::new(),
        }
    }
    pub fn compile(
        &mut self,
        ty: &Value,
        named: &Value,
        captures: &mut Captures<'_>,
    ) -> LangResult<usize> {
        if ty["kind"] == "ref" {
            return self.compile(
                &named[ty["name"].as_str().ok_or("constructor reference")?],
                named,
                captures,
            );
        }
        let key = serde_json::to_string(ty).map_err(|e| e.to_string())?;
        if let Some((index, _)) = self.nodes.get(&key) {
            return Ok(*index);
        }
        if self.nodes.len() >= 4096 {
            return Err("constructor schema limit".into());
        }
        let index = self.nodes.len();
        self.nodes.insert(key.clone(), (index, String::new()));
        let pattern = |label: &str, children: Vec<usize>, extra: &str, bytes: u32, make: &str| {
            format!("{{bytes:{bytes},label:{},children:{},childDepth:1,{extra}charge:(budget,depth)=>{{budget.enter(depth,{bytes});}},make:values=>({make})}}",quote(label),serde_json::to_string(&children).unwrap())
        };
        let code = match ty["kind"].as_str().ok_or("constructor kind")? {
            "record" => {
                let fields = ty["fields"].as_array().ok_or("constructor fields")?;
                let children = fields
                    .iter()
                    .map(|f| self.compile(&f["type"], named, captures))
                    .collect::<LangResult<Vec<_>>>()?;
                let elided = ty["name"]
                    .as_str()
                    .is_some_and(|n| self.elisions.contains(n));
                let make = if elided {
                    if fields.len() != 1 {
                        return Err("constructor record correspondence".into());
                    }
                    "values[0]".into()
                } else {
                    format!(
                        "{{{}}}",
                        fields
                            .iter()
                            .enumerate()
                            .map(|(i, f)| Ok(format!(
                                "[{}]:values[{i}]",
                                quote(f["name"].as_str().ok_or("constructor field name")?)
                            )))
                            .collect::<LangResult<Vec<_>>>()?
                            .join(",")
                    )
                };
                format!(
                    "{{kind:'record',fields:{},patterns:[{}]}}",
                    serde_json::to_string(
                        &fields.iter().map(|f| f["name"].clone()).collect::<Vec<_>>()
                    )
                    .unwrap(),
                    pattern(
                        "record",
                        children,
                        if elided { "transparent:true," } else { "" },
                        4,
                        &make
                    )
                )
            }
            "list" | "vector" => {
                let child = self.compile(&ty["element"], named, captures)?;
                let size = if ty["kind"] == "vector" {
                    format!("size:{},", ty["size"])
                } else {
                    String::new()
                };
                format!(
                    "{{kind:{},patterns:[{}]}}",
                    quote(ty["kind"].as_str().unwrap()),
                    pattern(
                        "sequence",
                        vec![child],
                        &format!("sequence:true,{size}"),
                        8,
                        "values"
                    )
                )
            }
            "option" => {
                let child = self.compile(&ty["element"], named, captures)?;
                format!(
                    "{{kind:'option',patterns:[{},{}]}}",
                    pattern("None", vec![], "", 5, "{None:null}"),
                    pattern("Some", vec![child], "", 5, "{Some:values[0]}")
                )
            }
            "result" => {
                let a = self.compile(&ty["ok"], named, captures)?;
                let b = self.compile(&ty["error"], named, captures)?;
                format!(
                    "{{kind:'result',flat:{},patterns:[{},{}]}}",
                    if self.sums.selected(ty) {
                        "(tag,payload)=>({tag,payload})"
                    } else {
                        "null"
                    },
                    pattern(
                        "Ok",
                        vec![a],
                        "sumBranch:0,",
                        5,
                        &self.sums.make(ty, "Ok", "values[0]")
                    ),
                    pattern(
                        "Err",
                        vec![b],
                        "sumBranch:1,",
                        5,
                        &self.sums.make(ty, "Err", "values[0]")
                    )
                )
            }
            "unit" | "bool" | "u32" | "i32" | "u64" | "f32" | "f64" | "int" | "string" | "id" | "enum" => {
                let capture = captures.compile(ty, named)?;
                format!(
                    "{{kind:{},scalar:{capture}}}",
                    quote(ty["kind"].as_str().unwrap())
                )
            }
            _ => return Err("unsupported constructor schema".into()),
        };
        self.nodes.insert(key, (index, code));
        Ok(index)
    }
    pub fn source(&self) -> String {
        let mut nodes = self.nodes.values().collect::<Vec<_>>();
        nodes.sort_by_key(|(index, _)| *index);
        format!("let __constructorNodesValue;function __constructorNodes(){{return __constructorNodesValue??=[{}];}}\n{}",nodes.iter().map(|(_,code)|code.as_str()).collect::<Vec<_>>().join(","),include_str!("value_builder.mjs"))
    }
}
