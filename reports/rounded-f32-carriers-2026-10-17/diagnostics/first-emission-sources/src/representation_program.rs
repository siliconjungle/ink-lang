//! Standalone compiled representations. Proofs, source AST and checker stay in
//! the compiler; physical constructor values remain native between calls.
use ink_core::{logic::Sort, representation::CheckedRepresentation, syntax::Type, LangResult};
use std::{
    collections::{BTreeMap, BTreeSet},
    fmt::Write,
};
struct Emit<'a> {
    elisions: BTreeSet<String>,
    sums:super::sum_layout::Sums,
    program: &'a ink_core::syntax::Program,
    projection: &'a ink_core::action_model::Projection,
    types: BTreeMap<String, (usize, Type, Sort)>,
}
impl Emit<'_> {
    fn index(&self, t: &Type) -> LangResult<usize> {
        Ok(self
            .types
            .get(&serde_json::to_string(t).map_err(|e| e.to_string())?)
            .ok_or("missing representation codec")?
            .0)
    }
    fn read(&self, t: &Type, v: &str, d: &str) -> LangResult<String> {
        Ok(format!("read_{}({v},{d})", self.index(t)?))
    }
    fn read_mode(&self, t: &Type, v: &str, d: &str, mode: &str) -> LangResult<String> {
        Ok(format!("read_{}({v},{d},{mode})", self.index(t)?))
    }
    fn write(&self, t: &Type, v: &str, d: &str, s: &str) -> LangResult<String> {
        Ok(format!("write_{}({v},{d},{s})", self.index(t)?))
    }
    fn codecs(&self) -> LangResult<String> {
        let p = self.program;
        let mut out = String::new();
        for (_, (index, t, sort)) in &self.types {
            if ink_core::local_collections::owned(t,p) {continue;}
            let read=match t{
    Type::U64=>"return v;".into(),
    Type::U32=>"return BigInt(v);".into(),
    Type::I32=>"return BigInt.asUintN(32,BigInt(v));".into(),
    Type::F32=>"if(internal)return BigInt(v);if(v&&typeof v==='object')return BigInt(v.F32Bits);__fpView.setFloat32(0,Number(v),true);return BigInt(__fpView.getUint32(0,true));".into(),
    Type::String=>"const bytes=__encoder.encode(v);let tail=__node(0,[]);for(let i=bytes.length-1;i>=0;i--)tail=__node(1,[BigInt(bytes[i]),tail]);return tail;".into(),
    Type::Named(n)if p.ids.contains(n)=>"const x=BigInt('0x'+v);return __node(0,[x>>64n,BigInt.asUintN(64,x)]);".into(),
    Type::Bool=>"return v;".into(),
    Type::Unit=>"return __node(0,[]);".into(),
    Type::Int=>"const text=v&&typeof v.Int==='string'?v.Int:typeof v==='bigint'?v.toString():'';const n=BigInt(text);let magnitude=n<0n?-n:n;if(magnitude===0n)return __node(0,[]);const bits=magnitude.toString(2);let tail=__node(0,[]);for(const bit of bits)tail=__node(bit==='0'?1:2,[tail]);return __node(n<0n?2:1,[tail]);".into(),
    Type::Named(n)if p.enums.contains_key(n)=>{let cases=p.enums[n].iter().enumerate().map(|(i,v)|format!("case {}:return __node({i},[]);",super::quote(&format!("{n}.{v}")))).collect::<String>();format!("switch(v){{{cases}default:return undefined;}}", )},
    Type::Named(n)if p.records.contains_key(n)=>{
        let fs=&p.records[n];let args=fs.iter().map(|(name,t)|self.read_mode(t,&if self.elisions.contains(n){format!("(internal?v:v[{}])",super::quote(name))}else{format!("v[{}]",super::quote(name))},"d+1","internal")).collect::<LangResult<Vec<_>>>()?;
        if let Some(record)=self.projection.recursive_records.get(n) {
            let args=args.into_iter().zip(&record.fields).map(|(x,f)|f.encode.as_ref().map(|id|format!("f_{id}({x})")).unwrap_or(x)).collect::<Vec<_>>();
            let mut list="__node(0,[])".to_owned();for x in args.into_iter().rev(){list=format!("__node(3,[{x},{list}])");}
            format!("return __node(4,[{}n,{list}]);",record.tag)
        } else {format!("return __node(0,[{}]);",args.join(","))}
    },
    Type::Option(a)=>format!("if(Object.hasOwn(v,'Some'))return __node(1,[{}]);return __node(0,[]);",self.read_mode(a,"v.Some","d+1","internal")?),
    Type::Result(a,b)=>{let view=self.sums.view_type(p,t,"v")?;format!("const branch=internal?{view}:v;if(Object.hasOwn(branch,'Ok'))return __node(0,[{}]);return __node(1,[{}]);",self.read_mode(a,"branch.Ok","d+1","internal")?,self.read_mode(b,"branch.Err","d+1","internal")?)},
    Type::Vector(a,n)=>{let args=(0..*n).map(|i|self.read_mode(a,&format!("v[{i}]"),"d+1","internal")).collect::<LangResult<Vec<_>>>()?;format!("return __node(0,[{}]);",args.join(","))},
    Type::List(a)=>format!("let tail=__node(0,[]);for(let i=v.length-1;i>=0;i--)tail=__node(1,[{},tail]);return tail;",self.read_mode(a,"v[i]","d+1","internal")?),
    _=>return Err("unsupported standalone source codec".into()),
   };
            writeln!(out, "function read_{index}(v,d=0,internal=false){{{read}}}").unwrap();
            let write=match t{
    Type::F32=>"if(snapshot)return v;const x=__fpNumber(v);return !Number.isFinite(x)?{F32Bits:Number(v)}:x;".into(),
    Type::U64|Type::Bool=>"return v;".into(),Type::U32=>"return snapshot?v:Number(v);".into(),Type::I32=>"return snapshot?BigInt.asIntN(32,v):Number(BigInt.asIntN(32,v));".into(),Type::Unit=>"return null;".into(),
    Type::String=>"const bytes=[];let cursor=v;while(cursor.c!==0){bytes.push(Number(cursor.a[0]));cursor=cursor.a[1];}return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(bytes));".into(),
    Type::Named(n)if p.ids.contains(n)=>"return ((v.a[0]<<64n)|v.a[1]).toString(16).padStart(32,'0');".into(),
    Type::Int=>"if(v.c===0)return snapshot?0n:{Int:'0'};let cursor=v.a[0],magnitude=0n,bits=0;while(cursor.c!==0){if(cursor.c===2)magnitude|=1n<<BigInt(bits);bits++;cursor=cursor.a[0];}const n=v.c===2?-magnitude:magnitude;return snapshot?n:{Int:n.toString()};".into(),
    Type::Named(n)if p.enums.contains_key(n)=>format!("return [{}][v.c];",p.enums[n].iter().map(|v|super::quote(&format!("{n}.{v}"))).collect::<Vec<_>>().join(",")),
    Type::Named(n)if p.records.contains_key(n)=>{
        let recursive=self.projection.recursive_records.get(n);let mut prefix=String::new();
        if let Some(record)=recursive {
            write!(prefix,"if(v.c!==4||v.a[0]!=={}n)throw Error('recursive record tag');let cursor=v.a[1];",record.tag).unwrap();
            for i in 0..record.fields.len(){write!(prefix,"if(cursor.c!==3)throw Error('recursive record fields');const field{i}=cursor.a[0];cursor=cursor.a[1];").unwrap();}
            prefix.push_str("if(cursor.c!==0)throw Error('recursive record field tail');");
        }
        let fs=p.records[n].iter().enumerate().map(|(i,(name,t))| {
            let x=if let Some(record)=recursive {record.fields[i].decode.as_ref().map(|id|format!("f_{id}(field{i})")).unwrap_or_else(||format!("field{i}"))}else{format!("v.a[{i}]")};
            Ok(format!("[{},{}]",super::quote(name),self.write(t,&x,"d+1","snapshot")?))
        }).collect::<LangResult<Vec<_>>>()?;
        format!("{prefix}return Object.fromEntries([{}]);",fs.join(","))
    },
    Type::Option(a)=>format!("return v.c===0?{{None:null}}:{{Some:{}}};",self.write(a,"v.a[0]","d+1","snapshot")?),
    Type::Result(a,b)=>format!("return v.c===0?{{Ok:{}}}:{{Err:{}}};",self.write(a,"v.a[0]","d+1","snapshot")?,self.write(b,"v.a[0]","d+1","snapshot")?),
    Type::Vector(a,n)=>{let xs=(0..*n).map(|i|self.write(a,&format!("v.a[{i}]"),"d+1","snapshot")).collect::<LangResult<Vec<_>>>()?;format!("return [{}];",xs.join(","))},
    Type::List(a)=>format!("let cursor=v;const xs=[];while(cursor.c!==0){{xs.push({});cursor=cursor.a[1];}}return xs;",self.write(a,"cursor.a[0]","d+1","snapshot")?),_=>unreachable!(),
   };
            writeln!(
                out,
                "function write_{index}(v,d=0,snapshot=false){{{write}}}"
            )
            .unwrap();
            // Data nodes carry native tags/fields; type-specific inspection is emitted
            // from the checked declarations, not a runtime type or definition image.
            let _ = sort;
        }
        Ok(out)
    }
}
pub(crate) struct MaintainedSupport {
    pub source:String,
    pub kernels:Vec<Option<String>>,
}
pub(crate) fn maintained_support(module: &ink_core::core::CheckedModule, views:&ink_core::maintained::CheckedViews,elisions:&std::collections::BTreeSet<String>,sums:&super::sum_layout::Sums,inline_direct:bool) -> LangResult<MaintainedSupport> {
    let projection=ink_core::action_model::Projection::derive(module)?;
    let types=projection.types.iter().enumerate().map(|(i,(key,sort))|Ok((key.clone(),(i,serde_json::from_str::<Type>(key).map_err(|e|e.to_string())?,sort.clone())))).collect::<LangResult<BTreeMap<_,_>>>()?;
    let e=Emit{elisions:elisions.clone(),sums:sums.clone(),program:module.program(),projection:&projection,types};
    use ink_core::logic::Term;
    let ds=views.definition().reachable_executable_declarations()?;
    let var=|n:&str|Term::Var(n.into());
    let call=|f:&str,args:Vec<Term>|Term::Call{function:f.into(),arguments:args};
    let mut entries=String::new();
    let mut fallback=false;
    let mut native_roots=vec![true;module.program().states.len()];
    let mut inline_bodies=BTreeMap::<(usize,&str),String>::new();
    let mut kernel_bodies=BTreeMap::<(usize,&str),String>::new();
    let mut root_views=vec![Vec::new();module.program().states.len()];
    for ((v,s),zero) in views.package().views.iter().zip(views.subjects()).zip(views.zeros()) {
        if v.extremum.is_some(){return Err("JavaScript maintained extremum views are not implemented; select a Rust plan".into());}
        if v.group.is_some(){return Err("JavaScript maintained grouped views are not implemented; select a Rust plan".into());}
        let root=module.program().states.iter().position(|r|r.name==s.table).unwrap();
        let keep=module.program().keeps.iter().position(|k|k.name==s.keep).unwrap();
        let Type::Table(key,row)=&module.program().states[root].ty else {unreachable!()};
        let view_index=root_views.iter().map(|v|v.len()).sum::<usize>();
        root_views[root].push((view_index,keep));
        let scalar=if s.result==Sort::Bool{Type::Bool}else{Type::U64};
        let zero=match zero{Term::U64(n)=>format!("{n}n"),Term::Bool(b)=>b.to_string(),_=>unreachable!()};
        let contribution_id=v.contribution_choice.as_ref().map(|c|&c.function).unwrap_or(&v.contribution);
        let contribution=|r:&str|call(contribution_id,vec![var("key"),var(r)]);
        let c=|a,b|call(&v.combine,vec![a,b]);
        let inv=|a|call(&v.inverse,vec![a]);
        let replacement=if let Some(u)=&v.row_update{call(&u.function,vec![var("total"),var("key"),var("old"),var("row")])}
            else if let Some(u)=&v.update{call(&u.function,vec![var("total"),contribution("old"),contribution("row")])}
            else{c(c(var("total"),inv(contribution("old"))),contribution("row"))};
        let candidates=[
            ("contribution",vec![("key",key.as_ref()),("row",row.as_ref())],contribution("row"),format!("(key,row)=>f_{}({},{})",contribution_id,e.read_mode(key,"key","0","true")?,e.read_mode(row,"row","0","true")?)),
            ("combine",vec![("total",&scalar),("value",&scalar)],c(var("total"),var("value")),format!("f_{}",v.combine)),
            ("inverse",vec![("value",&scalar)],inv(var("value")),format!("f_{}",v.inverse)),
            ("insert",vec![("total",&scalar),("key",key.as_ref()),("row",row.as_ref())],c(var("total"),contribution("row")),"null".into()),
            ("remove",vec![("total",&scalar),("key",key.as_ref()),("old",row.as_ref())],c(var("total"),inv(contribution("old"))),"null".into()),
            ("replace",vec![("total",&scalar),("key",key.as_ref()),("old",row.as_ref()),("row",row.as_ref())],replacement,"null".into()),
        ];
        write!(entries,"{{root:{root},keep:{keep},zero:{zero}").unwrap();
        for (name,params,body,ordinary) in candidates {
            let code=match super::definition_native::body(module.program(),&projection,&ds,elisions,&params,&body){
                Ok((code,value))=>{
                    if ["insert","remove","replace"].contains(&name){
                        let bindings=params.iter().filter_map(|(n,_)|match *n{"total"=>Some(format!("const total=rt.keeps[{keep}];")),"row"=>Some("const row=next;".into()),"old"=>Some("const old=prior;".into()),_=>None}).collect::<String>();
                        inline_bodies.insert((view_index,name),format!("{{{bindings}{code}rt.viewNext[{keep}]={value};}}"));
                        kernel_bodies.insert((view_index,name),format!("{{{bindings}{code}__nextKeep{keep}={value};}}"));
                    }
                    format!("({})=>{{{code}return {value};}}",params.iter().map(|p|p.0).collect::<Vec<_>>().join(","))
                },
                Err(_)=>{if ["insert","remove","replace"].contains(&name){native_roots[root]=false;}if ordinary!="null"{fallback=true;}ordinary},
            };
            write!(entries,",{name}:{code}").unwrap();
        }
        entries.push_str("},\n");
    }
    let mut out=String::new();
    if fallback {
        out=super::definition_literal::lower(views.definition(),&projection.codec_declarations()?)?;
        out.push_str("const __encoder=new TextEncoder();\n");
        out.push_str(&e.codecs()?);
    }
    // Scalar/flat-row definitions have no constructor or recursion machinery.
    // All other admitted definitions retain the ordinary literal codec lane.
    let mut preparers=Vec::new();
    for (root,ids) in root_views.iter().enumerate(){
        if !native_roots[root]||ids.is_empty(){preparers.push("null".into());continue;}
        let branch=|method:&str,args:&str|ids.iter().map(|(i,k)|format!("if(rt.keeps[{k}]!==undefined&&rt.pendingValues[{k}]===undefined){{rt.pendingValues[{k}]=__views[{i}].{method}(rt.keeps[{k}],key,{args});rt.pendingIndices.push({k});}}")).collect::<String>();
        preparers.push(format!("(rt,cell)=>{{const {{key,prior,next}}=cell;if(prior===undefined){{{}}}else if(next===undefined){{{}}}else{{{}}}}}",branch("insert","next"),branch("remove","prior"),branch("replace","prior,next")));
    }
    let directs=root_views.iter().enumerate().map(|(root,ids)|{
        if ids.is_empty(){return "null".to_string();}
        let branch=|method:&str,args:&str|ids.iter().map(|(i,k)|if inline_direct{inline_bodies.get(&(*i,method)).expect("native maintained body").clone()}else{format!("rt.viewNext[{k}]=__views[{i}].{method}(rt.keeps[{k}],key,{args});")}).collect::<String>();
        if native_roots[root]{format!("(rt,key,prior,next)=>{{if(prior===undefined){{{}}}else if(next===undefined){{{}}}else{{{}}}}}",branch("insert","next"),branch("remove","prior"),branch("replace","prior,next"))}
        else{format!("(rt,key,prior,next)=>{{{}}}",ids.iter().map(|(i,k)|format!("rt.viewNext[{k}]=__viewValue(__views[{i}],rt.keeps[{k}],key,prior,next);")).collect::<String>())}
    }).collect::<Vec<_>>();
    let ir=ink_core::action_ir::CheckedActions::elaborate(module)?;
    let effects=ink_core::effects::CheckedEffects::derive(&ir)?;
    let kernels=root_views.iter().enumerate().map(|(root,ids)|->LangResult<Option<String>>{
        if !inline_direct||!native_roots[root]||ids.is_empty(){return Ok(None);}
        let declarations=ids.iter().map(|(_,keep)|format!("let __nextKeep{keep};")).collect::<String>();
        let branch=|method:&str|ids.iter().map(|(i,_)|kernel_bodies.get(&(*i,method)).expect("native maintained body").clone()).collect::<String>();
        let mut installs=String::new();
        for (keep,k) in module.program().keeps.iter().enumerate(){
            if !effects.keep(&k.name).ok_or("missing keep effects")?.access.reads.contains(&module.program().states[root].name){continue;}
            let value=if ids.iter().any(|(_,id)|*id==keep){format!("__nextKeep{keep}")}else{"undefined".into()};
            write!(installs,"{{const value={value};if(publish)rt.changedOutputs[{keep}]=rt.keeps[{keep}]!==value?rt.changedOutputEpoch:0;rt.keeps[{keep}]=value;}}").unwrap();
        }
        Ok(Some(format!("{declarations}if(prior===undefined){{{}}}else if(next===undefined){{{}}}else{{{}}}__storeDirect(rt,{root},key,prior,next,slot);const publish=rt.meta.outputPublication&&!rt.observers.directRoots[{root}]&&rt.observers.active;if(publish&&++rt.changedOutputEpoch===4294967296){{rt.changedOutputs.fill(0);rt.changedOutputEpoch=1;}}{installs}",branch("insert"),branch("remove"),branch("replace"))))
    }).collect::<LangResult<Vec<_>>>()?;
    Ok(MaintainedSupport{source:format!("const __compiledMaintained=(()=>{{{out}const __views=[{entries}];__views.prepareRoots=[{}];__views.directRoots=[{}];return __views;}})();\n",preparers.join(","),directs.join(",")),kernels})
}

