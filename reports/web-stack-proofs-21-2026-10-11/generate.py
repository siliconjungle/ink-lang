"""Original materialized stages and strongest already-fused one-pass controls."""
import ast,json
from pathlib import Path
from spec import TASKS,source,public_spec
HERE=Path(__file__).resolve().parent

def expression(text,language):
    def go(n):
        if isinstance(n,ast.Name):return n.id
        if isinstance(n,ast.Constant):
            if isinstance(n.value,bool):return str(n.value).lower()
            return str(n.value)+('u32' if language=='rust' else '')
        if isinstance(n,ast.Compare):return '('+go(n.left)+{ast.Lt:'<',ast.Gt:'>',ast.Eq:'=='}[type(n.ops[0])]+go(n.comparators[0])+')'
        if isinstance(n,ast.Call):
            if n.func.id in ['quot_or','rem_or']:return ('quot' if n.func.id=='quot_or' else 'rem')+'('+','.join(map(go,n.args))+')'
            assert n.func.id=='choose';c,a,b=map(go,n.args)
            return f'({c}?{a}:{b})' if language=='js' else f'(if {c}{{{a}}}else{{{b}}})'
        if isinstance(n,ast.BinOp):
            op={ast.Add:'add',ast.Sub:'sub',ast.Mult:'mul'}[type(n.op)];a,b=go(n.left),go(n.right)
            return f'{op}({a},{b})' if language=='js' else f'({a}).wrapping_{op}({b})'
        raise ValueError(ast.dump(n))
    return go(ast.parse(text,mode='eval').body)
def js_body(t,expert):
    e=lambda s:expression(s,'js');op=t['operation']
    if t['output']=='u32':
        p,f,g=[e(t[z]) for z in ['predicate','positive','negative']];result={'add':'add(a,b)','subtract':'sub(a,b)','weighted':'add(mul(a,k),mul(b,3))'}[op]
        if expert:
            if op!='weighted':return f'let a=0;for(let j=0;j<xs.length;j++){{const x=xs[j];if({p})a=add(a,{f});else a='+('add' if op=='add' else 'sub')+f'(a,{g});}}return a;'
            return f'let a=0,b=0;for(let j=0;j<xs.length;j++){{const x=xs[j];if({p})a=add(a,{f});else b=add(b,{g});}}return {result};'
        return f'const positive=Array.from(xs).filter(x=>{p}).map(x=>{f});let a=0;for(const x of positive)a=add(a,x);const negative=Array.from(xs).filter(x=>!{p}).map(x=>{g});let b=0;for(const x of negative)b=add(b,x);return {result};'
    first,second=e(t['first']),e(t['second'])
    if expert:return f'const out=scratch[{t["index"]}];for(let j=0;j<xs.length;j++){{const i=j>>>0;let x=xs[j];const value={first};x=value;out[j]={second};}}return out.subarray(0,xs.length);'
    return f'const first=Array.from(xs,(x,j)=>{{const i=j>>>0;return {first};}});return first.map((x,j)=>{{const i=j>>>0;return {second};}});'
def rust_scalar(t):
    return t['output']=='u32'
def rust_body(t,expert):
    e=lambda s:expression(s,'rust');op=t['operation']
    if rust_scalar(t):
        p,f,g=[e(t[z]) for z in ['predicate','positive','negative']];result={'add':'a.wrapping_add(b)','subtract':'a.wrapping_sub(b)','weighted':'a.wrapping_mul(k).wrapping_add(b.wrapping_mul(3))'}[op]
        if expert:
            if op!='weighted':return f'let mut a=0u32;for &x in xs{{if {p}{{a=a.wrapping_add({f});}}else{{a=a.wrapping_'+('add' if op=='add' else 'sub')+f'({g});}}}}a as u64'
            return f'let mut a=0u32;let mut b=0u32;for &x in xs{{if {p}{{a=a.wrapping_add({f});}}else{{b=b.wrapping_add({g});}}}}({result}) as u64'
        return f'let filtered:Vec<u32>=xs.iter().copied().filter(|&x|{p}).collect();let mapped:Vec<u32>=filtered.iter().map(|&x|{f}).collect();let mut a=0u32;for x in mapped{{a=a.wrapping_add(x);}}let filtered:Vec<u32>=xs.iter().copied().filter(|&x|!{p}).collect();let mapped:Vec<u32>=filtered.iter().map(|&x|{g}).collect();let mut b=0u32;for x in mapped{{b=b.wrapping_add(x);}}({result}) as u64'
    first,second=e(t['first']),e(t['second'])
    if expert:return f'for(j,&original)in xs.iter().enumerate(){{let i=j as u32;let x=original;let value={first};let x=value;*out.add(j)={second};}}xs.len()'
    return f'let first:Vec<u32>=xs.iter().enumerate().map(|(j,&x)|{{let i=j as u32;{first}}}).collect();let second:Vec<u32>=first.iter().enumerate().map(|(j,&x)|{{let i=j as u32;{second}}}).collect();for(j,&value)in second.iter().enumerate(){{*out.add(j)=value;}}xs.len()'
def generate():
    (HERE/'spec.json').write_text(json.dumps(public_spec(),indent=2)+'\n');(HERE/'kernels.ink').write_text('module WebProof21;\n'+'\n'.join(source(t) for t in TASKS)+'\n')
    for mode in ['literal','expert']:
        expert=mode=='expert';common='const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0,quot=(a,b,z)=>b?Math.floor(a/b)>>>0:z,rem=(a,b,z)=>b?a%b:z;\n'
        functions=',\n'.join(f'"{t["name"]}":(xs,ys,seed,k)=>{{{js_body(t,expert)}}}' for t in TASKS)
        if expert:js=common+'export function createExpert(capacity){const scratch=Object.fromEntries('+json.dumps([t['index'] for t in TASKS if t['output']=='list_u32'])+'.map(i=>[i,new Uint32Array(capacity)]));const functions={'+functions+'};return {call:(name,args)=>functions[name](...args)};}\n'
        else:js=common+'const functions={'+functions+'};export const call=(name,args)=>functions[name](...args);\n'
        (HERE/f'{mode}.mjs').write_text(js)
        rust='// Exact source-stage/fused wrapping algorithms shared by native and Wasm.\nfn quot(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a/b}}\nfn rem(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a%b}}\n#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}\n#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}\n'
        rust+='pub fn bench_scalar(case:u32,xs:&[u32],ys:&[u32],seed:u32,k:u32)->u64{match case{\n'+'\n'.join(f'{t["index"]}=>{{{rust_body(t,expert)}}},' for t in TASKS if rust_scalar(t))+'\n_=>panic!("non-scalar case")}}\n'
        rust+='#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{\n'
        rust+='\n'.join(f'{t["index"]}=>{{*out=bench_scalar(case,xs,ys,seed,k) as u32;1}},' if rust_scalar(t) else f'{t["index"]}=>{{{rust_body(t,expert)}}},' for t in TASKS)+'\n_=>panic!("unknown case")}}\n';(HERE/f'{mode}.rs').write_text(rust)
if __name__=='__main__':generate()
