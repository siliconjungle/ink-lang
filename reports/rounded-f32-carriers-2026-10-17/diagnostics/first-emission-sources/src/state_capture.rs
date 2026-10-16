//! Literal schema-directed input ownership. No source rewrite or strategy search.
use super::{descriptor, quote};
use ink_core::{syntax::{Program, Type}, LangResult};
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

pub(super) struct Captures<'a> {
    program: &'a Program,
    elisions: BTreeSet<String>,
    sums:super::sum_layout::Sums,
    functions: BTreeMap<String, (String, String)>,
}
impl<'a> Captures<'a> {
    // Primitive capture can execute literally in the parent's field loop. This
    // preserves the child charge/check order and creates no intermediate call.
    fn scalar(ty: &Value, input: &str, output: &str, depth: &str) -> Option<String> {
        let kind = ty["kind"].as_str()?;
        let check = match kind {
            "u32" | "i32" => {
                let (min,max) = if kind == "u32" { ("0","4294967295") } else { ("-2147483648","2147483647") };
                format!("if(typeof {output}!=='number'||!Number.isInteger({output})||{output}<{min}||{output}>{max})throw Error('invalid {kind}');if({output}===0){output}=0;")
            }
            "u64" => format!("{output}=__stateWord({output});"),
            "bool" => format!("if(typeof {output}!=='boolean')throw Error('invalid Bool');"),
            "unit" => format!("if({output}!==null)throw Error('invalid Unit');"),
            "string" => format!("if(typeof {output}!=='string'||!{output}.isWellFormed())throw Error('invalid String');"),
            _ => return None,
        };
        // Argument property access precedes entering the child capture, just as
        // it does for a normal function call (including exhausted budgets).
        Some(format!("let {output}={input};if({depth}>maxDepth||--budget.cells<0)throw Error('state input resource limit');{check}"))
    }
    pub fn new(program: &'a Program) -> Self {
        Self { program, elisions:BTreeSet::new(), sums:Default::default(), functions: BTreeMap::new() }
    }
    pub fn with_elisions(program: &'a Program, elisions:&BTreeSet<String>) -> Self {
        let mut result=Self::new(program);result.elisions=elisions.clone();result
    }
    pub fn with_sums(mut self,sums:&super::sum_layout::Sums)->Self{self.sums=sums.clone();self}
    pub fn source(&self) -> String {
        self.functions.values().map(|(_, code)| code.as_str()).collect()
    }
    pub fn for_type(&mut self, ty: &Type) -> LangResult<String> {
        self.compile(&descriptor(ty, self.program, &mut BTreeSet::new())?)
    }
    fn compile(&mut self, ty: &Value) -> LangResult<String> {
        let key = serde_json::to_string(ty).map_err(|e| e.to_string())?;
        if let Some((name, _)) = self.functions.get(&key) { return Ok(name.clone()); }
        if self.functions.len() >= 4096 { return Err("state input schema function limit".into()); }
        let name = format!("__ownedInput{}", self.functions.len());
        self.functions.insert(key.clone(), (name.clone(), String::new()));
        let kind = ty["kind"].as_str().ok_or("state input schema kind")?;
        let limit = "if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');";
        let mut prefix = limit.to_string();
        let body = match kind {
            "ref" => {
                let target = ty["name"].as_str().ok_or("state input reference name")?;
                let next = self.for_type(&Type::Named(target.into()))?;
                format!("return {next}(value,budget,depth+1,maxDepth);")
            }
            "u32" | "i32" | "u64" | "bool" | "unit" | "string" => {
                prefix.clear();
                let capture=Self::scalar(ty,"value","scalar","depth").ok_or("state input scalar")?;
                format!("{capture}return scalar;")
            }
            "record" => {
                let fields = ty["fields"].as_array().ok_or("state input record fields")?;
                let mut tests = Vec::new();let mut owned = Vec::new();let mut capture = String::new();
                for (i,field) in fields.iter().enumerate() {
                    let label = quote(field["name"].as_str().ok_or("state input field name")?);
                    tests.push(format!("!Object.hasOwn(value,{label})"));
                    let result = format!("field{i}");
                    if let Some(code) = Self::scalar(&field["type"], &format!("value[{label}]"), &result, "depth+1") {
                        capture.push_str(&code);
                    } else {
                        let next = self.compile(&field["type"])?;
                        capture.push_str(&format!("const {result}={next}(value[{label}],budget,depth+1,maxDepth);"));
                    }
                    // Computed properties preserve an ordinary own __proto__ field.
                    owned.push(format!("[{label}]:{result}"));
                }
                let required = if tests.is_empty() { String::new() } else { format!("||{}", tests.join("||")) };
                let output=if ty["name"].as_str().is_some_and(|n|self.elisions.contains(n)) {"field0".into()} else {format!("{{{}}}",owned.join(","))};
                format!("if(!value||typeof value!=='object'||Array.isArray(value){required})throw Error('invalid record');{capture}return {output};")
            }
            "list" | "vector" => {
                let next = self.compile(&ty["element"])?;
                let size = if kind == "vector" { format!("if(value.length!=={})throw Error('invalid vector length');", ty["size"]) } else { String::new() };
                format!("if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView)))throw Error('invalid list');{size}const out=new Array(value.length);for(let i=0;i<out.length;i++)out[i]={next}(value[i],budget,depth+1,maxDepth);return out;")
            }
            "result" if self.sums.selected(ty)=>{
                let leaves=super::sum_layout::Sums::leaves(ty);let count=leaves.len()-1;let mut body="let cursor=value;".to_string();
                for i in 0..count {
                    if i>0 {body.push_str(&format!("if(depth+{i}>maxDepth||--budget.cells<0)throw Error('state input resource limit');"));}
                    let next=self.compile(&leaves[i])?;
                    body.push_str(&format!("if(!cursor||typeof cursor!=='object'||Array.isArray(cursor))throw Error('invalid Result');const keys{i}=Object.keys(cursor);if(keys{i}.length!==1)throw Error('invalid Result');const tag{i}=keys{i}[0];if(tag{i}==='Ok')return {{tag:{i},payload:{next}(cursor.Ok,budget,depth+{},maxDepth)}};if(tag{i}!=='Err')throw Error('invalid Result');",i+1));
                    if i+1==count {let next=self.compile(&leaves[count])?;body.push_str(&format!("return {{tag:{count},payload:{next}(cursor.Err,budget,depth+{count},maxDepth)}};"));}else{body.push_str("cursor=cursor.Err;");}
                }
                body
            }
            "option" | "result" => {
                let (yes, no, a, b) = if kind == "option" {
                    ("Some", "None", self.compile(&ty["element"])?, None)
                } else { ("Ok", "Err", self.compile(&ty["ok"])?, Some(self.compile(&ty["error"])?)) };
                let err = if kind == "option" { "Option" } else { "Result" };
                let yes_value=self.sums.make(ty,yes,&format!("{a}(value.{yes},budget,depth+1,maxDepth)"));
                let otherwise=b.map(|next|{let value=self.sums.make(ty,no,&format!("{next}(value.{no},budget,depth+1,maxDepth)"));format!("if(tag==='{no}')return {value};")}).unwrap_or_else(||format!("if(tag==='{no}'&&value.{no}===null)return {{{no}:null}};"));
                format!("if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid {err}');const keys=Object.keys(value);if(keys.length!==1)throw Error('invalid {err}');const tag=keys[0];if(tag==='{yes}')return {yes_value};{otherwise}throw Error('invalid {err}');")
            }
            _ => {
                // Exact Int, wide words and raw float conversion share the fixed
                // scalar implementation, including its one node budget charge.
                prefix = format!("return __stateInput(value,__ownedType{},budget,depth,maxDepth);", name.trim_start_matches("__ownedInput"));
                String::new()
            }
        };
        let constant = if body.is_empty() { format!("const __ownedType{}={ty};\n", name.trim_start_matches("__ownedInput")) } else { String::new() };
        let code = format!("{constant}function {name}(value,budget={{cells:1000000}},depth=0,maxDepth=64){{{prefix}{body}}}\n");
        self.functions.insert(key, (name.clone(), code));
        Ok(name)
    }
}