pub fn lower(checked: &CheckedRepresentation) -> LangResult<String> {
    let mut executable = checked.definition().reachable_executable_declarations()?;
    executable.extend(checked.projection().codec_declarations()?);
    let types = checked
        .projection()
        .types
        .iter()
        .filter(|(_, sort)| match sort {
            Sort::Data(id) => executable.contains_key(id),
            _ => true,
        })
        .enumerate()
        .map(|(i, (key, sort))| {
            Ok((
                key.clone(),
                (
                    i,
                    serde_json::from_str::<Type>(key).map_err(|e| e.to_string())?,
                    sort.clone(),
                ),
            ))
        })
        .collect::<LangResult<BTreeMap<_, _>>>()?;
    let e = Emit { elisions:Default::default(), sums:Default::default(), program:checked.module().program(),projection:checked.projection(), types };
    let p = checked.module().program();
    let plan = checked.plan();
    let projection = checked.projection();
    let (mut queries, observers) = ink_core::field_projection::host_observers(checked)?;
    queries.extend(checked.projection().codec_declarations()?);
    let transitions: BTreeMap<String,ink_core::logic::Declaration> = BTreeMap::new();
    let mut out = super::definition_literal::lower(checked.definition(), &queries)?;
    out.push_str(include_str!("observers.mjs"));
    out.push_str("function __repEqual(a,b){const work=[[a,b]];while(work.length){const [x,y]=work.pop();if(Object.is(x,y))continue;if(!x||!y||typeof x!=='object'||typeof y!=='object'||x.c!==y.c||x.a.length!==y.a.length)return false;for(let i=0;i<x.a.length;i++)work.push([x.a[i],y.a[i]]);}return true;}\n");
    out.push_str("const __encoder=new TextEncoder();\nfunction __keyCompare(a,b){if(typeof a==='string'&&typeof b==='string'){const x=__encoder.encode(a),y=__encoder.encode(b);for(let i=0;i<Math.min(x.length,y.length);i++)if(x[i]!==y[i])return x[i]<y[i]?-1:1;return x.length-y.length;}return a<b?-1:a>b?1:0;}\n\n");
    out.push_str(include_str!("snapshot.mjs"));
    out.push_str(&e.codecs()?);
    let layout = ink_core::snapshot::layout(checked.snapshot_module().program())?;
    let roots=p.states.iter().map(|s|{let Type::Table(k,v)=&s.ty else{return Err("representation state root".into())};Ok(serde_json::json!({"name":s.name,"key":super::descriptor(k,p,&mut BTreeSet::new())?,"value":super::descriptor(v,p,&mut BTreeSet::new())?,"snapshotKey":ink_core::snapshot_wire::descriptor(&layout.roots.iter().find(|(name,_,_)|name==&s.name).unwrap().1),"snapshotValue":ink_core::snapshot_wire::descriptor(&layout.roots.iter().find(|(name,_,_)|name==&s.name).unwrap().2)}))}).collect::<LangResult<Vec<_>>>()?;
    let events = p
        .events
        .iter()
        .map(|(n, t)| {
            Ok(serde_json::json!({"name":n,"type":super::descriptor(t,p,&mut BTreeSet::new())?,"snapshotType":ink_core::snapshot_wire::descriptor(&layout.events.iter().find(|(name,_)|name==n).unwrap().1)}))
        })
        .collect::<LangResult<Vec<_>>>()?;
    writeln!(out,"const __meta={};",serde_json::json!({"roots":roots,"events":events,"snapshot":{"program":layout.program,"schema":layout.schema}})).unwrap();
    out.push_str("function __fromTables(tables){const roots=[];\n");
    for (i, t) in projection.tables.iter().enumerate() {
        writeln!(out,"{{const rows=[...tables[{i}].entries()];let prior,tail=__node(0,[]);for(let j=rows.length-1;j>=0;j--){{const [key,value]=rows[j];tail=__node(1,[{},{},tail]);}}roots.push(tail);}}",e.read_mode(&t.key_type,"key","0","true")?,e.read_mode(&t.value_type,"value","0","true")?).unwrap();
    }
    out.push_str("return __node(0,roots);}\nfunction __tables(logical){const tables=[];\n");
    for (i, t) in projection.tables.iter().enumerate() {
        writeln!(out,"{{let cursor=logical.a[{i}],prior;const rows=new Map();while(cursor.c!==0){{const [key,value,tail]=cursor.a;rows.set({},{});cursor=tail;}}tables.push(rows);}}",e.write(&t.key_type,"key","0","true")?,e.write(&t.value_type,"value","0","true")?).unwrap();
    }
    out.push_str("return tables;}\nfunction __events(list){const events=[];let cursor=list;while(cursor.c!==0){const [event,tail]=cursor.a;switch(event.c){\n");
    for (i, (name, t)) in p.events.iter().enumerate() {
        writeln!(
            out,
            "case {i}:events.push([{}, {}, {}]);break;",
            super::quote(name),
            e.write(t, "event.a[0]", "0", "true")?,
            e.write(t, "event.a[0]", "0", "false")?
        )
        .unwrap();
    }
    out.push_str("default:throw Error('unknown source event');}cursor=tail;}return events;}\n");
    out.push_str("// CALLER CONTRACT: arguments must have declared types and canonical values.\n// Malformed data may throw, produce wrong results or corrupt state.\nexport function createState(){let version=0n,outbox=[],busy=false,transaction=null;\n");
    writeln!(
        out,
        "const initial=__node(0,[{}]);let physical=f_{}(initial);",
        projection
            .tables
            .iter()
            .map(|_| "__node(0,[])")
            .collect::<Vec<_>>()
            .join(","),
        plan.encode
    )
    .unwrap();
    let ir=ink_core::action_ir::CheckedActions::elaborate(checked.module())?;
    let effects=ink_core::effects::CheckedEffects::derive(&ir)?;
    out.push_str("const observers=__createObservers((name,args)=>{boundary();if(transaction)throw Error('subscription requires transaction boundary');switch(name){\n");
    for source in p.actions.iter().filter(|a|a.kind==ink_core::syntax::ActionKind::Query) {
        let mut reads=effects.action(&source.name).ok_or("representation query effects")?.access.reads.clone();
        if let Some(guard)=p.contracts.precondition_checks.get(&source.name){reads.extend(effects.action(guard).ok_or("precondition effects")?.access.reads.clone());}
        let roots=p.states.iter().enumerate().filter(|(_,s)|reads.contains(&s.name)).map(|(i,_)|i).collect::<Vec<_>>();
        writeln!(out,"case {}:{{const captured=[];",super::quote(&source.name)).unwrap();
        for(i,(_,t))in source.params.iter().enumerate(){
            let owned=e.read(t,&format!("args[{i}]"),"0")?;
            writeln!(out,"captured.push({});",e.write(t,&owned,"0","false")?).unwrap();
        }
        writeln!(out,"return {{roots:{},read:()=>invoke_native(name,captured,true),capture:v=>{},output:v=>{},equal:__repEqual}};}}",serde_json::to_string(&roots).unwrap(),e.read(&source.result,"v","0")?,e.write(&source.result,"v","0","false")?).unwrap();
    }
    out.push_str("default:throw Error('subscription requires a readonly query');}});\n");
    writeln!(out,"const preconditions={};",serde_json::to_string(&p.contracts.precondition_checks).map_err(|e|e.to_string())?).unwrap();
    out.push_str("function boundary(){if(busy)throw Error('state operation already in progress');}\nfunction invoke_native(name,args,resultOnly=false){boundary();try{if(preconditions[name] && invoke_native(preconditions[name],args,true)!==true)throw Error('contract precondition failed');switch(name){\n");
    for source in &p.actions {
        let a = &plan.actions[&source.name];
        writeln!(out, "case {}:{{", super::quote(&source.name)).unwrap();
        let mut args = vec!["physical".into(), "version".into()];
        for (i, (_, t)) in source.params.iter().enumerate() {
            writeln!(
                out,
                "const a{i}={};",
                e.read(t, &format!("args[{i}]"), "0")?
            )
            .unwrap();
            args.push(format!("a{i}"));
        }
        let query = format!("q_{}", a.execute);
        if queries.contains_key(&query) {
            writeln!(out,"const reply=f_{query}({});const result={};return resultOnly?result:{{result,committed:false,version,events:[]}};}}",args.join(","),e.write(&source.result,"reply","0","false")?).unwrap();
            continue;
        }
        let observation_fields = if a.compact.is_some() {
            "reply,committed,newVersion,events"
        } else {
            "reply,committed,newVersion,,events"
        };
        writeln!(out,"const executed=f_{}({});const observed=f_{}(executed),next=f_{}(executed);if(observed.c===1)throw Error('commit sequence exhausted');const [{observation_fields}]=observed.a;const result={},staged=__events(events),published=[];",if transitions.contains_key(&format!("t_{}",a.execute)) {format!("t_{}",a.execute)}else{a.execute.clone()},args.join(","),a.compact.as_ref().map(|c|c.observe.as_str()).unwrap_or(&observers[&source.name]),a.next,e.write(&source.result,"reply","0","false")?).unwrap();
        let roots=p.states.iter().enumerate().filter(|(_,s)|effects.action(&source.name).unwrap().access.writes.contains(&s.name)).map(|(i,_)|i).collect::<Vec<_>>();
        let mark_failure=source.kind==ink_core::syntax::ActionKind::Change&&matches!(source.result,Type::Result(..));
        writeln!(out,"if(committed){{for(let i=0;i<staged.length;i++){{const [channel,value,publicValue]=staged[i];outbox.push({{commit:newVersion,position:BigInt(i),channel,value}});if(!resultOnly)published.push({{commit:newVersion,position:BigInt(i),channel,value:publicValue}});}}}}physical=next;version=newVersion;if(!committed&&{mark_failure}&&transaction?.strict)transaction.failure=Object.assign(Error('transaction action failed'),{{action:name,result}});if(committed)observers.commit({});return resultOnly?result:{{result,committed,version:newVersion,events:published}};}}",serde_json::to_string(&roots).unwrap()).unwrap();
    }
    out.push_str("default:throw Error(`unknown action ${name}`);}}catch(e){if(transaction?.strict)transaction.failure=e;throw e;}}\nasync function invoke_json(name,args){return invoke_native(name,args);}\n");
    writeln!(out,"const actionNames=new Set({});",serde_json::to_string(&p.actions.iter().map(|a|&a.name).collect::<Vec<_>>()).map_err(|e|e.to_string())?).unwrap();
    out.push_str("return Object.freeze({subscribe:observers.subscribe,subscribeGroup:observers.subscribeGroup,subscribeValues:(...args)=>observers.subscribeValues(...args),batch:observers.batch,flushSubscriptions:observers.flush,takeSubscriptionErrors:observers.takeErrors,transaction(callback){if(typeof callback!=='function'||Object.prototype.toString.call(callback)==='[object AsyncFunction]')throw TypeError('transaction callback must be synchronous');this.beginTransaction();transaction.strict=true;try{const value=callback(this);if(value&&typeof value.then==='function')throw TypeError('state transaction callback must be synchronous');this.commitTransaction();return value;}catch(e){this.rollbackTransaction();throw e;}},invoke:invoke_json,invoke_json,bind(name,{resultOnly=false}={}){if(!actionNames.has(name))throw Error(`unknown action ${name}`);return (...args)=>invoke_native(name,args,resultOnly);},beginTransaction(){boundary();if(transaction)throw Error('state transaction already in progress');transaction={physical,version,outbox,length:outbox.length,notificationMark:observers.hold()};return true;},commitTransaction(){boundary();if(!transaction)throw Error('no state transaction');if(transaction.failure)throw transaction.failure;transaction=null;observers.release();},rollbackTransaction(){boundary();if(!transaction)throw Error('no state transaction');physical=transaction.physical;version=transaction.version;outbox=transaction.outbox;outbox.length=transaction.length;const mark=transaction.notificationMark;transaction=null;observers.rollback(mark);},");

    out.push_str("get version(){return version;},get outbox(){return outbox.map(e=>({...e,value:__publicEvent(e.channel,e.value)}));},acknowledge_through(commit,position){boundary();commit=BigInt(commit);position=BigInt(position);outbox=outbox.filter(e=>e.commit>commit||(e.commit===commit&&e.position>position));},async checkpoint(limits){boundary();\n");
    writeln!(out,"const logical=f_{}(physical);return __snapshotEncode(__meta,{{version,tables:__tables(logical),outbox}},limits);}},async restore(bytes,limits){{boundary();if(transaction)throw Error('restore during state transaction');busy=true;observers.hold();let restored=false;try{{const saved=await __snapshotDecode(__meta,bytes,limits);const logical=__fromTables(saved.tables);",plan.decode).unwrap();
    for (index,guard) in checked.source_invariant_guards().into_iter().enumerate(){
        writeln!(out,"const guard{index}=f_{}(logical,saved.version);if(guard{index}.c!==0||guard{index}.a[0]!==true)throw Error('snapshot violates state invariant');",guard.function).unwrap();
    }
    writeln!(out,"const next=f_{}(logical);",plan.encode).unwrap();
    writeln!(out,"physical=next;version=saved.version;outbox=saved.outbox;restored=true;}}finally{{busy=false;if(restored)observers.commit({});observers.release();}}}}}});}}",serde_json::to_string(&(0..p.states.len()).collect::<Vec<_>>()).unwrap()).unwrap();
    out.push_str("function __publicEvent(channel,value){switch(channel){\n");
    for (name, t) in &p.events {
        writeln!(
            out,
            "case {}:return {};",
            super::quote(name),
            e.write(t, &e.read_mode(t, "value", "0", "true")?, "0", "false")?
        )
        .unwrap();
    }
    out.push_str("default:throw Error('unknown source event');}}\n");
    if out.len() > 16_000_000 {
        return Err("standalone representation source size limit".into());
    }
    Ok(out)
}
