//! Literal owned public copies of already well-typed private results.
use super::{descriptor, quote};
use ink_core::{syntax::{Program, Type}, LangResult};
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

pub(super) struct OwnedValues<'a> {
    program: &'a Program,
    elisions: BTreeSet<String>,
    sums:super::sum_layout::Sums,
    native_f32: bool,
    functions: BTreeMap<String, (String, String)>,
}
impl<'a> OwnedValues<'a> {
    pub fn private(program: &'a Program,elisions:&BTreeSet<String>,native_f32:bool) -> Self {
        Self{program,elisions:elisions.clone(),sums:Default::default(),native_f32,functions:BTreeMap::new()}
    }
    pub fn with_sums(mut self,sums:&super::sum_layout::Sums)->Self{self.sums=sums.clone();self}
    pub fn source(&self) -> String { self.functions.values().map(|(_, code)| code.as_str()).collect() }
    pub fn for_type(&mut self, ty: &Type) -> LangResult<String> {
        let original = self.functions.len();
        let result = self.compile(&descriptor(ty, self.program, &mut BTreeSet::new())?);
        if result.is_err() {
            self.functions.retain(|_, (name, _)| name.trim_start_matches("__ownedValue").parse::<usize>().is_ok_and(|index| index < original));
        }
        result
    }
    fn compile(&mut self, ty: &Value) -> LangResult<String> {
        let key = serde_json::to_string(ty).map_err(|e| e.to_string())?;
        if let Some((name, _)) = self.functions.get(&key) { return Ok(name.clone()); }
        if self.functions.len() >= 4096 { return Err("owned value schema limit".into()); }
        let name = format!("__ownedValue{}", self.functions.len());
        self.functions.insert(key.clone(), (name.clone(), String::new()));
        let (bytes, body) = match ty["kind"].as_str().ok_or("owned value kind")? {
            "ref" => {
                let target = ty["name"].as_str().ok_or("owned value reference")?;
                let next = self.compile(&descriptor(&Type::Named(target.into()), self.program, &mut BTreeSet::new())?)?;
                self.functions.insert(key, (name.clone(), format!("function {name}(value,budget,depth){{return {next}(value,budget,depth);}}\n")));
                return Ok(name);
            }
            "unit" => (4, "return null;".into()),
            "bool" => (5, "return value;".into()),
            "u32" => (8, "return value>>>0;".into()),
            "i32" => (8, "return value|0;".into()),
            "u64" => (12, "return BigInt(value);".into()),
            "f32" => (8, if !self.native_f32 {"return {F32Bits:value===0?0:value};".into()} else {"const bits=typeof value==='number'?__bits(value):value.F32Bits;return {F32Bits:bits===0?0:bits};".into()}),
            "f64" => (12,"return {F64Bits:__dfBits(value).toString()};".into()),
            "int" => (4, "const text=typeof value==='bigint'?value.toString():value.Int;budget.text(text);return {Int:text};".into()),
            "string" | "id" | "enum" => (4, "budget.text(value);return value;".into()),
            "record" => {
                let mut fields = Vec::new();
                for field in ty["fields"].as_array().ok_or("owned record fields")? {
                    let label = quote(field["name"].as_str().ok_or("owned field name")?);
                    let next = self.compile(&field["type"])?;
                    let input=if ty["name"].as_str().is_some_and(|n|self.elisions.contains(n)){"value".into()}else{format!("value[{label}]")};
                    fields.push(format!("[{label}]:{next}({input},budget,depth+1)"));
                }
                (4, format!("return {{{}}};", fields.join(",")))
            }
            "list" | "vector" => {
                let next = self.compile(&ty["element"])?;
                (8, format!("const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]={next}(value[i],budget,depth+1);return out;"))
            }
            "option" => {
                let next = self.compile(&ty["element"])?;
                (5, format!("return Object.hasOwn(value,'None')&&value.None===null?{{None:null}}:{{Some:{next}(value.Some,budget,depth+1)}};"))
            }
            "result" => {
                if self.sums.selected(ty) {
                    let leaves=super::sum_layout::Sums::leaves(ty);let count=leaves.len()-1;let mut cases=String::new();
                    for (i,leaf) in leaves.iter().enumerate(){
                        let levels=if i<count{i+1}else{count};let next=self.compile(leaf)?;
                        let charges=(1..levels).map(|j|format!("budget.enter(depth+{j},5);")).collect::<String>();
                        let mut output=format!("{next}(value.payload,budget,depth+{levels})");
                        if i<count{output=format!("{{Ok:{output}}}");}
                        for _ in 0..i {output=format!("{{Err:{output}}}");}
                        cases.push_str(&format!("case {i}:{{{charges}return {output};}}"));
                    }
                    (5,format!("switch(value.tag){{{cases}default:throw Error('private sum tag');}}"))
                } else {
                    let yes = self.compile(&ty["ok"])?;let no = self.compile(&ty["error"])?;
                    (5,format!("return Object.hasOwn(value,'Ok')?{{Ok:{yes}(value.Ok,budget,depth+1)}}:{{Err:{no}(value.Err,budget,depth+1)}};"))
                }
            }
            _ => return Err("unsupported owned value type".into()),
        };
        let code = format!("function {name}(value,budget,depth){{budget.enter(depth,{bytes});{body}}}\n");
        self.functions.insert(key, (name.clone(), code));
        Ok(name)
    }
}
