"""Literal source-stage controls and unrestricted one-pass expert controls."""
import ast,json
from pathlib import Path
from spec import TASKS,source,public_spec
HERE=Path(__file__).resolve().parent

def expression(text,language):
    def go(n):
        if isinstance(n,ast.Name):return n.id
        if isinstance(n,ast.Constant):return str(n.value)+('u32' if language=='rust' else '')
        if isinstance(n,ast.Compare):return '('+go(n.left)+{ast.Lt:'<',ast.Gt:'>',ast.Eq:'=='}[type(n.ops[0])]+go(n.comparators[0])+')'
        if isinstance(n,ast.Call):
            assert n.func.id=='choose';c,a,b=map(go,n.args)
            return f'({c}?{a}:{b})' if language=='js' else f'(if {c}{{{a}}}else{{{b}}})'
        if isinstance(n,ast.BinOp):
            op={ast.Add:'add',ast.Sub:'sub',ast.Mult:'mul'}[type(n.op)];a,b=go(n.left),go(n.right)
            return f'{op}({a},{b})' if language=='js' else f'({a}).wrapping_{op}({b})'
        raise ValueError(ast.dump(n))
    return go(ast.parse(text,mode='eval').body)
def js_body(t,expert):
    if t['operation']=='paired':
        left,right,combine=[expression(t[z],'js') for z in ['left','right','combine']]
        if expert:return f'const out=scratch[{t["index"]}];for(let i=0;i<xs.length;i++){{const x=xs[i],a={left},b={right};out[i]={combine};}}return out.subarray(0,xs.length);'
        return f'const left=Array.from(xs,x=>{left}),right=Array.from(xs,x=>{right}),out=new Array(xs.length);for(let i=0;i<out.length;i++){{const a=left[i],b=right[i];out[i]={combine};}}return out;'
    p,f=[expression(t[z],'js') for z in ['predicate','mapper']]
    result={'recombine':'add(a,b)','contrast':'sub(a,b)','weighted':'add(mul(a,k),mul(b,3))'}[t['operation']]
    if not expert:return f'const positive=Array.from(xs).filter(x=>{p}).map(x=>{f});let a=0;for(const x of positive)a=add(a,x);const negative=Array.from(xs).filter(x=>!{p}).map(x=>{f});let b=0;for(const x of negative)b=add(b,x);return {result};'
    if t['operation']=='recombine':return f'let a=0;for(let i=0;i<xs.length;i++){{const x=xs[i];a=add(a,{f});}}return a;'
    return f'let a=0,b=0;for(let i=0;i<xs.length;i++){{const x=xs[i],value={f};if({p})a=add(a,value);else b=add(b,value);}}return {result};'
def rust_body(t,expert):
    if t['operation']=='paired':
        left,right,combine=[expression(t[z],'rust') for z in ['left','right','combine']]
        if expert:return f'for(i,&x)in xs.iter().enumerate(){{let a={left};let b={right};*out.add(i)={combine};}}xs.len()'
        return f'let left:Vec<u32>=xs.iter().map(|&x|{left}).collect();let right:Vec<u32>=xs.iter().map(|&x|{right}).collect();for(i,(&a,&b))in left.iter().zip(right.iter()).enumerate(){{*out.add(i)={combine};}}xs.len()'
    p,f=[expression(t[z],'rust') for z in ['predicate','mapper']]
    result={'recombine':'a.wrapping_add(b)','contrast':'a.wrapping_sub(b)','weighted':'a.wrapping_mul(k).wrapping_add(b.wrapping_mul(3))'}[t['operation']]
    if not expert:return f'let positive:Vec<u32>=xs.iter().copied().filter(|&x|{p}).collect();let mapped:Vec<u32>=positive.iter().map(|&x|{f}).collect();let mut a=0u32;for x in mapped{{a=a.wrapping_add(x);}}let negative:Vec<u32>=xs.iter().copied().filter(|&x|!{p}).collect();let mapped:Vec<u32>=negative.iter().map(|&x|{f}).collect();let mut b=0u32;for x in mapped{{b=b.wrapping_add(x);}}*out={result};1'
    if t['operation']=='recombine':return f'let mut a=0u32;for &x in xs{{a=a.wrapping_add({f});}}*out=a;1'
    return f'let mut a=0u32;let mut b=0u32;for &x in xs{{let value={f};if {p}{{a=a.wrapping_add(value);}}else{{b=b.wrapping_add(value);}}}}*out={result};1'
def generate():
    for i,t in enumerate(TASKS):t['index']=i
    (HERE/'spec.json').write_text(json.dumps(public_spec(),indent=2)+'\n')
    (HERE/'kernels.ink').write_text('module WebProof19;\n'+'\n'.join(source(t) for t in TASKS)+'\n')
    for mode in ['literal','expert']:
        expert=mode=='expert';common='const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;\n'
        functions=',\n'.join(f'"{t["name"]}":(xs,ys,seed,k)=>{{{js_body(t,expert)}}}' for t in TASKS)
        if expert:js=common+'export function createExpert(capacity){const scratch=Object.fromEntries('+json.dumps([t['index'] for t in TASKS if t['output']=='list_u32'])+'.map(i=>[i,new Uint32Array(capacity)]));const functions={'+functions+'};return {call:(name,args)=>functions[name](...args)};}\n'
        else:js=common+'const functions={'+functions+'};export const call=(name,args)=>functions[name](...args);\n'
        (HERE/f'{mode}.mjs').write_text(js)
        rust='// Same Rust source for native and Wasm, wrapping word operations.\n#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}\n#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}\n#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let _ys=std::slice::from_raw_parts(yp,yn);match case{\n'
        rust+='\n'.join(f'{t["index"]}=>{{{rust_body(t,expert)}}},' for t in TASKS)+'\n_=>panic!("unknown case")}}\n'
        (HERE/f'{mode}.rs').write_text(rust)
if __name__=='__main__':generate()
