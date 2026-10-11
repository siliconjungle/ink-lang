"""Erase unobserved prefix-scan state under pure total value semantics.

Vector consumers use only aligned original elements; arbitrary callbacks retain
per-element grouping. Prefix evaluation can disappear entirely under wrapping integer scan semantics.
The frozen source scan primitive excludes F32; no floating-point deployment is
claimed.
"""
import json
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,binary,bound,lam,law,op,term,value,var,word


def grouped_laws():
    supports=[];roots=[]
    for t in ('U32','I32','U64'):
        s,ls=value(t),value({'List':t});un=arrow(s,s)
        xs,z,g=var(ls,'xs'),var(s,'z'),var(un,'g');head,tail=var(s,'head'),var(ls,'tail')
        ap=lambda f,x:op(f['sort']['Arrow'][1],'apply',f,x)
        scan=lambda a,start:op(ls,'scan.acc',a,start)
        target=lambda a:op(ls,'method:map',a,g)
        for family in ('scan_left_project','scan_right_project'):
            projection=lam(s,lam(s,ap(g,bound(s,0 if family=='scan_left_project' else 1))))
            def source(a,start):
                left,right=(scan(a,start),a) if family=='scan_left_project' else (a,scan(a,start))
                return op(ls,'method:zip',left,right,projection)
            function=lambda a,selected:lam(s,target(a) if selected else source(a,bound(s,0)))
            params=dict(xs=ls,z=s,g=un)
            transport=law(params,source(xs,z),ap(function(xs,False),z));tid=identity(semantic_entry(transport));supports.append((family+'_initial_transport_'+t.lower(),transport))
            start=var(s,'__congruence');nxt=binary('+',start,head)
            cons=lambda rest:term(ls,{'Cons':[ap(g,head),rest]})
            a0=cons(source(tail,nxt));a1=cons(ap(function(tail,False),nxt));a2=cons(ap(function(tail,True),nxt))
            use={'Use':dict(law=tid,arguments=dict(sorted(dict(xs=tail,z=nxt,g=g).items())),premises=[])}
            step={'Trans':dict(middle=a0,left='Normalize',right={'Trans':dict(middle=a1,left={'Congruence':['Normalize',use]},right={'Trans':dict(middle=a2,left={'Congruence':['Normalize',{'Congruence':[{'Hypothesis':0},'Normalize']}]},right='Normalize')})})}
            functional={'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step={'Congruence':[step]})}
            a=ap(function(xs,False),word(t,0));b=ap(function(xs,True),word(t,0))
            proof={'Trans':dict(middle=a,left='Normalize',right={'Trans':dict(middle=b,left={'Congruence':[functional,'Normalize']},right='Normalize')})}
            public_scan=op(ls,'method:scan',xs)
            left,right=(public_scan,xs) if family=='scan_left_project' else (xs,public_scan)
            roots.append((family+'_'+t.lower(),law(dict(xs=ls,g=un),op(ls,'method:zip',left,right,projection),target(xs),proof,dependencies=[tid])))
        if t!='F32':
            first=lambda seq:op(s,'method:at_or',seq,word('U32',0),z)
            roots.append(('scan_first_value_'+t.lower(),law(dict(xs=ls,z=s),first(op(ls,'method:scan',xs)),first(xs),{'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step='Normalize')})))
    return supports,roots


def named_laws():
    supports,roots=grouped_laws();return supports+roots


def optimization_laws():return grouped_laws()[1]


def source_functions(held_out=False):
    rows=[]
    for t in ('u32','i32','u64'):
        for family in ('scan_left_project','scan_right_project','scan_first_value'):
            if family=='scan_first_value' and t=='f32':continue
            name='pipeline_'+family+('_heldout' if held_out else '')+'_'+t
            if family=='scan_first_value':
                first='xs.scan().at_or(0,seed)'
                body=first+'*k+seed' if held_out else first+'+k'
                output=t
            else:
                g='choose(x>k,x*k+seed,seed-x)' if held_out else 'choose(x<seed,x+k,x-seed)'
                body='xs.scan().zip(xs,fn(prefix)=>fn(x)=>'+g+')' if family=='scan_left_project' else 'xs.zip(xs.scan(),fn(x)=>fn(prefix)=>'+g+')'
                output='List<'+t+'>'
            rows.append((name,t,f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->{output}'+'{return '+body+';}'))
    return rows


def law_roles():
    support,roots=grouped_laws()
    return {**{n:'proof_support' for n,_ in support},**{n:'optimization_endpoint' for n,_ in roots}}


def specialize(subject):
    # Inline projection callbacks are beta-equivalent to the generic unary
    # callback spine, but the raw first-order matcher does not abstract it.
    # This offline abstraction always emits checked Normalize/Use/Normalize.
    from producers.beta_sharing17 import derive,beta_share
    from producers.beta_specialization15 import instantiate_bound,free_parameters,outside_lambda_positions,lift_use
    from ink_planner.semantic_search import children,substitute,replace
    rows=derive(subject,optimization_laws());generic=dict(optimization_laws())
    def occurs(v,depth):
        n=v['node']
        if isinstance(n,dict) and 'Bound' in n:return n['Bound']==depth
        return any(occurs(c,depth+int(isinstance(n,dict) and 'Lambda' in n)) for c in children(v))
    for fn,body in sorted(subject['functions'].items()):
        for path,v in outside_lambda_positions(body):
            node=v['node']
            if not isinstance(node,dict) or node.get('Op',[None])[0]!='method:zip':continue
            left,right,h=node['Op'][1]
            if not isinstance(h['node'],dict) or 'Lambda' not in h['node']:continue
            inner=h['node']['Lambda']
            if not isinstance(inner['node'],dict) or 'Lambda' not in inner['node']:continue
            t=h['sort']['Arrow'][0]['Value'];s=value(t)
            for family in ('scan_left_project','scan_right_project'):
                scanned,original=(left,right) if family=='scan_left_project' else (right,left)
                nd=scanned['node']
                if not isinstance(nd,dict) or nd.get('Op',[None])[0]!='method:scan' or nd['Op'][1]!=[original]:continue
                if family=='scan_left_project':
                    if occurs(inner,0):continue
                    callback=instantiate_bound(inner,word(t,0))
                else:
                    payload=inner['node']['Lambda']
                    if occurs(payload,0):continue
                    callback=lam(s,instantiate_bound(payload,word(t,0)))
                name=family+'_'+t.lower();rule=generic[name];args=dict(xs=original,g=callback)
                expanded=replace(body,path,substitute(rule['from'],args));middle=replace(body,path,substitute(rule['to'],args));target=beta_share(middle)
                gid=identity(semantic_entry(rule));use={'Use':dict(law=gid,arguments=dict(sorted(args.items())),premises=[])}
                proof={'Trans':dict(middle=expanded,left='Normalize',right={'Trans':dict(middle=middle,left=lift_use(expanded,path,use),right='Normalize')})}
                rows.append((fn+'_projected_'+name,law(free_parameters(body),body,target,proof,dependencies=[gid])))
    unique={identity(semantic_entry(v)):(n,v) for n,v in rows}
    return [unique[k] for k in sorted(unique)]


def publish(output,extra=()):
    output=Path(output);rows=named_laws()+list(extra);names={n:identity(semantic_entry(v)) for n,v in rows};st=Store.publish(output,[semantic_entry(v) for _,v in rows],names);st.rebuild()
    (output/'view.json').write_bytes(canonical(st.bundle(sorted(names.values())))+b'\n');(output/'manifest.json').write_text(json.dumps(dict(schema=1,names=names,snapshot=st.snapshot_id),indent=2)+'\n');return st
