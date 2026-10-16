//! Literal materialisation with typed checks supplied to the shared ABI reader.
use super::quote;
use ink_core::LangResult;
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

pub(super) struct WireValues {
    elisions: BTreeSet<String>,
    sums:super::sum_layout::Sums,
    private: bool,
    native_f32: bool,
    functions: BTreeMap<String, (String, String)>,
}
impl WireValues {
    pub fn new() -> Self {
        Self {
            elisions: BTreeSet::new(),
            sums:Default::default(),
            private: false,
            native_f32: false,
            functions: BTreeMap::new(),
        }
    }
    pub fn private(elisions: &BTreeSet<String>, native_f32: bool) -> Self {
        Self {
            elisions: elisions.clone(),
            sums:Default::default(),
            private: true,
            native_f32,
            functions: BTreeMap::new(),
        }
    }
    pub fn with_sums(mut self,sums:&super::sum_layout::Sums)->Self{self.sums=sums.clone();self}
    pub fn source(&self) -> String {
        self.functions
            .values()
            .map(|(_, code)| code.as_str())
            .collect()
    }
    pub fn for_schema(&mut self, schema: &Value) -> LangResult<String> {
        let original = self.functions.len();
        let result = self.compile(&schema["root"], &schema["named"], true);
        if result.is_err() {
            self.functions.retain(|_, (name, _)| {
                name.trim_start_matches(if self.private {
                    "__privateWireValue"
                } else {
                    "__wireValue"
                })
                .parse::<usize>()
                .is_ok_and(|i| i < original)
            });
        }
        result
    }
    pub fn for_arguments_schema(&mut self, schema: &Value) -> LangResult<String> {
        self.compile(&schema["root"], &schema["named"], false)
    }
    fn compile(&mut self, ty: &Value, named: &Value, elide_root: bool) -> LangResult<String> {
        if ty["kind"] == "ref" {
            let target = ty["name"].as_str().ok_or("wire reference")?;
            return self.compile(&named[target], named, elide_root);
        }
        let key = serde_json::to_string(&(ty, elide_root)).map_err(|e| e.to_string())?;
        if let Some((name, _)) = self.functions.get(&key) {
            return Ok(name.clone());
        }
        if self.functions.len() >= 4096 {
            return Err("literal wire schema limit".into());
        }
        let name = format!(
            "{}{}",
            if self.private {
                "__privateWireValue"
            } else {
                "__wireValue"
            },
            self.functions.len()
        );
        self.functions
            .insert(key.clone(), (name.clone(), String::new()));
        let body = match ty["kind"].as_str().ok_or("wire kind")? {
            "unit" => "const value=null;".into(),
            "bool" => "const value=!!reader.byte();".into(),
            "u32" => "const value=reader.word();".into(),
            "i32" => "const value=reader.signed();".into(),
            "u64" => "const value=reader.wide();".into(),
            "f64" => if self.private{"const value=__dfFromBits(reader.wide());".into()}else{"const value={F64Bits:reader.wide().toString()};".into()},
            "f32" => {
                if self.private {
                    if self.native_f32 {
                        "const value=__nfFromBits(reader.word());".into()
                    } else {
                        "const value=reader.word();".into()
                    }
                } else {
                    "const value={F32Bits:reader.word()};".into()
                }
            }
            "int" => {
                if self.private {
                    "const value=BigInt(reader.text(end,'int'));".into()
                } else {
                    "const value={Int:reader.text(end,'int')};".into()
                }
            }
            "string" | "enum" | "id" => {
                let kind=ty["kind"].as_str().unwrap();
                let variants=if kind=="enum" {format!(",{name}Variants")} else {String::new()};
                format!("const value=reader.text(end,{}{variants});",quote(kind))
            },
            "record" => {
                if self.private
                    && elide_root
                    && ty["name"]
                        .as_str()
                        .is_some_and(|n| self.elisions.contains(n))
                {
                    let fields = ty["fields"].as_array().ok_or("private wire fields")?;
                    if fields.len() != 1 {
                        return Err("private wire record correspondence".into());
                    }
                    let child = self.compile(&fields[0]["type"], named, true)?;
                    let source=format!("function {name}(reader){{const end=reader.frame(),value={child}(reader);reader.finish(end);return value;}}\n");
                    self.functions.insert(key, (name.clone(), source));
                    return Ok(name);
                }
                let mut fields = Vec::new();
                for field in ty["fields"].as_array().ok_or("wire fields")? {
                    let key = quote(field["name"].as_str().ok_or("wire field name")?);
                    let next = self.compile(&field["type"], named, true)?;
                    fields.push(format!("[{key}]:{next}(reader)"));
                }
                format!("const value={{{}}};", fields.join(","))
            }
            "list" | "vector" => {
                let next = self.compile(&ty["element"], named, true)?;
                let size=if ty["kind"]=="vector" {ty["size"].to_string()} else {String::new()};
                format!("const n=reader.count({size}),value=new Array(n);for(let i=0;i<n;i++)value[i]={next}(reader);")
            }
            "option" => {
                let next = self.compile(&ty["element"], named, true)?;
                format!("const value=reader.byte()?{{Some:{next}(reader)}}:{{None:null}};")
            }
            "result" => {
                if self.private && self.sums.selected(ty){
                    let leaves=super::sum_layout::Sums::leaves(ty);let mut readers=Vec::new();
                    for leaf in &leaves{readers.push(self.compile(leaf,named,true)?);}
                    fn branch(at:usize,readers:&[String])->String{
                        let count=readers.len()-1;
                        let tail=if at+1==count{format!("value={{tag:{count},payload:{}(reader)}};",readers[count])}else{let next=at+1;format!("const end{next}=reader.frame();{}reader.finish(end{next});",branch(next,readers))};
                        format!("if(reader.byte()===0){{value={{tag:{at},payload:{}(reader)}};}}else{{{tail}}}",readers[at])
                    }
                    format!("let value;{}",branch(0,&readers))
                }else{
                    let yes=self.compile(&ty["ok"],named,true)?;let no=self.compile(&ty["error"],named,true)?;
                    format!("const value=reader.byte()?{{Err:{no}(reader)}}:{{Ok:{yes}(reader)}};")
                }
            }
            _ => return Err("unsupported literal wire type".into()),
        };
        let constants=if ty["kind"]=="enum" {format!("const {name}Variants=Object.freeze({});\n",ty["variants"])} else {String::new()};
        let source=format!("{constants}function {name}(reader){{const end=reader.frame();{body}reader.finish(end);return value;}}\n");
        self.functions.insert(key, (name.clone(), source));
        Ok(name)
    }
}
