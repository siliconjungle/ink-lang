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
    e={k:expression(v,'js') for k,v in expressions(t).items()}
    if t['operation']=='zip':
        left=t['mapped_side'] in ['left','both'];right=t['mapped_side'] in ['right','both']
        if expert:
            a=e['left'] if left else 'x';b=e['right'] if right else 'y'
            return f'const n=Math.min(xs.length,ys.length),out=scratch[{t["index"]}];for(let i=0;i<n;i++){{const x=xs[i],y=ys[i],a={a},b={b},z={e["combine"]};out[i]={e["post"]};}}return out.subarray(0,n);'
        stages=(f'const left=Array.from(xs,x=>{e["left"]});' if left else 'const left=xs;')+(f'const right=Array.from(ys,y=>{e["right"]});' if right else 'const right=ys;')
        return stages+f'const values=zip(left,right,(a,b)=>{e["combine"]});return values.map(z=>{e["post"]});'
    if expert:
        suffix='' if t['pipeline']=='map' else f'for(let i=ys.length-1;i>=0;i--){{let x=ys[i];'+(f'x={e["mapper"]};' if t['pipeline']=='both_map_concat' else '')+f'a={e["reducer"]};}}'
        return f'let a=seed;{suffix}for(let i=xs.length-1;i>=0;i--){{let x=xs[i];x={e["mapper"]};a={e["reducer"]};}}return a;'
    stages=f'const prefix=Array.from(xs,x=>{e["mapper"]});'
    if t['pipeline']=='map':stages+='const values=prefix;'
    else:
        stages+=(f'const suffix=Array.from(ys,x=>{e["mapper"]});' if t['pipeline']=='both_map_concat' else 'const suffix=ys;')+'const values=concat(prefix,suffix);'
    return stages+f'let a=seed;for(let i=values.length-1;i>=0;i--){{const x=values[i];a={e["reducer"]};}}return a;'

def rust_body(t,expert):
    e={k:expression(v,'rust') for k,v in expressions(t).items()}
    if t['operation']=='zip':
        left=t['mapped_side'] in ['left','both'];right=t['mapped_side'] in ['right','both']
        if expert:
            a=e['left'] if left else 'x';b=e['right'] if right else 'y'
            return f'let n=xs.len().min(ys.len());for i in 0..n{{let x=xs[i];let y=ys[i];let a={a};let b={b};let z={e["combine"]};*out.add(i)={e["post"]};}}n'
        stages=(f'let lm:Vec<u32>=xs.iter().map(|&x|{e["left"]}).collect();let left=&lm[..];' if left else 'let left=xs;')+(f'let rm:Vec<u32>=ys.iter().map(|&y|{e["right"]}).collect();let right=&rm[..];' if right else 'let right=ys;')
        return stages+f'let values:Vec<u32>=left.iter().zip(right.iter()).map(|(&a,&b)|{e["combine"]}).collect();for(i,&z)in values.iter().enumerate(){{*out.add(i)={e["post"]};}}values.len()'
    if expert:
        suffix='' if t['pipeline']=='map' else 'for &x in ys.iter().rev(){'+(f'let x={e["mapper"]};' if t['pipeline']=='both_map_concat' else '')+f'a={e["reducer"]};}}'
        return f'let mut a:u32=seed;{suffix}for &x in xs.iter().rev(){{let x={e["mapper"]};a={e["reducer"]};}}*out=a;1'
    stages=f'let prefix:Vec<u32>=xs.iter().map(|&x|{e["mapper"]}).collect();'
    if t['pipeline']=='map':stages+='let values=&prefix[..];'
    else:
        stages+=(f'let suffix:Vec<u32>=ys.iter().map(|&x|{e["mapper"]}).collect();let suffix=&suffix[..];' if t['pipeline']=='both_map_concat' else 'let suffix=ys;')+'let mut joined=Vec::with_capacity(prefix.len()+suffix.len());joined.extend_from_slice(&prefix);joined.extend_from_slice(suffix);let values=&joined[..];'
    return stages+f'let mut a:u32=seed;for &x in values.iter().rev(){{a={e["reducer"]};}}*out=a;1'

def generate():
    for i,t in enumerate(TASKS):t['index']=i
    (HERE/'spec.json').write_text(json.dumps(public_spec(),indent=2)+'\n')
    (HERE/'kernels.ink').write_text('module WebProof17;\n'+'\n'.join(source(t) for t in TASKS)+'\n')
    for mode in ['literal','expert']:
        expert=mode=='expert'
        common='const quot=(a,b,c)=>b===0?c:Math.floor(a/b)>>>0;const mul=(a,b)=>Math.imul(a,b)>>>0,add=(a,b)=>(a+b)>>>0,sub=(a,b)=>(a-b)>>>0;\nconst zip=(xs,ys,f)=>Array.from({length:Math.min(xs.length,ys.length)},(_,i)=>f(xs[i],ys[i]));const concat=(xs,ys)=>{const out=new Array(xs.length+ys.length);for(let i=0;i<xs.length;i++)out[i]=xs[i];for(let i=0;i<ys.length;i++)out[xs.length+i]=ys[i];return out;};\n'
        functions=',\n'.join(f'"{t["name"]}":(xs,ys,seed,k)=>{{{js_body(t,expert)}}}' for t in TASKS)
        if expert:
            indices=[t['index'] for t in TASKS if t['operation']=='zip']
            js=common+'export function createExpert(capacity){const scratch=Object.fromEntries('+json.dumps(indices)+'.map(i=>[i,new Uint32Array(capacity)]));const functions={'+functions+'};return {call:(name,args)=>functions[name](...args)};}\n'
        else:js=common+'const functions={'+functions+'};export const call=(name,args)=>functions[name](...args);\n'
        (HERE/f'{mode}.mjs').write_text(js)
        rust='fn quot(a:u32,b:u32,c:u32)->u32{if b==0{c}else{a/b}}\n// Identical Rust for native and Wasm; original stages or strong one-pass controls.\n#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}\n#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}\n#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{\n'
        rust+='\n'.join(f'{t["index"]}=>{{{rust_body(t,expert)}}},' for t in TASKS)+'\n_=>panic!("unknown case")}}\n'
        (HERE/f'{mode}.rs').write_text(rust)
if __name__=='__main__':generate()
