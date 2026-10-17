"""Private source-level feasibility study. Does not mutate the published emitter."""
from pathlib import Path
import subprocess,hashlib,json
root=Path(__file__).resolve().parents[2]
base=root/'lowerings/js'; out=Path(__file__).parent; package=out/'package'
package.mkdir(exist_ok=False)
files=subprocess.check_output(['git','ls-files','-z'],cwd=base).decode().split('\0')
before={}
for f in filter(None,files):
 p=base/f
 if not p.is_file():continue
 data=p.read_bytes();before[f]=hashlib.sha256(data).hexdigest()
 q=package/f;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(data)
def edit(name,a,b):
 p=package/name;s=p.read_text();assert s.count(a)==1,(name,s.count(a),a[:90]);p.write_text(s.replace(a,b))
edit('src/lib.rs','bit_f32_numbers: BTreeSet<String>,','bit_f32_numbers: BTreeSet<String>,\n    bit_f32_normalized: BTreeSet<String>,')
edit('src/lib.rs','bit_f32_numbers: BTreeSet::new(),','bit_f32_numbers: BTreeSet::new(),\n        bit_f32_normalized: BTreeSet::new(),')
edit('src/lib.rs','else if self.bit_f32_numbers.contains(bound) { format!("__bits({bound})") }','else if self.bit_f32_numbers.contains(bound) { format!("__bits({bound})") }\n                else if self.bit_f32_normalized.contains(bound) { format!("__nfBits({bound})") }')
edit('src/lib.rs','else if self.bit_f32_numbers.contains(v) { format!("__bits({v})") } else { v.clone() })','else if self.bit_f32_numbers.contains(v) { format!("__bits({v})") }\n                    else if self.bit_f32_normalized.contains(v) { format!("__nfBits({v})") } else { v.clone() })')
edit('src/lib.rs','let value = if native_number {','let buffer_carrier = !self.native_f32 && at==Type::F32 && self.buffer_float_read(a,env)\n                    && self.float_consumer(b,n);\n                let value = if buffer_carrier {\n                    let value=self.buffer_float_value(a,env)?;let value=self.bind(&value);\n                    self.bit_f32_normalized.insert(value.clone());value\n                } else if native_number {')
edit('src/helper_inline.rs','let bit_floats = e.bit_f32_numbers.clone();','let bit_floats = e.bit_f32_numbers.clone();\n    let bit_normalized=e.bit_f32_normalized.clone();')
edit('src/helper_inline.rs','e.bit_f32_numbers = bit_floats;','e.bit_f32_numbers = bit_floats;\n    e.bit_f32_normalized=bit_normalized;')
edit('src/float_islands.rs','let value = self.expr(e, env, Some(&Type::F32))?;','if self.buffer_float_read(e,env) {\n            let value=self.buffer_float_value(e,env)?;let value=self.bind(&value);\n            return Ok(format!("__nfNumber({value})"));\n        }\n        let value = self.expr(e, env, Some(&Type::F32))?;')
edit('src/float_islands.rs','if self.bit_f32_numbers.contains(local) { return Ok(local.clone()); }','if self.bit_f32_numbers.contains(local) { return Ok(local.clone()); }\n            if self.bit_f32_normalized.contains(local) {return Ok(format!("__nfNumber({local})"));}')
p=package/'src/float_islands.rs';s=p.read_text();s+='''
impl Emitter<'_> {
    pub(super) fn buffer_float_read(&self,e:&Expr,env:&Env)->bool {
        matches!(e,Expr::Method(x,n,_) if n=="at_or" && self.infer(x,env,None).ok()==Some(Type::Buffer(Box::new(Type::F32))))
    }
    pub(super) fn buffer_float_store(&mut self,e:&Expr,env:&Env)->LangResult<String> {
        if matches!(e,Expr::Binary(op,_,_) if arithmetic(op)) {return self.float_number(e,env);}
        if let Expr::Var(n)=e {
            let local=&env[n].0;
            if self.bit_f32_normalized.contains(local) || self.bit_f32_numbers.contains(local) {
                // Ordinary entry owns checking and node accounting; the local
                // already holds a private immutable Number or exact NaN tag.
                let local=local.clone();self.expr(e,env,Some(&Type::F32))?;return Ok(local);
            }
        }
        if self.buffer_float_read(e,env) {return self.buffer_float_value(e,env);}
        let v=self.expr(e,env,Some(&Type::F32))?;let v=self.bind(&v);Ok(format!("__nfFromBits({v})"))
    }
    pub(super) fn buffer_float_value(&mut self,e:&Expr,env:&Env)->LangResult<String> {
        if self.depth>=EXPRESSION_DEPTH{return Err("JavaScript expression emission depth budget exceeded".into());}
        if self.budget==0{return Err("JavaScript emission budget exceeded".into());}
        self.budget-=1;self.depth+=1;
        let result=(||{
            let Expr::Method(x,_,args)=e else{unreachable!()};
            let x=self.expr(x,env,None)?;let x=self.bind(&x);
            let k=self.expr(&args[0],env,Some(&Type::U32))?;let k=self.bind(&k);
            let out=self.fresh();self.line(format!("let {out};if({k}<{x}.length){{{out}={x}.numberItem({k});}}else{{"));
            let fallback=self.buffer_float_store(&args[1],env)?;self.line(format!("{out}={fallback};}}"));Ok(out)
        })();self.depth-=1;result
    }
}
''';p.write_text(s)
edit('src/lib.rs','''"new __InkBuffer(Array.from({}))",
                        self.expr(&args[0], env, Some(&Type::List(inner.clone())))?''','''"new {}(Array.from({}))",
                        if !self.native_f32 && **inner==Type::F32 {"__InkF32Buffer"}else{"__InkBuffer"},
                        self.expr(&args[0], env, Some(&Type::List(inner.clone())))?''')
