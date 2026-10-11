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
        c,f,g,d,z=[e(t[k]) for k in ['guard','positive','negative','extra_positive','extra_negative']]
        original=f"add(({c}?{f}:0),({c}?{d}:{z}))" if op=='same_choice' else ('add' if op=='add' else 'sub')+f"(({c}?{f}:0),(!{c}?{g}:0))"
        if op=='same_choice':original=f'add(({c}?{f}:{g}),({c}?{d}:{z}))'
        if not expert:return f'const mapped=Array.from(xs,x=>{original});let total=0;for(const v of mapped)total=add(total,v);return total;'
        q=e('quot_or(x+seed,k,k)' if t['cohort']=='discovery' else 'quot_or(m+seed,seed,k)');test='q<seed' if t['cohort']=='discovery' else 'q>k'
        if t['cohort']=='heldout':d=e('quot_or(m,k,seed)')
        if op=='same_choice':value=f'c?add({f},{d}):add({g},'+('(k?q:seed)' if t['cohort']=='discovery' else z)+')'
        else:value=f'c?{f}:'+('sub(0,'+g+')' if op=='subtract' else g)
        return f'let total=0;for(let j=0;j<xs.length;j++){{const x=xs[j],'+('m=mul(x,k),' if t['cohort']=='heldout' else '')+f'q={q},c={test};total=add(total,({value}));}}return total;'
    left=e(t['left']) if t['left_indexed'] else 'x';right=e(t['right']) if t['right_indexed'] else 'x';combine=e(t['combine'])
    if expert:return f'const out=scratch[{t["index"]}];for(let j=0;j<xs.length;j++){{const i=j>>>0,x=xs[j],a={left},b={right};out[j]={combine};}}return out.subarray(0,xs.length);'
    a=f'Array.from(xs,(x,j)=>{{const i=j>>>0;return {left};}})' if t['left_indexed'] else 'xs'
    b=f'Array.from(xs,(x,j)=>{{const i=j>>>0;return {right};}})' if t['right_indexed'] else 'xs'
    return f'const left={a},right={b};return Array.from({{length:Math.min(left.length,right.length)}},(_,j)=>{{const a=left[j],b=right[j];return {combine};}});'
def rust_scalar(t):return t['output']=='u32'
def rust_body(t,expert):
    e=lambda s:expression(s,'rust');op=t['operation']
    if rust_scalar(t):
        c,f,g,d,z=[e(t[k]) for k in ['guard','positive','negative','extra_positive','extra_negative']]
        if op=='same_choice':original=f'(if {c}{{{f}}}else{{{g}}}).wrapping_add(if {c}{{{d}}}else{{{z}}})'
        else:original=f'(if {c}{{{f}}}else{{0u32}}).wrapping_'+('add' if op=='add' else 'sub')+f'(if !{c}{{{g}}}else{{0u32}})'
        if not expert:return f'let mapped:Vec<u32>=xs.iter().map(|&x|{original}).collect();let mut total=0u32;for value in mapped{{total=total.wrapping_add(value);}}total as u64'
        q=e('quot_or(x+seed,k,k)' if t['cohort']=='discovery' else 'quot_or(m+seed,seed,k)');test='q<seed' if t['cohort']=='discovery' else 'q>k'
        if t['cohort']=='heldout':d=e('quot_or(m,k,seed)')
        if op=='same_choice':value=f'if c{{({f}).wrapping_add({d})}}else{{({g}).wrapping_add('+('(if k!=0{q}else{seed})' if t['cohort']=='discovery' else z)+')}'
        else:value=f'if c{{{f}}}else{{'+('0u32.wrapping_sub('+g+')' if op=='subtract' else g)+'}'
        return f'let mut total=0u32;for &x in xs{{'+('let m=x.wrapping_mul(k);' if t['cohort']=='heldout' else '')+f'let q={q};let c={test};let value={value};total=total.wrapping_add(value);}}total as u64'
    left=e(t['left']) if t['left_indexed'] else 'x';right=e(t['right']) if t['right_indexed'] else 'x';combine=e(t['combine'])
    if expert:return f'for(j,&x)in xs.iter().enumerate(){{let i=j as u32;let a={left};let b={right};*out.add(j)={combine};}}xs.len()'
    a=f'let left:Vec<u32>=xs.iter().enumerate().map(|(j,&x)|{{let i=j as u32;{left}}}).collect();' if t['left_indexed'] else 'let left=xs;'
    b=f'let right:Vec<u32>=xs.iter().enumerate().map(|(j,&x)|{{let i=j as u32;{right}}}).collect();' if t['right_indexed'] else 'let right=xs;'
    return a+b+f'let zipped:Vec<u32>=left.iter().zip(right.iter()).map(|(&a,&b)|{combine}).collect();for(j,&value)in zipped.iter().enumerate(){{*out.add(j)=value;}}zipped.len()'
def generate():
    (HERE/'spec.json').write_text(json.dumps(public_spec(),indent=2)+'\n');(HERE/'kernels.ink').write_text('module WebProof22;\n'+'\n'.join(source(t) for t in TASKS)+'\n')
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
