#!/usr/bin/env python3
"""Untrusted proof production for filtered pipelines, conditional folds and source calls."""
import argparse,hashlib,json
from pathlib import Path
from inductive_proofs import var,call,construct,binary,refl,SEMANTICS
from collection_proofs import num,source_var,source_bin,lam,mapping,source_call,free,render
MASK=(1<<64)-1
def conditional(c,t,f):return {'If':dict(condition=c,on_true=t,on_false=f)}
def trans(a,b):return {'Trans':[a,b]}
def substitute(t,bindings):
    k,v=next(iter(t.items()))
    if k=='Var':return bindings.get(v,t)
    if k in ('Bool','U64'):return t
    if k in ('Call','Construct'):return {k:dict(v,arguments=[substitute(a,bindings) for a in v['arguments']])}
    if k=='Binary':return binary(v['op'],substitute(v['left'],bindings),substitute(v['right'],bindings))
    if k=='If':return conditional(*[substitute(v[n],bindings) for n in ['condition','on_true','on_false']])
    if k=='Match':return {'Match':dict(scrutinee=substitute(v['scrutinee'],bindings),branches=[dict(bindings=b['bindings'],body=substitute(b['body'],{n:a for n,a in bindings.items() if n not in b['bindings']})) for b in v['branches']])}
    raise ValueError(k)
def replace(t,old,new):
    if t==old:return new
    if isinstance(t,list):return [replace(x,old,new) for x in t]
    if isinstance(t,dict):return {k:replace(v,old,new) for k,v in t.items()}
    return t
