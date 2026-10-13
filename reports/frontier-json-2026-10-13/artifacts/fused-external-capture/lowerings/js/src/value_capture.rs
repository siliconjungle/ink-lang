//! Literal external validation, ownership and private materialisation in one
//! traversal. Resource policy is supplied by the shared wire ABI.
use super::quote;
use ink_core::LangResult;
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

pub(super) struct Captures<'a> {
    elisions: &'a BTreeSet<String>,
    native_f32: bool,
    functions: BTreeMap<String, (String, String)>,
}
impl<'a> Captures<'a> {
    pub fn new(elisions: &'a BTreeSet<String>, native_f32: bool) -> Self {
        Self {
            elisions,
            native_f32,
            functions: BTreeMap::new(),
        }
    }
    pub fn source(&self) -> String {
        self.functions.values().map(|(_, s)| s.as_str()).collect()
    }
    pub fn compile(&mut self, ty: &Value, named: &Value) -> LangResult<String> {
        if ty["kind"] == "ref" {
            return self.compile(
                &named[ty["name"].as_str().ok_or("capture reference")?],
                named,
            );
        }
        let key = serde_json::to_string(ty).map_err(|e| e.to_string())?;
        if let Some((name, _)) = self.functions.get(&key) {
            return Ok(name.clone());
        }
        if self.functions.len() >= 4096 {
            return Err("literal capture schema limit".into());
        }
        let name = format!("__privateCapture{}", self.functions.len());
        self.functions
            .insert(key.clone(), (name.clone(), String::new()));
        let bad = "throw Error('invalid value for wire schema');";
        let tagged = |tag: &str| {
            format!("value!==null&&typeof value==='object'&&Object.hasOwn(value,'{tag}')&&Object.keys(value).length===1")
        };
        let body=match ty["kind"].as_str().ok_or("capture kind")? {
            "unit"=>format!("if(value!==null){{{bad}}}return null;"),
            "bool"=>format!("if(typeof value!=='boolean'){{{bad}}}budget.add(1);return value;"),
            "u32"|"i32"=>{
                let (min,max)=if ty["kind"]=="u32"{("0","4294967295")}else{("-2147483648","2147483647")};
                format!("if(typeof value!=='number'||!Number.isInteger(value)||value<{min}||value>{max}){{{bad}}}budget.add(4);return value===0?0:value;")
            }
            "u64"=>format!("const kind=typeof value;if(kind==='number'&&!Number.isSafeInteger(value)||kind!=='bigint'&&kind!=='number'&&kind!=='string'||kind==='string'&&!/^(0|[1-9][0-9]*)$/.test(value)){{{bad}}}const n=BigInt(value);if(n<0n||n>18446744073709551615n){{{bad}}}budget.add(8);return n;"),
            "f32"=>{
                let result=if self.native_f32 {"__nfFromBits(bits)"}else{"bits===0?0:bits"};
                format!("let bits;if(typeof value==='number'&&Number.isFinite(value)){{bits=__bits(value);if(!Number.isFinite(__float(bits))){{{bad}}}}}else{{if(!({})){{{bad}}}bits=value.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295){{{bad}}}}}budget.add(4);return {result};",tagged("F32Bits"))
            }
            "string"|"int"|"id"|"enum"=>{
                let text=if ty["kind"]=="int"{format!("typeof value==='bigint'?value.toString():({})?value.Int:null",tagged("Int"))}else{"value".into()};
                let extra=match ty["kind"].as_str().unwrap() {
                    "int"=>format!("if(!/^(0|[1-9][0-9]*|-[1-9][0-9]*)$/.test(text)){{{bad}}}"),
                    "id"=>format!("if(!/^[0-9a-f]{{32}}$/.test(text)){{{bad}}}"),
                    "enum"=>format!("if(!{}.includes(text)){{{bad}}}",ty["variants"]),
                    _=>String::new(),
                };
                let result=if ty["kind"]=="int"{"BigInt(text)"}else{"text"};
                format!("const text={text};if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){{{bad}}}{extra}budget.text(text);return {result};")
            }
            "list"|"vector"=>{
                let next=self.compile(&ty["element"],named)?;
                let fixed=if ty["kind"]=="vector"{format!("||n!=={}",ty["size"])}else{String::new()};
                format!("if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){{{bad}}}const n=value.length;if(n>budget.remaining{fixed}){{{bad}}}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]={next}(value[i],budget,depth+1);return out;")
            }
            "record"=>{
                let fs=ty["fields"].as_array().ok_or("capture fields")?;
                let mut checks=String::new();let mut fields=vec![];
                for field in fs {
                    let label=quote(field["name"].as_str().ok_or("capture field name")?);
                    checks.push_str(&format!("if(!Object.hasOwn(value,{label})){{{bad}}}"));
                    let next=self.compile(&field["type"],named)?;
                    fields.push(format!("[{label}]:{next}(value[{label}],budget,depth+1)"));
                }
                let elided=ty["name"].as_str().is_some_and(|n|self.elisions.contains(n));
                let output=if elided {
                    if fs.len()!=1 {return Err("capture record correspondence".into());}
                    let f=&fs[0];let next=self.compile(&f["type"],named)?;
                    format!("{next}(value[{}],budget,depth+1)",quote(f["name"].as_str().unwrap()))
                }else{format!("{{{}}}",fields.join(","))};
                format!("if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!=={}){{{bad}}}{checks}return {output};",fs.len())
            }
            "option"=>{let next=self.compile(&ty["element"],named)?;format!("budget.add(1);if(({})&&value.None===null)return {{None:null}};if({})return {{Some:{next}(value.Some,budget,depth+1)}};{bad}",tagged("None"),tagged("Some"))}
            "result"=>{let ok=self.compile(&ty["ok"],named)?;let err=self.compile(&ty["error"],named)?;format!("budget.add(1);if({})return {{Ok:{ok}(value.Ok,budget,depth+1)}};if({})return {{Err:{err}(value.Err,budget,depth+1)}};{bad}",tagged("Ok"),tagged("Err"))}
            _=>return Err("unsupported literal capture type".into()),
        };
        self.functions.insert(
            key,
            (
                name.clone(),
                format!("function {name}(value,budget,depth=0){{budget.enter(depth,4);{body}}}\n"),
            ),
        );
        Ok(name)
    }
}
