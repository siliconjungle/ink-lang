#!/usr/bin/env python3
"""Author checked epoch-cell component laws for an exact two-u32 record schema.

Names select a subject only; ordinary emit-laws checks every generated proof.
These laws do not certify a complete cache, DAG algorithm or CRDT refinement.
"""
import argparse
import json
from pathlib import Path
import re
import subprocess


def authored(core,record=None,tag='epoch',value='flag'):
    records=core['program']['records']
    matches=[name for name,fields in records.items()if dict(fields)=={tag:'U32',value:'U32'}]
    if record is None:
        if len(matches)!=1:raise ValueError('select an exact two-u32 record schema explicitly')
        record=matches[0]
    if record not in matches:raise ValueError('selected record does not match the supplied schema')
    for name in [record,tag,value]:
        if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*',name):raise ValueError('record/field cannot be expressed as a source identifier')
    return source(record).replace('.epoch','.'+tag).replace('.flag','.'+value).replace('epoch:',''+tag+':').replace('flag:',''+value+':')


def source(name):
    return '''module epoch_mark_laws;
record MARK{epoch:u32,flag:u32,}
law fresh(mark:MARK,generation:u32){
 requires current: (mark.epoch==generation)==true;
 choose(mark.epoch==generation,mark.flag,0)==mark.flag;
}
law stale(mark:MARK,generation:u32){
 requires other: (mark.epoch==generation)==false;
 choose(mark.epoch==generation,mark.flag,0)==0;
}
law written_current(generation:u32,value:u32){
 choose(MARK{epoch:generation,flag:value}.epoch==generation,MARK{epoch:generation,flag:value}.flag,0)==value;
}
law empty_any_generation(generation:u32){
 choose(MARK{epoch:0,flag:0}.epoch==generation,MARK{epoch:0,flag:0}.flag,0)==0;
 proof by cases 0==generation {true=>normalize;false=>normalize;};
}
law reset_decoded(marks:List<MARK>,generation:u32){
 buffer(marks).map(fn(mark)=>MARK{epoch:0,flag:0}).freeze().map(fn(mark)=>choose(mark.epoch==generation,mark.flag,0))
  ==marks.map(fn(mark)=>0);
 proof by induction marks {
  nil=>normalize;
  cons(head,tail)=>cases 0==generation {true=>normalize;false=>normalize;};
 };
}
law map_append<T,U>(xs:List<T>,ys:List<T>,f:fn(T)->U){
 xs.concat(ys).map(f)==xs.map(f).concat(ys.map(f));
 proof by induction xs;
}
law push_decoded(buffer:Buffer<MARK>,mark:MARK,generation:u32){
 buffer.push(mark).freeze().map(fn(mark)=>choose(mark.epoch==generation,mark.flag,0))
  ==buffer.freeze().map(fn(mark)=>choose(mark.epoch==generation,mark.flag,0)).concat([choose(mark.epoch==generation,mark.flag,0)]);
 proof by use map_append<MARK,u32>(buffer.freeze(),[mark],fn(mark)=>choose(mark.epoch==generation,mark.flag,0));
}
'''.replace('MARK',name)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('core',type=Path);p.add_argument('--compiler',type=Path,required=True)
    p.add_argument('--record');p.add_argument('--tag-field',default='epoch');p.add_argument('--value-field',default='flag')
    p.add_argument('-o',type=Path,required=True);a=p.parse_args()
    result=subprocess.run([a.compiler,'check-core',a.core],capture_output=True,text=True,check=True)
    receipt=json.loads(result.stdout);core=json.loads(a.core.read_text())
    if a.record is None:
        matches=[name for name,fields in core['program']['records'].items()if dict(fields)=={a.tag_field:'U32',a.value_field:'U32'}]
        if len(matches)!=1:raise ValueError('select an exact two-u32 record schema explicitly')
        a.record=matches[0]
    a.o.parent.mkdir(parents=True,exist_ok=True);a.o.write_text(authored(core,a.record,a.tag_field,a.value_field))
    Path(str(a.o)+'.subject.json').write_text(json.dumps(dict(source_core_sha256=receipt['core_sha256'],record=a.record,tag_field=a.tag_field,value_field=a.value_field),sort_keys=True)+'\n')
