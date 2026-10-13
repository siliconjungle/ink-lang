//! Finite recursive nominal values use an ordinary inductive tree carrier.
//! This is fixed source correspondence, not an optimisation primitive. Wrappers
//! retain their ordinary datatypes; structural field adapters are total and
//! contain only checked constructors, matches and decreasing self-calls.
use super::*;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RecursiveField {
    pub encode: Option<String>,
    pub decode: Option<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RecursiveRecord {
    pub datatype: String,
    pub tag: u64,
    pub fields: Vec<RecursiveField>,
}

pub(crate) fn cyclic_records(p:&Program)->BTreeSet<String>{crate::analysis::cyclic_records(p)}

impl Projection {
    /// Literal host field adapters derived from the complete checked source.
    /// Their dependency closure includes the ordinary carrier datatypes.
    pub fn codec_declarations(&self) -> LangResult<BTreeMap<String,Declaration>> {
        let mut pending=self.recursive_records.values().flat_map(|r|r.fields.iter())
            .flat_map(|f|f.encode.iter().chain(f.decode.iter())).cloned().collect::<Vec<_>>();
        let mut out=BTreeMap::new();
        while let Some(id)=pending.pop() {
            if out.contains_key(&id) {continue;}
            let entry=self.objects.get(&id).ok_or("missing source field adapter")?;
            let declaration=serde_json::from_value(entry.payload["declaration"].clone()).map_err(|e|e.to_string())?;
            pending.extend(entry.dependencies.iter().cloned());out.insert(id,declaration);
        }
        Ok(out)
    }
}

impl Lower<'_> {
    pub(super) fn prepare_recursive_records(&mut self) -> LangResult<()> {
        let names=cyclic_records(self.program);
        if names.is_empty() {return Ok(());}
        let tree=self.data(vec![
            ("RecursiveEmpty",vec![]),
            ("RecursiveWord",vec![Sort::U64]),
            ("RecursiveBool",vec![Sort::Bool]),
            ("RecursivePair",vec![Sort::SelfType,Sort::SelfType]),
            ("RecursiveNode",vec![Sort::U64,Sort::SelfType]),
        ])?;
        self.recursive_tree=Some(tree.clone());
        // Reserve the cycle members before following any wrapper field graph.
        for (tag,n) in names.iter().enumerate() {
            self.types.insert(serde_json::to_string(&Type::Named(n.clone())).map_err(|e|e.to_string())?,Sort::Data(tree.clone()));
            self.recursive_records.insert(n.clone(),RecursiveRecord {datatype:tree.clone(),tag:tag as u64,fields:vec![]});
        }
        for n in names {
            let mut fields=vec![];
            for (_,t) in self.program.records[&n].clone() {
                let s=self.sort(&t)?;let (encode,decode)=self.tree_codec(&s)?;
                fields.push(RecursiveField {encode,decode});
            }
            self.recursive_records.get_mut(&n).unwrap().fields=fields;
        }
        Ok(())
    }
    fn tree_nil(&self) -> Term { c(self.recursive_tree.as_deref().unwrap(),0,vec![]) }
    fn tree_fields(&self,values: Vec<Term>) -> Term {
        let tree=self.recursive_tree.as_deref().unwrap();
        values.into_iter().rev().fold(self.tree_nil(),|tail,head|c(tree,3,vec![head,tail]))
    }
    fn default_sort(&mut self,s: &Sort) -> LangResult<Term> {
        self.tick()?;
        Ok(match s {
            Sort::U64 => Term::U64(0), Sort::Bool => Term::Bool(false),
            Sort::Data(d) => {
                let Declaration::Datatype {constructors}=serde_json::from_value(self.objects[d].payload["declaration"].clone()).map_err(|e|e.to_string())? else {return Err("recursive carrier default datatype".into());};
                let (i,ctor)=constructors.iter().enumerate().find(|(_,c)|!c.fields.contains(&Sort::SelfType)).ok_or("source datatype has no finite default")?;
                let xs=ctor.fields.iter().map(|s|self.default_sort(s)).collect::<LangResult<Vec<_>>>()?;
                c(d,i,xs)
            }
            _ => return Err("recursive carrier unresolved sort".into()),
        })
    }
    fn tree_cases(&mut self,chosen: usize,bindings: Vec<String>,body: Term,default: &Term) -> Vec<(Vec<String>,Term)> {
        [0,1,1,2,2].into_iter().enumerate().map(|(i,arity)| {
            if i==chosen {(bindings.clone(),body.clone())}
            else {((0..arity).map(|_|self.fresh()).collect(),default.clone())}
        }).collect()
    }
    fn unpack_tree_fields(&mut self,cursor: &str,count: usize,values: &mut Vec<String>,finish: &mut impl FnMut(&mut Self,&[String])->LangResult<Term>,default: &Term) -> LangResult<Term> {
        self.tick()?;
        if count==0 {
            let body=finish(self,values)?;
            let cases=self.tree_cases(0,vec![],body,default);
            return Ok(m(v(cursor),cases));
        }
        let head=self.fresh();let tail=self.fresh();values.push(head.clone());
        let body=self.unpack_tree_fields(&tail,count-1,values,finish,default)?;values.pop();
        let cases=self.tree_cases(3,vec![head,tail],body,default);
        Ok(m(v(cursor),cases))
    }
    fn tree_codec(&mut self,s: &Sort) -> LangResult<(Option<String>,Option<String>)> {
        let tree=self.recursive_tree.clone().ok_or("recursive carrier missing")?;let target=Sort::Data(tree.clone());
        if *s==target {return Ok((None,None));}
        let key=serde_json::to_string(s).map_err(|e|e.to_string())?;
        if let Some(pair)=self.tree_codecs.get(&key) {return Ok((Some(pair.0.clone()),Some(pair.1.clone())));}
        let (forward,backward,recursive)=match s {
            Sort::U64 | Sort::Bool => {
                let i=if *s==Sort::U64 {1}else{2};let value=self.fresh();let default=self.default_sort(s)?;
                let cases=self.tree_cases(i,vec![value.clone()],v(&value),&default);
                (c(&tree,i,vec![v("carrier_source")]),m(v("carrier_tree"),cases),None)
            }
            Sort::Data(d) => {
                let Declaration::Datatype {constructors}=serde_json::from_value(self.objects[d].payload["declaration"].clone()).map_err(|e|e.to_string())? else {return Err("recursive carrier datatype".into());};
                let default=self.default_sort(s)?;let mut forward=vec![];let mut backward=default.clone();
                let tag=self.fresh();let fields=self.fresh();
                for (i,ctor) in constructors.iter().enumerate().rev() {
                    let names=(0..ctor.fields.len()).map(|_|self.fresh()).collect::<Vec<_>>();let mut encoded=vec![];
                    for (n,f) in names.iter().zip(&ctor.fields) {
                        encoded.push(if *f==Sort::SelfType {Term::SelfCall(vec![v(n)])}
                        else {let pair=self.tree_codec(f)?;pair.0.map(|id|call(&id,vec![v(n)])).unwrap_or_else(||v(n))});
                    }
                    forward.push((i,(names,c(&tree,4,vec![Term::U64(i as u64),self.tree_fields(encoded)]))));
                    let mut finish=|this:&mut Self,ns:&[String]| -> LangResult<Term> {
                        let mut args=vec![];
                        for (n,f) in ns.iter().zip(&ctor.fields) {
                            args.push(if *f==Sort::SelfType {Term::SelfCall(vec![v(n)])}
                            else {let pair=this.tree_codec(f)?;pair.1.map(|id|call(&id,vec![v(n)])).unwrap_or_else(||v(n))});
                        }
                        Ok(c(d,i,args))
                    };
                    let body=self.unpack_tree_fields(&fields,ctor.fields.len(),&mut vec![],&mut finish,&default)?;
                    backward=choice(b("==",v(&tag),Term::U64(i as u64)),body,backward);
                }
                forward.sort_by_key(|(i,_)|*i);
                let cases=self.tree_cases(4,vec![tag,fields],backward,&default);
                (m(v("carrier_source"),forward.into_iter().map(|(_,x)|x).collect()),m(v("carrier_tree"),cases),Some(0))
            }
            _ => return Err("recursive carrier unresolved sort".into()),
        };
        let encode=self.function(vec![("carrier_source",s.clone())],target.clone(),forward,recursive)?;
        let decode=self.function(vec![("carrier_tree",target)],s.clone(),backward,recursive)?;
        self.tree_codecs.insert(key,(encode.clone(),decode.clone()));
        Ok((Some(encode),Some(decode)))
    }
    pub(super) fn recursive_record(&mut self,name: &str,values: Vec<Term>) -> LangResult<Term> {
        let record=self.recursive_records[name].clone();
        let fields=values.into_iter().zip(&record.fields).map(|(v,f)|f.encode.as_ref().map(|id|call(id,vec![v.clone()])).unwrap_or(v)).collect();
        Ok(c(&record.datatype,4,vec![Term::U64(record.tag),self.tree_fields(fields)]))
    }
    pub(super) fn recursive_field(&mut self,name: &str,index: usize,value: Term) -> LangResult<Term> {
        let record=self.recursive_records[name].clone();let tree=Sort::Data(record.datatype.clone());
        let nth=if let Some(id)=&self.tree_nth {id.clone()} else {
            let head=self.fresh();let tail=self.fresh();let default=self.tree_nil();
            let body=choice(b("==",v("carrier_index"),Term::U64(0)),v(&head),Term::SelfCall(vec![v(&tail),b("-",v("carrier_index"),Term::U64(1))]));
            let cases=self.tree_cases(3,vec![head,tail],body,&default);
            let id=self.function(vec![("carrier_fields",tree.clone()),("carrier_index",Sort::U64)],tree.clone(),m(v("carrier_fields"),cases),Some(0))?;
            self.tree_nth=Some(id.clone());id
        };
        let tag=self.fresh();let fields=self.fresh();let default=self.tree_nil();
        let body=choice(b("==",v(&tag),Term::U64(record.tag)),call(&nth,vec![v(&fields),Term::U64(index as u64)]),default.clone());
        let cases=self.tree_cases(4,vec![tag,fields],body,&default);let field=m(value,cases);
        Ok(record.fields[index].decode.as_ref().map(|id|call(id,vec![field.clone()])).unwrap_or(field))
    }
}
