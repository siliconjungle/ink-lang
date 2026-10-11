"""Source-only staged and fused controls; native/Wasm use identical Rust."""
import ast,json
from pathlib import Path
from spec import TASKS,source,public_spec,expressions
HERE=Path(__file__).resolve().parent

def expression(text,language):
    def convert(n):
        if isinstance(n,ast.Name):return n.id
        if isinstance(n,ast.Constant):return str(n.value)+('u32' if language=='rust' else '')
        if isinstance(n,ast.Compare):
            op={ast.Lt:'<',ast.Gt:'>',ast.Eq:'=='}[type(n.ops[0])]
            return '('+convert(n.left)+op+convert(n.comparators[0])+')'
        if isinstance(n,ast.Call):
            if n.func.id=='quot_or':
                a,b,c=map(convert,n.args)
                return f'quot({a},{b},{c})' if language=='js' else f'quot({a},{b},{c})'
            assert n.func.id=='choose' and len(n.args)==3
            c,a,b=map(convert,n.args)
            return f'({c}?{a}:{b})' if language=='js' else f'(if {c}{{{a}}}else{{{b}}})'
        if isinstance(n,ast.BinOp):
            op={ast.Add:'add',ast.Sub:'sub',ast.Mult:'mul'}[type(n.op)]
            a,b=convert(n.left),convert(n.right)
            return f'{op}({a},{b})' if language=='js' else f'({a}).wrapping_{op}({b})'
        raise ValueError(ast.dump(n))
    return convert(ast.parse(text,mode='eval').body)



def js_body(t,expert):
    e=expression(t['expression'],'js')
    if t['operation']=='sort_reduce':
        if expert:return f'let a=0;for(let i=0;i<xs.length;i++){{const x=xs[i];a=add(a,{e});}}return a;'
        return f'const sorted=Array.from(xs).sort((a,b)=>a-b),mapped=sorted.map(x=>{e});let a=0;for(let i=0;i<mapped.length;i++)a=add(a,mapped[i]);return a;'
    if expert:return f'const out=scratch[{t["index"]}];for(let i=0;i<xs.length;i++){{const a=xs[i];out[i]={e};}}return out.subarray(0,xs.length);'
    return f'return Array.from(xs,x=>{{let a=x;for(let j=0;j<{t["iterations"]};j++)a={e};return a;}});'

def rust_body(t,expert):
    e=expression(t['expression'],'rust')
    if t['operation']=='sort_reduce':
        if expert:return f'let mut a=0u32;for &x in xs{{a=a.wrapping_add({e});}}*out=a;1'
        return f'let mut sorted=xs.to_vec();sorted.sort_unstable();let mapped:Vec<u32>=sorted.iter().map(|&x|{e}).collect();let mut a=0u32;for x in mapped{{a=a.wrapping_add(x);}}*out=a;1'
    if expert:return f'for(i,&a)in xs.iter().enumerate(){{*out.add(i)={e};}}xs.len()'
    return f'for(i,&x)in xs.iter().enumerate(){{let mut a=x;for _ in 0..{t["iterations"]}{{a={e};}}*out.add(i)=a;}}xs.len()'

def generate():
    for i,t in enumerate(TASKS):t['index']=i
    (HERE/'spec.json').write_text(json.dumps(public_spec(),indent=2)+'\n')
    (HERE/'kernels.ink').write_text('module WebProof18;\n'+'\n'.join(source(t) for t in TASKS)+'\n')
    for mode in ['literal','expert']:
        expert=mode=='expert'
        common='const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;\n'
        functions=',\n'.join(f'"{t["name"]}":(xs,ys,seed,k)=>{{{js_body(t,expert)}}}' for t in TASKS)
        if expert:
            indices=[t['index'] for t in TASKS if t['operation']=='projection']
            js=common+'export function createExpert(capacity){const scratch=Object.fromEntries('+json.dumps(indices)+'.map(i=>[i,new Uint32Array(capacity)]));const functions={'+functions+'};return {call:(name,args)=>functions[name](...args)};}\n'
        else:js=common+'const functions={'+functions+'};export const call=(name,args)=>functions[name](...args);\n'
        (HERE/f'{mode}.mjs').write_text(js)
        rust='// Same original/expert Rust compiled for native and Wasm. Modulo-word arithmetic explicit.\n#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}\n#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}\n#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{\n'
        rust+='\n'.join(f'{t["index"]}=>{{{rust_body(t,expert)}}},' for t in TASKS)+'\n_=>panic!("unknown case")}}\n'
        (HERE/f'{mode}.rs').write_text(rust)
if __name__=='__main__':generate()