edit('src/lib.rs','''"__bufferFill({},{})",
                        self.expr(&args[0], env, Some(&Type::U32))?,
                        self.expr(&args[1], env, Some(inner))?''','''"{}({},{})",
                        if !self.native_f32 && **inner==Type::F32 {"__bufferF32Fill"}else{"__bufferFill"},
                        self.expr(&args[0], env, Some(&Type::U32))?,
                        if !self.native_f32 && **inner==Type::F32 {self.buffer_float_store(&args[1],env)?}else{self.expr(&args[1], env, Some(inner))?}''')
edit('src/lib.rs','''"new __InkBuffer([])".into()''','''if !self.native_f32 && t==Type::Buffer(Box::new(Type::F32)){"new __InkF32Buffer([])".into()}else{"new __InkBuffer([])".into()}''')
edit('src/lib.rs','''let xt = self.infer(x, env, None)?;
                let xv = self.expr(x, env, None)?;''','''let xt = self.infer(x, env, None)?;
                let numeric_buffer=!self.native_f32 && xt==Type::Buffer(Box::new(Type::F32));
                let xv = self.expr(x, env, None)?;''')
# Selected map and indexed-map callbacks keep their element as a tagged numeric
# carrier; scan retains the old exact-bit accumulator in this initial study.
edit('src/lib.rs','''let element = self.bind(&format!("{xv}.item({i})"));
                    let value = if n == "scan"''','''let element = self.bind(&format!("{xv}.{}({i})",if numeric_buffer && n!="scan"{"numberItem"}else{"item"}));
                    if numeric_buffer && n!="scan"{self.bit_f32_normalized.insert(element.clone());}
                    let value = if n == "scan"''')
edit('src/lib.rs','''self.expr(body, &local, Some(inner))?
                    };
                    self.line(format!("{xv}.set({i},{value});}}"));''','''if numeric_buffer {self.buffer_float_store(body,&local)?}else{self.expr(body, &local, Some(inner))?}
                    };
                    self.line(format!("{xv}.{}({i},{value});}}",if numeric_buffer && n!="scan"{"numberSet"}else{"set"}));''')
edit('src/lib.rs','''"new __InkBuffer({})",
                        self.parallel(xv, grain, &args[1], env, inner, inner)?''','''"new {}({})",
                        if numeric_buffer{"__InkF32Buffer"}else{"__InkBuffer"},
                        self.parallel(xv, grain, &args[1], env, inner, inner)?''')