class Producer:
    def __init__(self,directory):
        self.directory=directory;self.names={};self.definitions={};self.functions={};(directory/'objects').mkdir(parents=True,exist_ok=True)
        self.lst=self.store('List64','Datatype',dict(constructors=[dict(name='Nil',fields=[]),dict(name='Cons',fields=['U64','SelfType'])]))
    def store(self,name,kind,declaration,deps=()):
        data=(json.dumps(dict(schema=1,semantics=SEMANTICS,name=name,dependencies=sorted(set(deps)),declaration={kind:declaration}),separators=(',',':'))+'\n').encode();identity=hashlib.sha256(data).hexdigest();path=self.directory/'objects'/f'{identity}.json'
        if path.exists():assert path.read_bytes()==data
        else:path.write_bytes(data)
        self.names[name]=identity
        if kind=='Function':self.definitions[identity]=dict(declaration,body=self.bind_self(declaration['body'],identity))
        return identity
    def bind_self(self,t,identity):
        if isinstance(t,dict) and 'SelfCall' in t:return call(identity,*[self.bind_self(a,identity) for a in t['SelfCall']])
        if isinstance(t,dict):return {k:self.bind_self(v,identity) for k,v in t.items()}
        if isinstance(t,list):return [self.bind_self(v,identity) for v in t]
        return t
    def deps(self,t):
        k,v=next(iter(t.items()));out=set()
        if k=='Call':out.add(v['function']);children=v['arguments']
        elif k=='Construct':out.add(v['datatype']);children=v['arguments']
        elif k=='SelfCall':children=v
        elif k=='Binary':children=[v['left'],v['right']]
        elif k=='If':children=[v[n] for n in ['condition','on_true','on_false']]
        elif k=='Match':children=[v['scrutinee']]+[b['body'] for b in v['branches']]
        else:children=[]
        for child in children:out|=self.deps(child)
        return out
    def component(self,label,ids,params,result,body,recursive,args):
        identity=self.store(f'{label}_{len(ids)}','Function',dict(params=params,result=result,body=body,recursive=recursive),self.deps(body)|{self.lst});ids.append(identity);return call(identity,*args)
    def model(self,e,env,label,ids):
        k,v=next(iter(e.items()))
        if k=='Var':return env[v][1]
        if k=='Num':return {'U64':v}
        if k=='Bool':return e
        if k=='Binary':return binary(v[0],self.model(v[1],env,label,ids),self.model(v[2],env,label,ids))
        if k=='Call' and v[0]=='choose':return conditional(*[self.model(a,env,label,ids) for a in v[1]])
        method=v[1] if k=='Method' else v[0]
        if k=='Call' and method not in ('sum','count','foldr'):
            arguments=[self.model(a,env,label,ids) for a in v[1]];params,ty,body=self.functions[method];local={n:(s,var(f'arg{i}')) for i,(n,s) in enumerate(params)}
            definition=self.model(body,local,label,ids)
            return self.component(label,ids,[[f'arg{i}',s] for i,(_,s) in enumerate(params)],ty,definition,None,arguments)
        xs=v[0] if k=='Method' else v[1][0];input_term=self.model(xs,env,label,ids)
        captures=free(v[2][0]) if method in ('map','filter') else free(v[1][1])|free(v[1][2]) if method=='foldr' else set()
        params=[['input',{'Data':self.lst}]];local={};arguments=[]
        for i,n in enumerate(sorted(captures)):
            s,value=env[n];cn=f'c{i}';params.append([cn,s]);local[n]=(s,var(cn));arguments.append(value)
        tail={'SelfCall':[var('tail')]+[var(n) for n,_ in params[1:]]}
        if method in ('map','filter'):
            n,step=v[2][0]['Lambda'];local[n]=('U64',var('head'));value=self.model(step,local,label,ids)
            zero=construct(self.lst,0);body=construct(self.lst,1,value,tail) if method=='map' else conditional(value,construct(self.lst,1,var('head'),tail),tail);result={'Data':self.lst}
        elif method=='foldr':
            _,initial,outer=v[1];n,inner=outer['Lambda'];rest,step=inner['Lambda'];zero=self.model(initial,local,label,ids)
            local[n]=('U64',var('head'));local[rest]=('U64',tail);body=self.model(step,local,label,ids);result='U64'
        elif method in ('sum','count'):
            zero={'U64':0};body=binary('+',var('head') if method=='sum' else {'U64':1},tail);result='U64'
        else:raise ValueError(method)
        body={'Match':dict(scrutinee=var('input'),branches=[dict(bindings=[],body=zero),dict(bindings=['head','tail'],body=body)])}
        return self.component(label,ids,params,result,body,0,[input_term,*arguments])
    def normal(self,t,depth=0):
        if depth>128:raise ValueError('producer normal depth limit')
        k,v=next(iter(t.items()))
        if k=='Call':
            f=self.definitions[v['function']];arguments=[self.normal(a,depth+1) for a in v['arguments']]
            if f['recursive'] is not None and 'Construct' not in arguments[f['recursive']]:return call(v['function'],*arguments)
            return self.normal(substitute(f['body'],dict(zip([n for n,_ in f['params']],arguments))),depth+1)
        if k=='Construct':return construct(v['datatype'],v['constructor'],*[self.normal(a,depth+1) for a in v['arguments']])
        if k=='Match':
            value=self.normal(v['scrutinee'],depth+1)
            if 'Construct' not in value:return {'Match':dict(v,scrutinee=value)}
            ctor=value['Construct'];branch=v['branches'][ctor['constructor']]
            return self.normal(substitute(branch['body'],dict(zip(branch['bindings'],ctor['arguments']))),depth+1)
        if k=='If':
            condition=self.normal(v['condition'],depth+1)
            if 'Bool' in condition:return self.normal(v['on_true'] if condition['Bool'] else v['on_false'],depth+1)
            return conditional(condition,self.normal(v['on_true'],depth+1),self.normal(v['on_false'],depth+1))
        if k=='Binary':
            a=self.normal(v['left'],depth+1);b=self.normal(v['right'],depth+1);op=v['op']
            if 'U64' in a and 'U64' in b:
                x=a['U64'];y=b['U64']
                operations={'+':lambda:(x+y)&MASK,'-':lambda:(x-y)&MASK,'*':lambda:x*y&MASK,'<':lambda:x<y,'<=':lambda:x<=y,'>':lambda:x>y,'>=':lambda:x>=y,'==':lambda:x==y,'!=':lambda:x!=y}
                value=operations[op]();return {'Bool' if isinstance(value,bool) else 'U64':value}
            return binary(op,a,b)
        return t

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('directory',type=Path);args=parser.parse_args();p=Producer(args.directory)
    V=source_var;B=source_bin;C=source_call
    params=[['xs',{'Data':p.lst}],['scale','U64'],['bias','U64'],['limit','U64']]
    p.functions['project']=([['x','U64'],['scale','U64'],['bias','U64']],'U64',B('+',B('*',V('x'),V('scale')),V('bias')))
    p.functions['under']=([['x','U64'],['limit','U64']],'Bool',B('<',V('x'),V('limit')))
    project=lambda x:C('project',x,V('scale'),V('bias'));under=lambda x:C('under',x,V('limit'))
    filter_=lambda xs,n,condition:{'Method':[xs,'filter',[lam(n,condition)]]}
    transformed=mapping(V('xs'),'x',project(V('x')))
    specifications=[
        ('mapped_filter_sum',C('sum',filter_(transformed,'y',under(V('y')))),under(project(V('x'))),project(V('x'))),
        ('filter_map_sum',C('sum',mapping(filter_(V('xs'),'y',under(V('y'))),'x',project(V('x')))),under(V('x')),project(V('x'))),
        ('mapped_filter_count',C('count',filter_(transformed,'y',under(V('y')))),under(project(V('x'))),num(1)),
        ('constant_filter_sum',C('sum',filter_(mapping(V('xs'),'ignored',V('bias')),'y',under(V('y')))),under(V('bias')),V('bias')),
    ]
    source=['module filtered_proofs;']
    for name,(ps,ty,body) in p.functions.items():
        source.append('fn '+name+'('+', '.join(n+': '+('u64' if s=='U64' else 'Bool') for n,s in ps)+') -> '+('u64' if ty=='U64' else 'Bool')+' { return '+render(body)+'; }')
    proposals=[];model_params=[[f'p{i}',s] for i,(_,s) in enumerate(params)];env={n:(s,var(f'p{i}')) for i,(n,s) in enumerate(params)}
    for name,original,condition,head in specifications:
        candidate=C('foldr',V('xs'),num(0),lam('x',lam('rest',C('choose',condition,B('+',head,V('rest')),V('rest')))))
        old_ids=[];new_ids=[];left=p.model(original,env,name+'_from',old_ids);right=p.model(candidate,env,name+'_to',new_ids)
        branch_binding={'p0':construct(p.lst,1,var('h'),var('t'))}
        from_cons=p.normal(substitute(left,branch_binding));to_cons=p.normal(substitute(right,branch_binding))
        # The candidate exposes the conditional in the Cons case; it is an
        # untrusted tactic's choice of case split, not a core fusion instruction.
        guard=to_cons['If']['condition'];old_context=replace(from_cons,guard,var('decision'));new_context=replace(to_cons,guard,var('decision'))
        def rewrite(context):return {'Substitute':dict(variable='decision',context=context,equality={'Hypothesis':1})}
        true_branch=to_cons['If']['on_true'];head_value=true_branch['Binary']['left']
        middle_true={'Binary':dict(op='+',left=refl(head_value),right={'Hypothesis':0})}
        def branch(middle):return trans(rewrite(old_context),trans(middle,{'Sym':rewrite(new_context)}))
        cases={'BoolSplit':dict(condition=guard,**{'from':from_cons,'to':to_cons},on_false=branch({'Hypothesis':0}),on_true=branch(middle_true))}
        proof={'Induction':dict(variable='p0',**{'from':left,'to':right},cases=[dict(bindings=[],proof=refl({'U64':0})),dict(bindings=['h','t'],proof=cases)])}
        dependencies=p.deps(left)|p.deps(right)|p.deps(from_cons)|p.deps(to_cons)|{p.lst}
        theorem=p.store(name+'_equivalence','Theorem',dict(params=model_params,conditions=[],**{'from':left,'to':right},proof=proof),dependencies)
        proposals.append(dict(function=name,**{'from':original,'to':candidate},datatype=p.lst,from_definitions=old_ids,to_definitions=new_ids,proof={'Use':dict(theorem=theorem,arguments=[var(n) for n,_ in model_params],premises=[])}))
        source.append(f'fn {name}(xs: List<u64>, scale: u64, bias: u64, limit: u64) -> u64 {{ return {render(original)}; }}')
    (args.directory/'lock.json').write_text(json.dumps(dict(schema=1,semantics=SEMANTICS,objects=list(p.names.values())),indent=2)+'\n')
    (args.directory/'proposal.json').write_text(json.dumps(dict(schema=1,semantics='source-collections-v1',library='lock.json',proposals=proposals),indent=2)+'\n')
    (args.directory/'names.json').write_text(json.dumps(p.names,indent=2)+'\n');(args.directory/'kernels.lang').write_text('\n\n'.join(source)+'\n')
    print(f'Produced {len(p.names)} immutable objects and {len(proposals)} candidates. Run lang build --implementation for independent acceptance.')
if __name__=='__main__':main()
