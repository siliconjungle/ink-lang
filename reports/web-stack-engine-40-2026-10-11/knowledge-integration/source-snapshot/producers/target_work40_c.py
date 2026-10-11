"""Optional native-C diagnostic instrumentation using source-bound Clang AST.
Counts literal loop body entries and calls of the emitted allocator/copy ABI.
No scalar store is called a byte copy; no C count is attributed to Rust/Wasm.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path


def sha(data): return hashlib.sha256(data).hexdigest()


def instrument(input_path, output, receipt, clang='clang'):
    input_path=Path(input_path).resolve(); raw=input_path.read_bytes()
    prefix='ink_work_'+sha(raw)[:16]
    if prefix.encode() in raw: raise ValueError('diagnostic name collision')
    result=subprocess.run([clang,'-fsyntax-only','-Xclang','-ast-dump=json',str(input_path)],capture_output=True,timeout=30)
    if result.returncode: raise ValueError(result.stderr.decode()[:2000])
    if len(result.stdout)>64_000_000: raise ValueError('AST byte budget')
    ast_path=Path(str(output)+'.ast.json')
    if ast_path.exists():raise ValueError('preserve existing source-bound AST')
    ast_path.write_bytes(result.stdout)
    ast=json.loads(result.stdout); edits=[]; sites=[]; unknown=[]
    def bounds(node):
        r=node.get('range',{});begin=r.get('begin',{});end=r.get('end',{})
        if 'offset' not in begin or 'offset' not in end or 'spellingLoc' in begin or 'expansionLoc' in begin or 'includedFrom' in begin or 'includedFrom' in end: raise ValueError('macro/header site cannot be instrumented exactly')
        a,b=begin['offset'],end['offset']+end['tokLen']
        if not 0<=a<b<=len(raw): raise ValueError('site byte extent')
        return a,b
    def site(node,kind):
        a,b=bounds(node);i=len(sites);sites.append(dict(id=i,kind=kind,start=a,end=b,offset_unit='bytes',source_sha256=sha(raw[a:b])));return i
    def add(where,text):edits.append((where,text.encode(),len(edits)))
    def walk(node):
        if not isinstance(node,dict):return
        if node.get('kind')in('ForStmt','WhileStmt','DoStmt'):
            body=node.get('inner',[])[-1 if node['kind']!='DoStmt' else 0]
            i=site(node,'loop_iterations');a,b=bounds(body)
            if body['kind']=='CompoundStmt':add(a+1,f'{prefix}_hit({i});')
            else:
                # AST expression ranges exclude the semicolon, which remains
                # inside the replacement compound statement.
                at=b
                while at<len(raw)and raw[at:at+1]in(b' ',b'\n',b'\t',b'\r'):at+=1
                if raw[at:at+1]==b';':b=at+1
                add(a,f'{{{prefix}_hit({i});');add(b,'}')
        for child in node.get('inner',[]):walk(child)
    definitions=[]
    for node in ast.get('inner',[]):
        if node.get('kind')!='FunctionDecl':continue
        body=next((x for x in node.get('inner',[])if x.get('kind')=='CompoundStmt'),None)
        if body is None:continue
        loc=node.get('loc',{});offset=loc.get('offset');name=node.get('name')
        if 'includedFrom'in loc or offset is None or raw[offset:offset+loc.get('tokLen',0)]!=name.encode():continue
        if loc.get('file')and Path(loc['file']).resolve()!=input_path:continue
        definitions.append(name);walk(body)
        if name in('ink_alloc','ink_copy'):
            params=[x for x in node.get('inner',[])if x.get('kind')=='ParmVarDecl'];a,_=bounds(body)
            if name=='ink_alloc':
                if len(params)!=2:raise ValueError('emitted allocator ABI arity')
                i=site(node,'allocation_events');add(a+1,f'{prefix}_hit({i});')
            else:
                if len(params)!=3 or not params[2].get('name'):raise ValueError('emitted copy ABI arity')
                i=site(node,'explicit_copy_bytes');add(a+1,f'{prefix}_copy_bytes+=(unsigned long long){params[2]["name"]};{prefix}_hit({i});')
    if not definitions:raise ValueError('no source-bound function definitions')
    # This primitive scope is deliberately narrower than all allocator/copy work
    # inside libc. Unknown external calls are disclosed, not assigned invented
    # loop/byte counts. The generated ink_alloc/ink_copy definitions are bound.
    present=set(definitions)
    primitive_complete={'allocation_events':'ink_alloc'in present,'copy_bytes':'ink_copy'in present}
    for key,known in primitive_complete.items():
        if not known:unknown.append(dict(components=[key],reason='emitted allocator/copy ABI unavailable'))
    instrumented=raw
    for where,text,_ in sorted(edits,key=lambda x:(x[0],x[2]),reverse=True):instrumented=instrumented[:where]+text+instrumented[where:]
    prelude=(f'/* Untimed external diagnostic counters; original emitted bytes retained. */\n'
             f'static unsigned long long {prefix}_counts[{max(1,len(sites))}],{prefix}_copy_bytes;\n'
             f'static void {prefix}_hit(unsigned i){{{prefix}_counts[i]++;}}\n'
             f'void {prefix}_reset(void){{for(unsigned i=0;i<{len(sites)};i++){prefix}_counts[i]=0;{prefix}_copy_bytes=0;}}\n'
             f'unsigned long long {prefix}_count(unsigned i){{return {prefix}_counts[i];}}\n'
             f'unsigned long long {prefix}_bytes(void){{return {prefix}_copy_bytes;}}\n').encode()
    output=Path(output);output.write_bytes(prelude+instrumented)
    checked=subprocess.run([clang,'-fsyntax-only',str(output)],capture_output=True,timeout=30)
    if checked.returncode:raise ValueError('instrumented source syntax: '+checked.stderr.decode()[:2000])
    data=dict(schema=1,target='native-c',artifact_sha256=sha(raw),instrumented_sha256=sha(output.read_bytes()),instrumenter_sha256=sha(Path(__file__).read_bytes()),parser_sha256=sha(result.stdout),parser='Clang source-bound AST',parser_path=str(ast_path.resolve()),prefix=prefix,sites=sites,unknown=unknown,definitions=definitions,scope='Untimed native C literal loop body entries; allocation_events counts emitted ink_alloc ABI requests, explicit copy_bytes counts ink_copy ABI requests, not libc internal operations or scalar stores. Runtime arena, caller ingress/readback and diagnostic reset loops are excluded. Never reuse C counts for Rust or Wasm.')
    Path(receipt).write_text(json.dumps(data,indent=2)+'\n');return data


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for key in('input','output','receipt'):p.add_argument('--'+key,type=Path,required=True)
    p.add_argument('--clang',default='clang');a=p.parse_args()
    if a.output.exists()or a.receipt.exists():raise ValueError('preserve existing instrumentation')
    data=instrument(a.input,a.output,a.receipt,a.clang)
    print(json.dumps(dict(sites=len(data['sites']),scope=data['scope'])))
if __name__=='__main__':main()
