//! Literal stored-value equality. Scalar floats use their IEEE primitive;
//! floats contained in data compare by the stored bits, as in source semantics.
use super::*;
impl Lower<'_>{
 pub(super) fn stored_equality(&mut self,sort:&Sort,a:Term,z:Term)->LangResult<Term>{
  match sort{
   Sort::Bool|Sort::U64=>Ok(b("==",a,z)),
   Sort::Data(datatype)=>{
    if let Some(function)=self.equalities.get(datatype){return Ok(call(function,vec![a,z]));}
    let Declaration::Datatype{constructors}=serde_json::from_value(self.objects[datatype].payload["declaration"].clone()).map_err(|e|e.to_string())?else{return Err("stored equality datatype".into());};
    let mut cases=vec![];
    for(i,left)in constructors.iter().enumerate(){
     let xs=(0..left.fields.len()).map(|_|self.fresh()).collect::<Vec<_>>();let mut right_cases=vec![];
     for(j,right)in constructors.iter().enumerate(){
      let ys=(0..right.fields.len()).map(|_|self.fresh()).collect::<Vec<_>>();let mut equal=Term::Bool(i==j);
      if i==j{for(k,field)in left.fields.iter().enumerate().rev(){let part=if *field==Sort::SelfType{Term::SelfCall(vec![v(&xs[k]),v(&ys[k])])}else{self.stored_equality(field,v(&xs[k]),v(&ys[k]))?};equal=choice(part,equal,Term::Bool(false));}}
      right_cases.push((ys,equal));
     }
     cases.push((xs,m(v("equal_right"),right_cases)));
    }
    let function=self.function(vec![("equal_left",sort.clone()),("equal_right",sort.clone())],Sort::Bool,m(v("equal_left"),cases),Some(0))?;
    self.equalities.insert(datatype.clone(),function.clone());Ok(call(&function,vec![a,z]))
   },_=>Err("unresolved stored equality sort".into())
  }
 }
 pub(super) fn vector_operator(&mut self,element:&Type,size:u8,op:&str,a:Term,z:Term)->LangResult<Term>{
  let sort=self.sort(&Type::Vector(Box::new(element.clone()),size))?;
  if op=="=="||op=="!="{let equal=self.stored_equality(&sort,a,z)?;return Ok(if op=="=="{equal}else{choice(equal,Term::Bool(false),Term::Bool(true))});}
  if !["+","-","*"].contains(&op){return Err("unsupported vector operator".into());}
  let xs=(0..size).map(|_|self.fresh()).collect::<Vec<_>>();let ys=(0..size).map(|_|self.fresh()).collect::<Vec<_>>();
  let fields=xs.iter().zip(&ys).map(|(x,y)|self.operator(element,op,v(x),v(y))).collect::<LangResult<Vec<_>>>()?;
  Ok(m(a,vec![(xs,m(z,vec![(ys,c(id(&sort)?,0,fields))]))]))
 }
}
