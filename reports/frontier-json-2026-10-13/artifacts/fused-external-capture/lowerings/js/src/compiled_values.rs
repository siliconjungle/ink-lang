//! Literal private value boundaries. The checked source supplies every schema;
//! existing physical witnesses supply storage choices. No algorithm discovery.
use super::{descriptor, quote};
use ink_core::{
    syntax::{Program, Type},
    LangResult,
};
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

struct Writers<'a> {
    elisions: &'a BTreeSet<String>,
    native_f32: bool,
    functions: BTreeMap<String, (String, String)>,
}
impl Writers<'_> {
    fn compile(&mut self, ty: &Value, named: &Value) -> LangResult<String> {
        if ty["kind"] == "ref" {
            return self.compile(
                &named[ty["name"].as_str().ok_or("private wire reference")?],
                named,
            );
        }
        let key = serde_json::to_string(ty).map_err(|e| e.to_string())?;
        if let Some((name, _)) = self.functions.get(&key) {
            return Ok(name.clone());
        }
        if self.functions.len() >= 4096 {
            return Err("private writer schema limit".into());
        }
        let name = format!("__privateWireWrite{}", self.functions.len());
        self.functions
            .insert(key.clone(), (name.clone(), String::new()));
        let body = match ty["kind"].as_str().ok_or("private writer kind")? {
            "unit" => String::new(),
            "bool" => "writer.byte(value?1:0);".into(),
            "u32" => "writer.word(value);".into(),
            "i32" => "writer.word(value>>>0);".into(),
            "u64" => "writer.wide(value);".into(),
            "f32" => {
                if self.native_f32 {
                    "writer.word(__nfBits(value));".into()
                } else {
                    "writer.word(value);".into()
                }
            }
            "int" => "writer.text(value.toString(),compact);".into(),
            "string" | "id" | "enum" => "writer.text(value,compact);".into(),
            "record" => {
                let mut out = String::new();
                let elided = ty["name"]
                    .as_str()
                    .is_some_and(|n| self.elisions.contains(n));
                let fields = ty["fields"].as_array().ok_or("private writer fields")?;
                if elided && fields.len() != 1 {
                    return Err("private writer record correspondence".into());
                }
                for field in fields {
                    let next = self.compile(&field["type"], named)?;
                    let value = if elided {
                        "value".into()
                    } else {
                        format!(
                            "value[{}]",
                            quote(field["name"].as_str().ok_or("private writer field")?)
                        )
                    };
                    out.push_str(&format!("{next}(writer,{value},compact);"));
                }
                out
            }
            "list" | "vector" => {
                let next = self.compile(&ty["element"], named)?;
                format!("writer.count(value.length);for(let i=0;i<value.length;i++){next}(writer,value[i],compact);")
            }
            "option" => {
                let next = self.compile(&ty["element"], named)?;
                format!("if(Object.hasOwn(value,'Some')){{writer.byte(1);{next}(writer,value.Some,compact);}}else{{writer.byte(0);}}")
            }
            "result" => {
                let ok = self.compile(&ty["ok"], named)?;
                let err = self.compile(&ty["error"], named)?;
                format!("if(Object.hasOwn(value,'Ok')){{writer.byte(0);{ok}(writer,value.Ok,compact);}}else{{writer.byte(1);{err}(writer,value.Err,compact);}}")
            }
            _ => return Err("unsupported private writer type".into()),
        };
        self.functions.insert(
            key,
            (
                name.clone(),
                format!("function {name}(writer,value,compact){{writer.frame(()=>{{{body}}});}}\n"),
            ),
        );
        Ok(name)
    }
}
pub(super) fn emit(
    p: &Program,
    elisions: &BTreeSet<String>,
    native_f32: bool,
) -> LangResult<String> {
    let named = p
        .records
        .keys()
        .map(|n| {
            Ok((
                n.clone(),
                descriptor(&Type::Named(n.clone()), p, &mut BTreeSet::new())?,
            ))
        })
        .collect::<LangResult<BTreeMap<_, _>>>()?;
    let mut capture = super::value_capture::Captures::new(elisions, native_f32);
    let mut read = super::wire_values::WireValues::private(elisions, native_f32);
    let mut owned = super::owned_values::OwnedValues::private(p, elisions, native_f32);
    let mut write = Writers {
        elisions,
        native_f32,
        functions: BTreeMap::new(),
    };
    let mut roots = BTreeMap::<String, String>::new();
    let mut definitions = String::new();
    let mut entries = vec![];
    let contract = ink_abi::wire_contract::source_contract(p)?;
    for (index, f) in p.functions.iter().enumerate() {
        if ink_core::local_collections::owned(&f.result, p)
            || f.params
                .iter()
                .any(|(_, t)| ink_core::local_collections::owned(t, p))
        {
            continue;
        }
        let mut codecs = vec![];
        let mut supported = true;
        for ty in f.params.iter().map(|(_, t)| t).chain([&f.result]) {
            let logical = descriptor(ty, p, &mut BTreeSet::new())?;
            let schema = match ink_abi::value_wire::Schema::new(logical.clone(), named.clone()) {
                Ok(schema) => schema.descriptor(),
                Err(_) => {
                    supported = false;
                    break;
                }
            };
            let key = schema["identity"]
                .as_str()
                .ok_or("private schema identity")?
                .to_owned();
            if let Some(name) = roots.get(&key) {
                codecs.push(name.clone());
                continue;
            }
            let reader = read.for_schema(&schema)?;
            let writer = write.compile(&schema["root"], &schema["named"])?;
            let copy = owned.for_type(ty)?;
            let name = format!("__compiledCodec{}", roots.len());
            // Factories remain lazy so unused exported value boundaries do not
            // eagerly construct recursive codecs at module initialization.
            let capture = capture.compile(&schema["root"], &schema["named"])?;
            definitions.push_str(&format!("let {name}Value;function {name}(){{return {name}Value??=__compiledCodec({schema},{capture},{reader},{writer},{copy});}}\n"));
            roots.insert(key, name.clone());
            codecs.push(name);
        }
        if !supported {
            continue;
        }
        let result = codecs.pop().ok_or("compiled result codec")?;
        let args_read = if contract["functions"][&f.name]["unsupported"].is_null() {
            read.for_arguments_schema(&contract["functions"][&f.name]["arguments"])?
        } else {
            "null".into()
        };
        entries.push(format!(
            "[{},{{index:{index},params:[{}],result:{result},arguments:{args_read},argumentCodec:null,precondition:{}}}]",
            quote(&f.name),
            codecs.join(","),
            p.contracts
                .precondition_checks
                .get(&f.name)
                .and_then(|name| p.functions.iter().position(|f| &f.name == name))
                .map(|i| i.to_string())
                .unwrap_or("null".into())
        ));
    }
    let mut source = capture.source()
        + &read.source()
        + &owned
            .source()
            .replace("__ownedValue", "__compiledOwnedValue");
    // Owned copy names live in their own literal namespace.
    definitions = definitions.replace("__ownedValue", "__compiledOwnedValue");
    source += &write
        .functions
        .values()
        .map(|(_, s)| s.as_str())
        .collect::<String>();
    source += include_str!("compiled_values.mjs");
    source += &definitions;
    source += &format!(
        "const __compiledEntries=new Map([{}]);\n",
        entries.join(",")
    );
    source += r#"
export const compiledValues=Object.freeze(Object.fromEntries([...__compiledEntries].map(([name,entry])=>[name,Object.freeze({get params(){return Object.freeze(entry.params.map(codec=>codec()));},get result(){return entry.result();}})])));
export function callCompiled(name,args){
 const entry=__compiledEntries.get(name);
 if(!entry||!Array.isArray(args)||args.length!==entry.params.length)throw Error('unsupported compiled call');
 const values=entry.params.map((codec,i)=>__compiledUnwrap(args[i],codec().identity));
 if(entry.precondition!==null&&__implementations[entry.precondition](...values)!==true)throw Error('contract precondition failed');
 return __compiledHandle(entry.result().identity,__implementations[entry.index](...values));
}
"#;
    Ok(source)
}
