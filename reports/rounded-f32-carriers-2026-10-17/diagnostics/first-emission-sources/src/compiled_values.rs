//! Literal private value boundaries. The checked source supplies every schema;
//! existing physical witnesses supply storage choices. No algorithm discovery.
use super::{descriptor, quote};
use ink_core::{
    syntax::{Expr,Program, Type},
    LangResult,
};
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

struct Writers<'a> {
    elisions: &'a BTreeSet<String>,
    native_f32: bool,
    sums:super::sum_layout::Sums,
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
            "f64" => "writer.wide(__dfBits(value));".into(),
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
                if self.sums.selected(ty){
                    let leaves=super::sum_layout::Sums::leaves(ty);let count=leaves.len()-1;let mut cases=String::new();
                    for (i,leaf) in leaves.iter().enumerate(){let next=self.compile(leaf,named)?;let levels=if i<count{i+1}else{count};
                        let mut body=format!("writer.byte({});{next}(writer,value.payload,compact);",if i<count{0}else{1});
                        for _ in 1..levels{body=format!("writer.byte(1);{{const frame=writer.openFrame();{body}writer.closeFrame(frame);}}");}
                        cases.push_str(&format!("case {i}:{{{body}break;}}"));
                    }
                    format!("switch(value.tag){{{cases}default:throw Error('private sum tag');}}")
                }else{let ok=self.compile(&ty["ok"],named)?;let err=self.compile(&ty["error"],named)?;
                    format!("if(Object.hasOwn(value,'Ok')){{writer.byte(0);{ok}(writer,value.Ok,compact);}}else{{writer.byte(1);{err}(writer,value.Err,compact);}}")}
            }
            _ => return Err("unsupported private writer type".into()),
        };
        self.functions.insert(
            key,
            (
                name.clone(),
                format!("function {name}(writer,value,compact){{const frame=writer.openFrame();{body}writer.closeFrame(frame);}}\n"),
            ),
        );
        Ok(name)
    }
}
pub(super) fn emit(
    p: &Program,
    elisions: &BTreeSet<String>,
    native_f32: bool,
    sums:&super::sum_layout::Sums,
    boundaries:&[ink_core::physical::BoundaryReader],
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
    let mut capture = super::value_capture::Captures::new(elisions, native_f32).with_sums(sums);
    let mut constructors=super::constructors::Constructors::new(elisions,sums);
    let mut reductions=super::value_reduce::Reductions::new(elisions,sums,native_f32);
    let mut read = super::wire_values::WireValues::private(elisions, native_f32).with_sums(sums);
    let mut owned = super::owned_values::OwnedValues::private(p, elisions, native_f32).with_sums(sums);
    let mut write = Writers {
        elisions,
        native_f32,
        sums:sums.clone(),
        functions: BTreeMap::new(),
    };
    let mut roots = BTreeMap::<String, String>::new();
    // Exact private declaration literals share syntax only. A factory returns
    // a fresh object lazily, preserving ownership and avoiding a retained pool.
    let mut named_groups = BTreeMap::<String, (String, String)>::new();
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
        let portable=boundaries.iter().any(|b|b.function==f.name&&b.format==ink_core::physical::BoundaryFormat::Portable);
        let compact=boundaries.iter().any(|b|b.function==f.name&&b.format==ink_core::physical::BoundaryFormat::Compact);
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
                .ok_or("private schema identity")?;
            let key=format!("{key}:{portable}:{compact}");
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
            let capture_name = capture.compile(&schema["root"], &schema["named"])?;
            let constructor_root=constructors.compile(&schema["root"],&schema["named"],&mut capture)?;
            let reduction_root=reductions.compile(&schema["root"],&schema["named"])?;
            let named_json = serde_json::to_string(&schema["named"]).map_err(|e|e.to_string())?;
            let group = if let Some((symbol,_)) = named_groups.get(&named_json) {symbol.clone()} else {
                let symbol=format!("__compiledNamed{}",named_groups.len());
                named_groups.insert(named_json.clone(),(symbol.clone(),format!("function {symbol}(){{return {named_json};}}\n")));
                symbol
            };
            let schema_literal=format!("{{{}}}",schema.as_object().ok_or("compiled schema object")?.iter().map(|(key,value)|{
                format!("{}:{}",quote(key),if key=="named" {format!("{group}()")}else{value.to_string()})
            }).collect::<Vec<_>>().join(","));
            definitions.push_str(&format!("let {name}Value;function {name}(){{return {name}Value??=__compiledCodec({schema_literal},{capture_name},{reader},{writer},{copy},{constructor_root},{reduction_root},__reduceValue{reduction_root},{portable},{compact});}}\n"));
            roots.insert(key, name.clone());
            codecs.push(name);
        }
        if !supported {
            if portable||compact {return Err("selected boundary reader has no supported wire schema".into());}
            continue;
        }
        let result = codecs.pop().ok_or("compiled result codec")?;
        let args_read = if contract["functions"][&f.name]["unsupported"].is_null() {
            read.for_arguments_schema(&contract["functions"][&f.name]["arguments"])?
        } else {
            if portable||compact {return Err("selected boundary reader has no supported argument schema".into());}
            "null".into()
        };
        let mut predicates=Vec::new();let mut needs_invariants=Vec::new();
        for (name,ty) in &f.params {
            let guards=ink_core::contracts::values::predicates(p,ty,Expr::Var(name.clone()))?;
            needs_invariants.push(!guards.is_empty());predicates.extend(guards);
        }
        let expected=predicates.iter().rev().cloned().fold(Expr::Bool(true),|rest,e|Expr::Binary("&&".into(),Box::new(e),Box::new(rest)));
        // Only exact source-derived type guards may consume a handle's checked
        // value guarantee. Additional declared requires clauses still execute.
        let only_type_guards=!predicates.is_empty()&&p.contracts.precondition_checks.get(&f.name)
            .and_then(|name|p.functions.iter().find(|g|&g.name==name))
            .is_some_and(|guard|guard.params==f.params&&guard.body==expected);
        entries.push(format!(
            "[{},{{index:{index},params:[{}],result:{result},arguments:{args_read},argumentCodecs:[null,null],boundaryReaders:[{portable},{compact}],onlyTypeGuards:{only_type_guards},needsInvariants:{},precondition:{}}}]",
            quote(&f.name),
            codecs.join(","),
            serde_json::to_string(&needs_invariants).map_err(|e|e.to_string())?,
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
    source += &constructors.source();
    source += &reductions.source();
    source += &named_groups.values().map(|(_,code)|code.as_str()).collect::<String>();
    source += &definitions;
    source += &format!(
        "const __compiledEntries=new Map([{}]);\n",
        entries.join(",")
    );
    source += r#"
export const compiledValues=Object.freeze(Object.fromEntries([...__compiledEntries].map(([name,entry])=>[name,Object.freeze({get params(){return Object.freeze(entry.params.map(codec=>codec()));},get result(){return entry.result();}})])));
function __compiledValidate(entry,owned){
 const values=owned.map(v=>v.value);
 const established=entry.onlyTypeGuards&&entry.needsInvariants.every((needed,i)=>!needed||owned[i].guaranteed);
 if(entry.precondition!==null&&!established){
  if(__implementations[entry.precondition](...values)!==true)throw Error('contract precondition failed');
  for(let i=0;i<owned.length;i++)if(entry.needsInvariants[i])owned[i].guaranteed=true;
 }
 return values;
}
export function callCompiled(name,args){
 const entry=__compiledEntries.get(name);
 if(!entry||!Array.isArray(args)||args.length!==entry.params.length)throw Error('unsupported compiled call');
 const owned=entry.params.map((codec,i)=>__compiledEntry(args[i],codec().identity)),values=__compiledValidate(entry,owned);
 // Checked source outputs satisfy their declared value interfaces. Private
 // handles expose only detached copies and never retain mutable host inputs.
 return __compiledHandle(entry.result().identity,__implementations[entry.index](...values),true);
}

// Explicit sealed-value partial application. Each token owns a bounded set of
// lexical caches; no mutable host object, global memo table or error is retained.
const __preparedCompiled=new WeakMap();
export function prepareCompiled(name,bindings){
 const entry=__compiledEntries.get(name);
 if(!entry||!Array.isArray(bindings)||bindings.length>entry.params.length)throw Error('unsupported prepared compiled call');
 const captured=new Array(entry.params.length),fixed=new Array(entry.params.length).fill(false);
 for(const binding of bindings){
  if(!Array.isArray(binding)||binding.length!==2)throw Error('prepared compiled binding');
  const [index,handle]=binding;
  if(!Number.isInteger(index)||index<0||index>=fixed.length||fixed[index])throw Error('prepared compiled parameter');
  captured[index]=__compiledEntry(handle,entry.params[index]().identity);fixed[index]=true;
 }
 const remaining=fixed.flatMap((yes,i)=>yes?[]:[i]);
 const factory=__preparedFactories.get(entry.index);
 const run=factory?factory(fixed):__implementations[entry.index];
 const token=Object.freeze(Object.create(null));
 __preparedCompiled.set(token,{entry,captured,remaining,run});return token;
}
export function callPreparedCompiled(token,args){
 const prepared=__preparedCompiled.get(token);
 if(!prepared||!Array.isArray(args)||args.length!==prepared.remaining.length)throw Error('invalid prepared compiled call');
 const {entry,captured,remaining,run}=prepared,owned=captured.slice();
 for(let i=0;i<remaining.length;i++){const at=remaining[i];owned[at]=__compiledEntry(args[i],entry.params[at]().identity);}
 const values=__compiledValidate(entry,owned);
 return __compiledHandle(entry.result().identity,run(...values),true);
}
"#;
    Ok(source)
}
