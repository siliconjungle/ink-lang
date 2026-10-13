//! Literal materialisation after the complete ABI validator accepts a buffer.
use ink_core::LangResult;
use serde_json::Value;
use std::collections::BTreeMap;
use super::quote;

pub(super) struct WireValues {
    functions: BTreeMap<String, (String, String)>,
}
impl WireValues {
    pub fn new() -> Self { Self { functions: BTreeMap::new() } }
    pub fn source(&self) -> String { self.functions.values().map(|(_, code)| code.as_str()).collect() }
    pub fn for_schema(&mut self, schema: &Value) -> LangResult<String> {
        let original=self.functions.len();
        let result=self.compile(&schema["root"],&schema["named"]);
        if result.is_err() { self.functions.retain(|_,(name,_)|name.trim_start_matches("__wireValue").parse::<usize>().is_ok_and(|i|i<original)); }
        result
    }
    fn compile(&mut self, ty:&Value, named:&Value) -> LangResult<String> {
        if ty["kind"]=="ref" {
            let target=ty["name"].as_str().ok_or("wire reference")?;
            return self.compile(&named[target],named);
        }
        let key=serde_json::to_string(ty).map_err(|e|e.to_string())?;
        if let Some((name,_))=self.functions.get(&key){return Ok(name.clone());}
        if self.functions.len()>=4096{return Err("literal wire schema limit".into());}
        let name=format!("__wireValue{}",self.functions.len());self.functions.insert(key.clone(),(name.clone(),String::new()));
        let body=match ty["kind"].as_str().ok_or("wire kind")? {
            "unit"=>"const value=null;".into(),
            "bool"=>"const value=!!reader.byte();".into(),
            "u32"=>"const value=reader.word();".into(),
            "i32"=>"const value=reader.signed();".into(),
            "u64"=>"const value=reader.wide();".into(),
            "f32"=>"const value={F32Bits:reader.word()};".into(),
            "int"=>"const value={Int:reader.text(end)};".into(),
            "string"|"enum"|"id"=>"const value=reader.text(end);".into(),
            "record"=>{
                let mut fields=Vec::new();
                for field in ty["fields"].as_array().ok_or("wire fields")? {
                    let key=quote(field["name"].as_str().ok_or("wire field name")?);
                    let next=self.compile(&field["type"],named)?;
                    fields.push(format!("[{key}]:{next}(reader)"));
                }
                format!("const value={{{}}};",fields.join(","))
            }
            "list"|"vector"=>{
                let next=self.compile(&ty["element"],named)?;
                format!("const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]={next}(reader);")
            }
            "option"=>{let next=self.compile(&ty["element"],named)?;format!("const value=reader.byte()?{{Some:{next}(reader)}}:{{None:null}};")}
            "result"=>{let yes=self.compile(&ty["ok"],named)?;let no=self.compile(&ty["error"],named)?;format!("const value=reader.byte()?{{Err:{no}(reader)}}:{{Ok:{yes}(reader)}};")}
            _=>return Err("unsupported literal wire type".into()),
        };
        let source=format!("function {name}(reader){{const end=reader.frame();{body}reader.finish(end);return value;}}\n");
        self.functions.insert(key,(name.clone(),source));Ok(name)
    }
}
