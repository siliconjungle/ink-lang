"""Second private compiler experiment: exact raw words with an aliased F32 view."""
from pathlib import Path
import shutil,hashlib,json
here=Path(__file__).parent;base=here/'package';out=here/'typed';out.mkdir(exist_ok=False);package=out/'package';shutil.copytree(base,package)
p=package/'src/lib.rs';s=p.read_text()
a='''"new {}(Array.from({}))",
                        if !self.native_f32 && **inner==Type::F32 {"__InkF32Buffer"}else{"__InkBuffer"},
                        self.expr(&args[0], env, Some(&Type::List(inner.clone())))?'''
b='''"new {}({}{})",
                        if !self.native_f32 && **inner==Type::F32 {"__InkF32Buffer"}else{"__InkBuffer"},
                        if !self.native_f32 && **inner==Type::F32 {""}else{"Array.from("},
                        format!("{}{}",self.expr(&args[0], env, Some(&Type::List(inner.clone())))?,if !self.native_f32 && **inner==Type::F32 {""}else{")"})'''
assert s.count(a)==1;s=s.replace(a,b)
a='''"push" if numeric_buffer => format!("{xv}.numberPush(__nfFromBits({kv}))"),''';assert s.count(a)==1;s=s.replace(a,'''"push" if numeric_buffer => format!("{xv}.push({kv})"),''');p.write_text(s)
p=package/'src/temporary.mjs';s=p.read_text();s=s[:s.index('// PRIVATE EXPERIMENT:')]+'''
// PRIVATE EXPERIMENT: both views address the same exact invocation-local words.
class __InkF32Buffer {
 constructor(data,start=0,end=data.length,shared=false,reuse=false){this.data=reuse?data:Uint32Array.from(data);this.numbers=new Float32Array(this.data.buffer);this.start=start;this.end=end;this.shared=shared;}
 get length(){return this.end-this.start;}
 set length(n){this.end=this.start+Math.min(this.length,n);}
 item(i){return this.data[this.start+i];}
 numberItem(i){const n=this.numbers[this.start+i];return Number.isNaN(n)?__nfFromBits(this.data[this.start+i]):n;}
 numberSet(i,v){if(i<this.length){const k=this.start+i;if(typeof v==='number'){this.numbers[k]=v;if(Number.isNaN(v))this.data[k]=0x7fc00000;}else this.data[k]=v.F32Bits;}return this;}
 set(i,v){if(i<this.length)this.data[this.start+i]=v;return this;}
 range(start,count){const begin=this.start+Math.min(start,this.length);return new __InkF32Buffer(this.data,begin,begin+Math.min(count,this.end-begin),true,true);}
 fill_range(start,count,value){start=Math.min(start,this.length);count=Math.min(count,this.length-start);this.data.fill(value,this.start+start,this.start+start+count);return this;}
 copy_within(source,destination,count){source=Math.min(source,this.length);destination=Math.min(destination,this.length);count=Math.min(count,this.length-source,this.length-destination);this.data.copyWithin(this.start+destination,this.start+source,this.start+source+count);return this;}
 swap(a,b){if(a<this.length&&b<this.length){const x=this.item(a);this.set(a,this.item(b));this.set(b,x);}return this;}
 detach(extra=0){if(this.shared||this.start!==0||this.end+extra>this.data.length){const length=this.length;const capacity=Math.min(4294967295,Math.max(length+extra,Math.min(this.data.length,2147483647)*2,4));const data=new Uint32Array(capacity);data.set(this.data.subarray(this.start,this.end));this.data=data;this.numbers=new Float32Array(data.buffer);this.start=0;this.end=length;this.shared=false;}}
 push(v){if(this.length>=4294967295)throw Error('buffer length exhausted');this.detach(1);this.data[this.end++]=v;return this;}
 numberPush(v){if(this.length>=4294967295)throw Error('buffer length exhausted');this.detach(1);const i=this.end++;if(typeof v==='number'){this.numbers[i]=v;if(Number.isNaN(v))this.data[i]=0x7fc00000;}else this.data[i]=v.F32Bits;return this;}
 pop(){this.length=Math.max(0,this.length-1);return this;}
 truncate(n){this.length=Math.min(this.length,n);return this;}
 slice(start=0,end=this.length){return Array.from(this.data.subarray(this.start+start,this.start+Math.min(end,this.length)));}
 freeze(){return this.slice();}
 *[Symbol.iterator](){for(let i=this.start;i<this.end;i++)yield this.data[i];}
}
function __bufferF32Fill(n,v){const data=new Uint32Array(n);data.fill(__nfBits(v));return new __InkF32Buffer(data,0,n,false,true);}
function __bufferF32Split(x,at){const cut=x.start+Math.min(at,x.length);x.shared=true;return [new __InkF32Buffer(x.data,x.start,cut,true,true),new __InkF32Buffer(x.data,cut,x.end,true,true)];}
function __bufferF32Append(a,b){
 if(a.length+b.length>4294967295)throw Error('buffer length exhausted');
 if(a.data===b.data&&a.end===b.start)return new __InkF32Buffer(a.data,a.start,b.end,a.start!==0||b.end!==a.data.length,true);
 a.detach(b.length);a.data.set(b.data.subarray(b.start,b.end),a.end);a.end+=b.length;return a;
}
''';p.write_text(s)
manifest={str(p.relative_to(package)):hashlib.sha256(p.read_bytes()).hexdigest()for p in package.rglob('*')if p.is_file()};(out/'sources.json').write_text(json.dumps({'status':'private-unadmitted-source-experiment','parent_sources_sha256':hashlib.sha256((here/'sources.json').read_bytes()).hexdigest(),'after':manifest},indent=2)+'\n');print(package)
