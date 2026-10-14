"""Offer fixed checked readers at source interfaces; never infer profitability."""
import json,tempfile
from pathlib import Path
from producers.physical_capabilities import base,invoke,write

def candidates(context,groupings=('individual','all'),formats=('compact','portable')):
    if context.get('representation') or context.get('emit_target')!='javascript':
        yield dict(status='declined',label='boundary-readers',reason='requires source JavaScript boundary capability')
        return
    if not set(groupings)<={'individual','all'} or not set(formats)<={'compact','portable'}:
        raise ValueError('boundary recipe parameters')
    with tempfile.TemporaryDirectory(prefix='ink-boundary-readers-')as temporary:
        directory=Path(temporary);source=write(directory/'core.json',context['core'])
        physical=context.get('physical')
        if physical is None:
            subjects=directory/'subjects.json'
            invoke(context['compiler'],'emit-bounds-obligations',source,'--core','-o',subjects)
            physical=base(json.loads(subjects.read_bytes())['source'])
        existing={(r['function'],r['format'])for r in physical.get('boundary_readers',[])}
        names=sorted(f['name']for f in context['core']['program']['functions'])
        accepted=[]
        def proposal(additions,label):
            chosen=existing|set(additions)
            if chosen==existing:return None
            plan=json.loads(json.dumps(physical))
            plan['boundary_readers']=[dict(function=n,format=f)for n,f in sorted(chosen)]
            try:invoke(context['compiler'],'check-physical-plan',source,write(directory/'physical.json',plan),'--core')
            except ValueError:return None
            return dict(status='proposal',label='boundary-readers/'+label,step=dict(kind='physical',package=plan))
        for name in names:
            options=[[(name,f)]for f in sorted(set(formats))]
            if len(options)>1:options.append([(name,f)for f in sorted(set(formats))])
            eligible=False
            for choices in options:
                item=proposal(choices,name+'/'+','.join(f for _,f in choices))
                if item:
                    eligible=True
                    if 'individual'in groupings:yield item
            if eligible:accepted.append(name)
        if 'all'in groupings:
            for fs in [[f]for f in sorted(set(formats))]+([sorted(set(formats))]if len(set(formats))>1 else []):
                item=proposal([(n,f)for n in accepted for f in fs],'all/'+','.join(fs))
                if item:yield item
