"""GPU-facing compositions of checked word partition and mapped-total laws.

These are composed deployments of existing mathematics. CPU/GPU profitability
is external policy: the two equivalent forms are an allocation-free right fold
and a mapped wrapping sum. No F32 reassociation or new trust rule is involved.
"""
import copy,json
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import lam,law,op,value,var
from producers.web_predicate21_laws import named_laws as predicate_laws,source_functions
from producers.web_collection14_laws import named_laws as collection_laws
from ink_planner.semantic_search import shift,substitute


def mapped_sum_laws():
    old=dict(collection_laws())
    return [(name,old[name]) for name in ('mapped_sum_u32','mapped_sum_i32','mapped_sum_u64')]


def named_laws():
    old=dict(mapped_sum_laws());rows=[]
    for name,predicate in predicate_laws():
        t=name.rsplit('_',1)[1];typ=t.upper();s,ls=value(typ),value({'List':typ})
        folded=predicate['to'];xs=folded['node']['Op'][1][0]
        reducer=folded['node']['Op'][1][2]['node']['Lambda']['node']['Lambda']
        contribution=reducer['node']['Op'][1][0]
        mapper=lam(s,shift(contribution,-1))
        total=op(s,'call:sum',op(ls,'method:map',xs,mapper))
        base=old['mapped_sum_'+t];arguments=dict(xs=xs,f=mapper)
        expanded=substitute(copy.deepcopy(base['to']),arguments)
        use=lambda candidate,args:{'Use':dict(law=identity(semantic_entry(candidate)),arguments=dict(sorted(args.items())),premises=[])}
        params={n:var(sort,n) for n,sort in predicate['params'].items()}
        proof={'Trans':dict(middle=expanded,left={'Trans':dict(middle=folded,left=use(predicate,params),right='Normalize')},right={'Sym':use(base,arguments)})}
        rows.append((name+'_parallel_sum',law(predicate['params'],predicate['from'],total,proof,dependencies=[identity(semantic_entry(predicate)),identity(semantic_entry(base))])))
    return rows


def dependency_objects():return [semantic_entry(v) for _,v in predicate_laws()+mapped_sum_laws()]


def specialize(subject):
    """Ordinary Normalize/Use/Normalize source certificates, checked offline."""
    from producers.web_predicate21_laws import specialize as predicate_specialize
    from producers.beta_sharing17 import beta_share
    from producers.beta_specialization15 import free_parameters
    generic=dict(named_laws());rows=[]
    # The predicate bridge proposes values, not an unchecked admission decision.
    # The final checker independently validates complement/receiver correlation.
    for name,candidate in predicate_specialize(subject):
        first=candidate['proof']['Trans'];use=first['right']['Trans']['left']['Use']
        values=use['arguments'];cpu_id=use['law'];parent=next(n for n,v in predicate_laws() if identity(semantic_entry(v))==cpu_id)
        base=generic[parent+'_parallel_sum'];source=substitute(copy.deepcopy(base['from']),values);middle=substitute(copy.deepcopy(base['to']),values);target=beta_share(middle)
        proof={'Trans':dict(middle=source,left='Normalize',right={'Trans':dict(middle=middle,left={'Use':dict(law=identity(semantic_entry(base)),arguments=values,premises=[])},right='Normalize')})}
        rows.append((name+'_parallel_sum',law(free_parameters(candidate['from']),candidate['from'],target,proof,dependencies=[identity(semantic_entry(base))])))
    return rows


def publish(output,extra=()):
    output=Path(output);rows=named_laws()+list(extra);names={n:identity(semantic_entry(v)) for n,v in rows}
    st=Store.publish(output,dependency_objects()+[semantic_entry(v) for _,v in rows],names);st.rebuild()
    (output/'view.json').write_bytes(canonical(st.bundle(sorted(names.values())))+b'\n');(output/'manifest.json').write_text(json.dumps(dict(schema=1,names=names,snapshot=st.snapshot_id,composed_endpoints=9,new_primitive_mathematics=0,dependencies=12),indent=2)+'\n')
    return st
