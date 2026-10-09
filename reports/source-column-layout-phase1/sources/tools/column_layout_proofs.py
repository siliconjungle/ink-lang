#!/usr/bin/env python3
"""External producer for source-bound row/column sequence layout refinement.

This models ordered insertion with linear search, not native binary search,
Vec allocation, promotion, or source action/effect execution.
"""
import argparse, hashlib, json, subprocess
from pathlib import Path
from inductive_proofs import var, call, construct, refl, binary
from integer_proofs import match, induction, congruence, use, sym, trans
from table_transition_proofs import conditional, constructed, generalized, hypothesis, substitute

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--compiler', type=Path, default=ROOT/'build/source-row-original/lang')
    parser.add_argument('--source-model', type=Path, required=True)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--maintenance', type=Path, required=True)
    args = parser.parse_args()
    out = args.directory.resolve(); (out/'objects').mkdir(parents=True, exist_ok=True)
    compiler = args.compiler.resolve()
    subprocess.run([str(compiler), 'verify-row-model', str(args.source), str(args.source_model),
                    '--maintenance', str(args.maintenance)], check=True, capture_output=True)
    model = json.loads(args.source_model.read_text()); bundle = model['library']
    names = {json.loads(raw)['name']: identity for identity, raw in bundle['objects'].items()}
    initial = set(names)
    for identity, raw in bundle['objects'].items(): (out/'objects'/f'{identity}.json').write_text(raw)
    def references(value):
        if isinstance(value, list): return set().union(*(references(v) for v in value))
        if not isinstance(value, dict): return set()
        found = set()
        for key, value in value.items():
            if key in ('datatype', 'function', 'theorem', 'Data') and isinstance(value, str): found.add(value)
            found |= references(value)
        return found
    def store(name, kind, declaration):
        deps = references(declaration)
        # Nested branch field types are explicit direct imports, not ambient authority.
        deps |= {i for i, raw in bundle['objects'].items() if 'Datatype' in json.loads(raw)['declaration']}
        raw = json.dumps(dict(schema=1, semantics=bundle['lock']['semantics'], name=name,
                              dependencies=sorted(deps), declaration={kind: declaration}), separators=(',', ':'))+'\n'
        identity = hashlib.sha256(raw.encode()).hexdigest()
        names[name] = identity; bundle['objects'][identity] = raw; bundle['lock']['objects'].append(identity)
        (out/'objects'/f'{identity}.json').write_text(raw)
        check = out/'checking.json'; check.write_text(json.dumps(dict(bundle['lock'], objects=[identity])))
        result = subprocess.run([str(compiler), 'verify-library', str(check)], capture_output=True, text=True)
        if result.returncode: raise ValueError(name+': '+result.stderr)
        print(name+': checked', flush=True)
        return identity
    def datatype(name, cases):
        return store(name, 'Datatype', dict(constructors=[dict(name=n, fields=f) for n, f in cases]))
    def function(name, params, result, body, recursive=None):
        return store(name, 'Function', dict(params=params, result=result, body=body, recursive=recursive))
    def theorem(name, params, left, right, proof):
        return store(name, 'Theorem', dict(params=params, conditions=[], **{'from': left, 'to': right}, proof=proof))
    K = {'Data': names['TableKey128']}; V = model['description']['row_sort']
    equal = lambda a, b: call(names['table_key_equal'], a, b)
    less_id = function('layout_key_less', [['a', K], ['b', K]], 'Bool',
        match(var('a'), (['ahi','alo'], match(var('b'), (['bhi','blo'],
            binary('||', binary('<', var('ahi'), var('bhi')),
                   binary('&&', binary('==', var('ahi'), var('bhi')), binary('<', var('alo'), var('blo')))))))), 0)
    less = lambda a, b: call(less_id, a, b)
    option = datatype('LayoutOptionalRow', [('None', []), ('Some', [V])]); O = {'Data': option}
    entries = datatype('LayoutRows', [('Nil', []), ('Cons', [K, V, 'SelfType'])]); R = {'Data': entries}
    keys = datatype('LayoutKeys', [('Nil', []), ('Cons', [K, 'SelfType'])]); KS = {'Data': keys}
    values = datatype('LayoutValues', [('Nil', []), ('Cons', [V, 'SelfType'])]); VS = {'Data': values}
    columns = datatype('LayoutColumns', [('Columns', [KS, VS])]); C = {'Data': columns}
    nil = construct(entries, 0); knil = construct(keys, 0); vnil = construct(values, 0)
    none = construct(option, 0); some = lambda x: construct(option, 1, x)
    cons = lambda k, v, t: construct(entries, 1, k, v, t)
    kc = lambda k, t: construct(keys, 1, k, t)
    vc = lambda v, t: construct(values, 1, v, t)
    col = lambda ks, vs: construct(columns, 0, ks, vs)
    rs, key, new, hk, hv, tail, ks, vs, kt, vt = map(var,
        ['rows','key','new','head_key','head_value','tail','keys','values','key_tail','value_tail'])
    params = [['rows', R], ['key', K], ['new', O]]
    extract_keys = function('layout_row_keys', [['rows', R]], KS,
        match(rs, ([], knil), (['head_key','head_value','tail'], kc(hk, {'SelfCall': [tail]}))), 0)
    extract_values = function('layout_row_values', [['rows', R]], VS,
        match(rs, ([], vnil), (['head_key','head_value','tail'], vc(hv, {'SelfCall': [tail]}))), 0)
    getkeys = lambda r: call(extract_keys, r); getvalues = lambda r: call(extract_values, r)
    encode_id = function('layout_encode', [['rows', R]], C, col(getkeys(rs), getvalues(rs)))
    encode = lambda r: call(encode_id, r)
    decode_id = function('layout_zip', [['keys', KS], ['values', VS]], R,
        match(ks, ([], nil), (['head_key','key_tail'], match(vs,
            ([], nil), (['head_value','value_tail'], cons(hk, hv, {'SelfCall': [kt, vt]}))))), 0)
    decode_columns_id = function('layout_decode', [['columns', C]], R,
        match(var('columns'), (['keys','values'], call(decode_id, ks, vs))))
    decode = lambda c: call(decode_columns_id, c)
    prepend_id = function('layout_column_prepend', [['key', K], ['row', V], ['columns', C]], C,
        match(var('columns'), (['keys','values'], col(kc(key,ks), vc(var('row'),vs)))),2)
    prepend = lambda k, v, c: call(prepend_id, k, v, c)
    row_overlay_id = function('layout_row_overlay', [['key',K],['rows',R],['new',O]], R,
        match(new, ([],rs), (['value'],cons(key,var('value'),rs))), 2)
    column_overlay_id = function('layout_column_overlay', [['key',K],['keys',KS],['values',VS],['new',O]], C,
        match(new, ([],col(ks,vs)), (['value'],col(kc(key,ks),vc(var('value'),vs)))), 3)
    overlay = lambda k, r, n: call(row_overlay_id,k,r,n)
    coverlay = lambda k, keys, values, n: call(column_overlay_id,k,keys,values,n)
    row_write_id = function('layout_row_write', params, R,
        match(rs, ([],overlay(key,nil,new)), (['head_key','head_value','tail'],
            conditional(equal(hk,key), overlay(hk,tail,new),
                conditional(less(key,hk),overlay(key,cons(hk,hv,tail),new),
                    cons(hk,hv,{'SelfCall':[tail,key,new]}))))), 0)
    column_write_id = function('layout_column_write', [['keys',KS],['values',VS],['key',K],['new',O]], C,
        match(ks, ([],coverlay(key,ks,vs,new)), (['head_key','key_tail'], match(vs,
            ([],col(ks,vs)), (['head_value','value_tail'],
                conditional(equal(hk,key),coverlay(hk,kt,vt,new),
                    conditional(less(key,hk),coverlay(key,kc(hk,kt),vc(hv,vt),new),
                        prepend(hk,hv,{'SelfCall':[kt,vt,key,new]}))))))), 0)
    put = lambda r,k,n: call(row_write_id,r,k,n)
    cput = lambda keys,values,k,n: call(column_write_id,keys,values,k,n)
    row_lookup_id = function('layout_row_lookup', [['rows',R],['query',K]], O,
        match(rs, ([],none), (['head_key','head_value','tail'],
            conditional(equal(hk,var('query')),some(hv),{'SelfCall':[tail,var('query')]}))), 0)
    column_lookup_id = function('layout_column_lookup', [['keys',KS],['values',VS],['query',K]], O,
        match(ks, ([],none), (['head_key','key_tail'], match(vs, ([],none),
            (['head_value','value_tail'],conditional(equal(hk,var('query')),some(hv),
                                                   {'SelfCall':[kt,vt,var('query')]}))))), 0)
    get = lambda r,q: call(row_lookup_id,r,q)
    cget = lambda keys,values,q: call(column_lookup_id,keys,values,q)
    left=decode(encode(rs)); right=rs
    roundtrip=theorem('layout_roundtrip', [['rows',R]], left,right,
        induction('rows',left,right,([],refl(nil)),(['head_key','head_value','tail'],
            constructed(entries,1,refl(hk),refl(hv),{'Hypothesis':0}))))
    left=encode(overlay(key,rs,new)); right=coverlay(key,getkeys(rs),getvalues(rs),new)
    overlay_exact=theorem('layout_overlay_exact', [['key',K],['rows',R],['new',O]],left,right,
        induction('new',left,right,([],refl(encode(rs))),(['value'],refl(encode(cons(key,var('value'),rs))))))
    left=encode(cons(key,var('row'),rs)); right=prepend(key,var('row'),encode(rs))
    prepend_exact=theorem('layout_prepend_exact', [['key',K],['row',V],['rows',R]],left,right,refl(left))
    # The guards agree syntactically. No assumption about key-order axioms is
    # required for the representation correspondence on arbitrary row lists.
    def split(condition,left,right,on_false,on_true):
        return {'BoolSplit':dict(condition=condition,**{'from':left,'to':right},on_false=on_false,on_true=on_true)}
    def close(lctx,rctx,proof,index):
        return trans(substitute(lctx,{'Hypothesis':index}),proof,sym(substitute(rctx,{'Hypothesis':index})))
    left=cput(getkeys(rs),getvalues(rs),key,new); right=encode(put(rs,key,new))
    head=cons(hk,hv,tail); eq=equal(hk,key); lt=less(key,hk)
    same_l=coverlay(hk,getkeys(tail),getvalues(tail),new); same_r=encode(overlay(hk,tail,new))
    before_l=coverlay(key,getkeys(head),getvalues(head),new); before_r=encode(overlay(key,head,new))
    after_l=prepend(hk,hv,cput(getkeys(tail),getvalues(tail),key,new))
    after_r=encode(cons(hk,hv,put(tail,key,new)))
    after=trans(congruence(prepend_id,refl(hk),refl(hv),hypothesis(key,new)),
                sym(use(prepend_exact,hk,hv,put(tail,key,new))))
    lt_l=conditional(var('hole'),before_l,after_l)
    lt_r=encode(conditional(var('hole'),overlay(key,head,new),cons(hk,hv,put(tail,key,new))))
    different=split(lt,conditional(lt,before_l,after_l),
        encode(conditional(lt,overlay(key,head,new),cons(hk,hv,put(tail,key,new)))),
        close(lt_l,lt_r,after,1),close(lt_l,lt_r,sym(use(overlay_exact,key,head,new)),1))
    eq_l=conditional(var('hole'),same_l,conditional(lt,before_l,after_l))
    eq_r=encode(conditional(var('hole'),overlay(hk,tail,new),
        conditional(lt,overlay(key,head,new),cons(hk,hv,put(tail,key,new)))))
    one=theorem('layout_write_exact',params,left,right,
        generalized('rows',['key','new'],left,right,
            ([],sym(use(overlay_exact,key,nil,new))),
            (['head_key','head_value','tail'],split(eq,cput(getkeys(head),getvalues(head),key,new),encode(put(head,key,new)),
                close(eq_l,eq_r,different,0),close(eq_l,eq_r,sym(use(overlay_exact,hk,tail,new)),0)))))
    query=var('query'); condition=equal(hk,query)
    left=cget(getkeys(rs),getvalues(rs),query); right=get(rs,query)
    lctx=conditional(var('hole'),some(hv),cget(getkeys(tail),getvalues(tail),query))
    rctx=conditional(var('hole'),some(hv),get(tail,query))
    lookup_exact=theorem('layout_lookup_exact',[['rows',R],['query',K]],left,right,
        generalized('rows',['query'],left,right,([],refl(none)),
            (['head_key','head_value','tail'],split(condition,cget(getkeys(head),getvalues(head),query),get(head,query),
                close(lctx,rctx,hypothesis(query),0),close(lctx,rctx,refl(some(hv)),0)))))
    command=datatype('LayoutWrite',[('Write',[K,O])]); W={'Data':command}
    commands=datatype('LayoutWrites',[('Nil',[]),('Cons',[W,'SelfType'])]); WS={'Data':commands}
    step=var('write'); writes=var('writes'); rest=var('rest'); column=var('columns')
    row_step_id=function('layout_row_step',[['rows',R],['write',W]],R,
        match(step,(['key','new'],put(rs,key,new))),1)
    column_step_id=function('layout_column_step',[['columns',C],['write',W]],C,
        match(column,(['keys','values'],match(step,(['key','new'],cput(ks,vs,key,new))))),1)
    rstep=lambda r,w:call(row_step_id,r,w); cstep=lambda c,w:call(column_step_id,c,w)
    left=cstep(encode(rs),step); right=encode(rstep(rs,step))
    step_exact=theorem('layout_step_exact',[['rows',R],['write',W]],left,right,
        induction('write',left,right,(['key','new'],use(one,rs,key,new))))
    row_execute_id=function('layout_row_execute',[['writes',WS],['rows',R]],R,
        match(writes,([],rs),(['write','rest'],{'SelfCall':[rest,rstep(rs,step)]})),0)
    column_execute_id=function('layout_column_execute',[['writes',WS],['columns',C]],C,
        match(writes,([],column),(['write','rest'],{'SelfCall':[rest,cstep(column,step)]})),0)
    rexec=lambda ws,r:call(row_execute_id,ws,r); cexec=lambda ws,c:call(column_execute_id,ws,c)
    left=cexec(writes,encode(rs)); right=encode(rexec(writes,rs))
    history=theorem('layout_history_exact',[['writes',WS],['rows',R]],left,right,
        generalized('writes',['rows'],left,right,([],refl(encode(rs))),
            (['write','rest'],trans(congruence(column_execute_id,refl(rest),use(step_exact,rs,step)),
                                   hypothesis(rstep(rs,step))))))
    left=decode(cexec(writes,encode(rs))); right=rexec(writes,rs)
    theorem('layout_future_enumeration',[['writes',WS],['rows',R]],left,right,
        trans(congruence(decode_columns_id,use(history,writes,rs)),use(roundtrip,rexec(writes,rs))))
    aligned_id=function('layout_aligned',[['keys',KS],['values',VS]],'Bool',
        match(ks,([],match(vs,([],{'Bool':True}),(['head_value','value_tail'],{'Bool':False}))),
            (['head_key','key_tail'],match(vs,([],{'Bool':False}),
                (['head_value','value_tail'],{'SelfCall':[kt,vt]})))),0)
    aligned=lambda keys,values:call(aligned_id,keys,values)
    column_aligned_id=function('layout_column_aligned',[['columns',C]],'Bool',
        match(column,(['keys','values'],aligned(ks,vs))))
    valid=lambda c:call(column_aligned_id,c)
    left=valid(encode(rs)); right={'Bool':True}
    init_valid=theorem('layout_encoded_alignment',[['rows',R]],left,right,
        induction('rows',left,right,([],refl(right)),(['head_key','head_value','tail'],{'Hypothesis':0})))
    theorem('layout_future_alignment',[['writes',WS],['rows',R]],valid(cexec(writes,encode(rs))),right,
        trans(congruence(column_aligned_id,use(history,writes,rs)),use(init_valid,rexec(writes,rs))))
    guard=var('guard'); a=var('left_columns'); b=var('right_columns'); row=var('row')
    left=conditional(guard,prepend(key,row,a),prepend(key,row,b))
    right=prepend(key,row,conditional(guard,a,b))
    prepend_if=theorem('layout_prepend_if',[['guard','Bool'],['key',K],['row',V],['left_columns',C],['right_columns',C]],left,right,
        {'BoolCases':dict(variable='guard',**{'from':left,'to':right},
            on_false=refl(prepend(key,row,b)),on_true=refl(prepend(key,row,a)))})
    checked=lambda keys,values:conditional(aligned(keys,values),encode(call(decode_id,keys,values)),col(keys,values))
    left=checked(ks,vs); right=col(ks,vs)
    empty=induction('values',checked(knil,vs),col(knil,vs),
        ([],refl(col(knil,vnil))),(['head_value','value_tail'],refl(col(knil,vc(hv,vt)))))
    nextkeys=kc(hk,kt); nextvalues=vc(hv,vt)
    both=trans(use(prepend_if,aligned(kt,vt),hk,hv,encode(call(decode_id,kt,vt)),col(kt,vt)),
        congruence(prepend_id,refl(hk),refl(hv),hypothesis(vt)))
    nonempty=induction('values',checked(nextkeys,vs),col(nextkeys,vs),
        ([],refl(col(nextkeys,vnil))),(['head_value','value_tail'],both))
    theorem('layout_checked_reencoding',[['keys',KS],['values',VS]],left,right,
        generalized('keys',['values'],left,right,([],empty),(['head_key','key_tail'],nonempty)))
    # Keep the complete source model descriptor. No new admission field in the
    # compiler, optimizer catalogue, kernel rule, or native layout authority.
    bound=dict(model,library=bundle)
    (out/'binding.json').write_text(json.dumps(bound,indent=2)+'\n')
    subprocess.run([str(compiler),'verify-row-model',str(args.source),str(out/'binding.json'),
                    '--maintenance',str(args.maintenance)],check=True,capture_output=True)
    (out/'bundle.json').write_text(json.dumps(bundle,indent=2)+'\n')
    (out/'lock.json').write_text(json.dumps(bundle['lock'],indent=2)+'\n')
    (out/'names.json').write_text(json.dumps(names,indent=2)+'\n')
    (out/'model.json').write_text(json.dumps(dict(schema=1,semantics='source-bound-sequence-columns-v1',
        source_model=model['description'],row_sort=V,new_objects={n:names[n] for n in names if n not in initial},
        compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),
        scope='Linear ordered-write row/column sequence refinement; native binary search and effects remain unverified.'),indent=2)+'\n')
    print(f'Checked {len(names)-len(initial)} new objects; {len(names)} total.',flush=True)

if __name__=='__main__': main()