edit('src/lib.rs','''let parts = self.bind(&format!("__bufferSplit({xv},{at})"));''','''let parts = self.bind(&format!("{}({xv},{at})",if numeric_buffer{"__bufferF32Split"}else{"__bufferSplit"}));''')
edit('src/lib.rs','''return Ok(format!("__bufferAppend({xv},{other})"));''','''return Ok(format!("{}({xv},{other})",if numeric_buffer{"__bufferF32Append"}else{"__bufferAppend"}));''')
edit('src/lib.rs','''"set" => format!(
                        "__tempSet({xv},{kv},{},{})",
                        self.expr(&args[1], env, Some(value))?,
                        matches!(xt, Type::Map(..))
                    ),''','''"set" if numeric_buffer => {let v=self.buffer_float_store(&args[1],env)?;format!("{xv}.numberSet({kv},{v})")},
                    "set" => format!(
                        "__tempSet({xv},{kv},{},{})",
                        self.expr(&args[1], env, Some(value))?,
                        matches!(xt, Type::Map(..))
                    ),''')
# push's first argument was already evaluated in the common dispatch. Its
# numeric conversion is literal, not a second evaluation of the source.
edit('src/lib.rs','''"push" | "pop" | "truncate" | "remove" => {''','''"push" if numeric_buffer => format!("{xv}.numberPush(__nfFromBits({kv}))"),
                    "push" | "pop" | "truncate" | "remove" => {''')
edit('src/lib.rs','''"__InkBuffer",
        "__bufferSplit",''','''"__InkBuffer",
        "__InkF32Buffer",
        "__bufferF32Fill",
        "__bufferSplit",''')
p=package/'src/temporary.mjs';s=p.read_text();s+='''
// PRIVATE EXPERIMENT: stateful F32 owners use rounded Numbers / private NaN tags.
class __InkF32Buffer extends __InkBuffer {
 constructor(data,start=0,end=data.length,shared=false,normalized=false){super(normalized?data:data.map(__nfFromBits),start,end,shared);}
 numberItem(i){return this.data[this.start+i];}
 item(i){return __nfBits(this.numberItem(i));}
 numberSet(i,v){return super.set(i,v);}
 set(i,v){return this.numberSet(i,__nfFromBits(v));}
 numberPush(v){return super.push(v);}
 push(v){return this.numberPush(__nfFromBits(v));}
 range(start,count){const begin=this.start+Math.min(start,this.length);return new __InkF32Buffer(this.data,begin,begin+Math.min(count,this.end-begin),true,true);}
 fill_range(start,count,value){return super.fill_range(start,count,__nfFromBits(value));}
 swap(a,b){if(a<this.length&&b<this.length){const x=this.numberItem(a);this.numberSet(a,this.numberItem(b));this.numberSet(b,x);}return this;}
 slice(start=0,end=this.length){return this.data.slice(this.start+start,this.start+Math.min(end,this.length)).map(__nfBits);}
 freeze(){return this.slice();}
 *[Symbol.iterator](){for(let i=this.start;i<this.end;i++)yield __nfBits(this.data[i]);}
}
function __bufferF32Fill(n,v){return new __InkF32Buffer(new Array(n).fill(v),0,n,false,true);}
function __bufferF32Split(x,at){const cut=x.start+Math.min(at,x.length);x.shared=true;return [new __InkF32Buffer(x.data,x.start,cut,true,true),new __InkF32Buffer(x.data,cut,x.end,true,true)];}
function __bufferF32Append(a,b){
 if(a.length+b.length>4294967295)throw Error('buffer length exhausted');
 if(a.data===b.data&&a.end===b.start)return new __InkF32Buffer(a.data,a.start,b.end,a.start!==0||b.end!==a.data.length,true);
 a.detach();for(let i=0;i<b.length;i++)a.numberPush(b.numberItem(i));return a;
}
''';p.write_text(s)
after={str(p.relative_to(package)):hashlib.sha256(p.read_bytes()).hexdigest()for p in package.rglob('*')if p.is_file()}
(out/'sources.json').write_text(json.dumps({'status':'private-unadmitted-source-experiment','base_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=base,text=True).strip(),'before':before,'after':after},indent=2)+'\n')
print(package)
