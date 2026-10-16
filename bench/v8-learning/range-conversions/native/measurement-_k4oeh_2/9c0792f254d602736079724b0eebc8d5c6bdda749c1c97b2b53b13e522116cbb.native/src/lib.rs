#![allow(non_camel_case_types,non_snake_case,unused_variables,unused_parens,dead_code)]
pub const INK_TABLE_STORAGE:&str="ordered";
pub const INK_ABI_CONTRACT:&str="{\"abi\":\"ink-values-v1\",\"actions\":[],\"functions\":[{\"name\":\"guarded\",\"params\":[{\"name\":\"x\",\"type\":{\"kind\":\"u64\"}}],\"result\":{\"kind\":\"u64\"}},{\"name\":\"relational\",\"params\":[{\"name\":\"x\",\"type\":{\"kind\":\"u64\"}},{\"name\":\"upper\",\"type\":{\"kind\":\"u64\"}}],\"result\":{\"kind\":\"u64\"}},{\"name\":\"wrapped\",\"params\":[{\"name\":\"x\",\"type\":{\"kind\":\"u64\"}}],\"result\":{\"kind\":\"u64\"}}]}";
pub const INK_VALUE_ABI:&str="ink-values-v1";
pub const INK_WIRE_CONTRACT:&str="{\"format\":\"ink-value-wire-v1\",\"functions\":{\"guarded\":{\"arguments\":{\"format\":\"ink-value-wire-v1\",\"identity\":\"2f49badaf8d383057bffd360aec0fee334901d2adf83089b589ef69b2a638e1b\",\"named\":{},\"root\":{\"fields\":[{\"name\":\"x\",\"type\":{\"kind\":\"u64\"}}],\"kind\":\"record\",\"name\":\"arguments\"}},\"result\":{\"format\":\"ink-value-wire-v1\",\"identity\":\"dec7f58c139e3d5ff0527d2e8dff0bd4df23ca8425cf884787a2f3043fbb68bc\",\"named\":{},\"root\":{\"kind\":\"u64\"}}},\"relational\":{\"arguments\":{\"format\":\"ink-value-wire-v1\",\"identity\":\"f25e6959d7175a85b849b67f059b401d220fed4248847e6eeed1513fb2c7fa2c\",\"named\":{},\"root\":{\"fields\":[{\"name\":\"x\",\"type\":{\"kind\":\"u64\"}},{\"name\":\"upper\",\"type\":{\"kind\":\"u64\"}}],\"kind\":\"record\",\"name\":\"arguments\"}},\"result\":{\"format\":\"ink-value-wire-v1\",\"identity\":\"dec7f58c139e3d5ff0527d2e8dff0bd4df23ca8425cf884787a2f3043fbb68bc\",\"named\":{},\"root\":{\"kind\":\"u64\"}}},\"wrapped\":{\"arguments\":{\"format\":\"ink-value-wire-v1\",\"identity\":\"2f49badaf8d383057bffd360aec0fee334901d2adf83089b589ef69b2a638e1b\",\"named\":{},\"root\":{\"fields\":[{\"name\":\"x\",\"type\":{\"kind\":\"u64\"}}],\"kind\":\"record\",\"name\":\"arguments\"}},\"result\":{\"format\":\"ink-value-wire-v1\",\"identity\":\"dec7f58c139e3d5ff0527d2e8dff0bd4df23ca8425cf884787a2f3043fbb68bc\",\"named\":{},\"root\":{\"kind\":\"u64\"}}}}}";
// Shared support for generated native applications. No parser or evaluator.
use num_bigint::BigInt;
use serde_json::{Value as Json, json};
use std::collections::BTreeMap;
pub trait Wire: Sized {
    fn to_json(&self) -> Json;
    fn from_json(v: &Json) -> Result<Self, String>;
}
macro_rules! unsigned_wire {
    ($t:ty) => { impl Wire for $t {
        fn to_json(&self) -> Json { json!(self) }
        fn from_json(v:&Json)->Result<Self,String> { v.as_u64().and_then(|n| n.try_into().ok()).ok_or("invalid unsigned integer".into()) }
    } };
}
unsigned_wire!(u32); unsigned_wire!(u64);
impl Wire for () {
    fn to_json(&self)->Json { Json::Null }
    fn from_json(v:&Json)->Result<Self,String>{ if v.is_null(){Ok(())}else{Err("expected Unit".into())} }
}
impl Wire for bool {
    fn to_json(&self)->Json{json!(self)}
    fn from_json(v:&Json)->Result<Self,String>{v.as_bool().ok_or("expected Bool".into())}
}
impl Wire for String {
    fn to_json(&self)->Json{json!(self)}
    fn from_json(v:&Json)->Result<Self,String>{v.as_str().map(str::to_owned).ok_or("expected String".into())}
}
impl Wire for BigInt {
    fn to_json(&self)->Json{json!({"Int":self.to_string()})}
    fn from_json(v:&Json)->Result<Self,String>{v.get("Int").and_then(Json::as_str).map(str::to_owned).unwrap_or_else(||v.to_string()).parse().map_err(|_|"expected Int".into())}
}
impl<T:Wire> Wire for Vec<T> {
    fn to_json(&self)->Json{self.iter().map(Wire::to_json).collect()}
    fn from_json(v:&Json)->Result<Self,String>{v.as_array().ok_or("expected List")?.iter().map(T::from_json).collect()}
}
impl<T:Wire> Wire for Option<T> {
    fn to_json(&self)->Json{match self{Some(v)=>json!({"Some":v.to_json()}),None=>json!({"None":null})}}
    fn from_json(v:&Json)->Result<Self,String>{
        let obj=v.as_object().ok_or("expected Option")?;
        if obj.len()!=1 {return Err("expected one tag".into())}
        if let Some(x)=obj.get("Some"){Ok(Some(T::from_json(x)?))}
        else if obj.get("None")==Some(&Json::Null){Ok(None)}else{Err("invalid Option".into())}
    }
}
impl<T:Wire,E:Wire> Wire for Result<T,E> {
    fn to_json(&self)->Json{match self{Ok(v)=>json!({"Ok":v.to_json()}),Err(e)=>json!({"Err":e.to_json()})}}
    fn from_json(v:&Json)->Result<Self,String>{
        let obj=v.as_object().ok_or("expected Result")?;
        if obj.len()!=1 {return Err("expected one tag".into())}
        if let Some(x)=obj.get("Ok"){Ok(Ok(T::from_json(x)?))}
        else if let Some(x)=obj.get("Err"){Ok(Err(E::from_json(x)?))}else{Err("invalid Result".into())}
    }
}
#[derive(Clone, Debug)]
pub struct Event {pub commit:u64,pub position:u64,pub data:EventData}
impl Event {
    pub fn to_json(&self)->Json {let (channel,value)=self.data.wire();json!({"commit":self.commit,"position":self.position,"channel":channel,"value":value})}
}
#[derive(Clone, Debug)]
pub struct Outcome<T> {pub result:T,pub committed:bool,pub version:u64,pub events:Vec<Event>}
impl<T:Wire> Outcome<T> {
    pub fn to_json(&self)->Json {json!({"result":self.result.to_json(),"committed":self.committed,"version":self.version,"events":self.events.iter().map(Event::to_json).collect::<Vec<_>>()})}
}
// The borrow prevents further mutation of State while these event references
// exist. Keeping an outcome independently still uses the existing owned API.
#[derive(Debug)]
pub struct OutcomeView<'a,T> {pub result:T,pub committed:bool,pub version:u64,pub events:&'a [Event]}
impl<T> OutcomeView<'_,T> {
    pub fn into_owned(self)->Outcome<T>{Outcome{result:self.result,committed:self.committed,version:self.version,events:self.events.to_vec()}}
}
impl<T:Wire> OutcomeView<'_,T> {
    pub fn to_json(&self)->Json {json!({"result":self.result.to_json(),"committed":self.committed,"version":self.version,"events":self.events.iter().map(Event::to_json).collect::<Vec<_>>()})}
}

impl Wire for i32 {
 fn to_json(&self)->Json{json!(self)}
 fn from_json(v:&Json)->Result<Self,String>{v.as_i64().and_then(|n|n.try_into().ok()).ok_or("invalid i32".into())}
}
impl Wire for f32 {
 fn to_json(&self)->Json{if self.is_finite(){json!(self)}else{json!({"F32Bits":self.to_bits()})}}
 fn from_json(v:&Json)->Result<Self,String>{
  if let Some(n)=v.as_f64(){let f=n as f32;if f.is_finite(){return Ok(f)}return Err("f32 overflow".into())}
  if let Some(o)=v.as_object(){if o.len()==1{if let Some(b)=o.get("F32Bits").and_then(Json::as_u64).and_then(|n|u32::try_from(n).ok()){return Ok(Self::from_bits(b))}}}
  Err("expected finite f32 or F32Bits".into())
 }
}
impl Wire for f64 {
 fn to_json(&self)->Json{if self.is_finite(){json!(self)}else{json!({"F64Bits":self.to_bits().to_string()})}}
 fn from_json(v:&Json)->Result<Self,String>{
  if let Some(n)=v.as_f64(){if n.is_finite(){return Ok(n)}return Err("f64 overflow".into())}
  if let Some(o)=v.as_object(){if o.len()==1{if let Some(s)=o.get("F64Bits").and_then(Json::as_str){
   if !s.is_empty()&&s.len()<=20&&!(s.len()>1&&s.starts_with('0'))&&s.bytes().all(|c|c.is_ascii_digit()){
    if let Ok(bits)=s.parse::<u64>(){return Ok(Self::from_bits(bits));}
   }
  }}}
  Err("expected finite f64 or F64Bits decimal string".into())
 }
}
impl<T:Wire,const N:usize> Wire for [T;N] {
 fn to_json(&self)->Json{self.iter().map(Wire::to_json).collect()}
 fn from_json(v:&Json)->Result<Self,String>{let a=v.as_array().ok_or("expected vector")?;if a.len()!=N{return Err("vector dimension mismatch".into())}a.iter().map(T::from_json).collect::<Result<Vec<_>,_>>()?.try_into().map_err(|_|"vector dimension mismatch".into())}
}

#[derive(Clone,Copy,Debug,PartialEq,Eq)] pub enum InkArithmeticError {Overflow}
impl Wire for InkArithmeticError {
 fn to_json(&self)->Json{json!("ArithmeticError.Overflow")}
 fn from_json(v:&Json)->Result<Self,String>{if v.as_str()==Some("ArithmeticError.Overflow"){Ok(Self::Overflow)}else{Err("invalid arithmetic error".into())}}
}

impl<T:Wire> Wire for Box<T> { fn to_json(&self)->Json { (**self).to_json() } fn from_json(v:&Json)->Result<Self,String> { Ok(Box::new(T::from_json(v)?)) } }

// Structural stored-data identity is separate from scalar IEEE equality.
trait InkDataEq { fn ink_data_eq(&self,other:&Self)->bool; }
macro_rules! data_eq {($($t:ty),*)=>{$(impl InkDataEq for $t{fn ink_data_eq(&self,other:&Self)->bool{self==other}})*};}
data_eq!((),bool,u32,u64,i32,BigInt,String,InkArithmeticError);
impl InkDataEq for f32{fn ink_data_eq(&self,other:&Self)->bool{self.to_bits()==other.to_bits()}}
impl InkDataEq for f64{fn ink_data_eq(&self,other:&Self)->bool{self.to_bits()==other.to_bits()}}
impl<T:InkDataEq> InkDataEq for Box<T>{fn ink_data_eq(&self,other:&Self)->bool{(**self).ink_data_eq(&**other)}}
impl<T:InkDataEq> InkDataEq for Vec<T>{fn ink_data_eq(&self,other:&Self)->bool{self.len()==other.len()&&self.iter().zip(other).all(|(a,b)|a.ink_data_eq(b))}}
impl<T:InkDataEq,const N:usize> InkDataEq for [T;N]{fn ink_data_eq(&self,other:&Self)->bool{self.iter().zip(other).all(|(a,b)|a.ink_data_eq(b))}}
impl<T:InkDataEq> InkDataEq for Option<T>{fn ink_data_eq(&self,other:&Self)->bool{match(self,other){(Some(a),Some(b))=>a.ink_data_eq(b),(None,None)=>true,_=>false}}}
impl<T:InkDataEq,E:InkDataEq> InkDataEq for Result<T,E>{fn ink_data_eq(&self,other:&Self)->bool{match(self,other){(Ok(a),Ok(b))=>a.ink_data_eq(b),(Err(a),Err(b))=>a.ink_data_eq(b),_=>false}}}

pub fn ink_int_from_f64(x:f64)->Option<num_bigint::BigInt>{
 if !x.is_finite(){return None;}let b=x.to_bits();let e=((b>>52)&2047) as i32-1023;
 if e<0{return Some(0.into());}let m=(b&0xfffffffffffff)|0x10000000000000;let n=num_bigint::BigInt::from(m);
 let v=if e>=52{n<<((e-52) as usize)}else{n>>((52-e) as usize)};
 Some(if b&0x8000000000000000!=0{-v}else{v})
}
pub fn ink_f64_from_int(x:&num_bigint::BigInt)->f64{
 use num_bigint::{BigUint,Sign};let a=x.magnitude();let bits=a.bits();let sign=if x.sign()==Sign::Minus{0x8000000000000000}else{0};
 if bits==0{return 0.0;}if bits<=53{let n=a.to_u64_digits()[0] as f64;return if sign==0{n}else{-n};}
 if bits>1024{return f64::from_bits(sign|0x7ff0000000000000);}
 let shift=(bits-53) as usize;let q=a>>shift;let mut m=q.to_u64_digits()[0];let rem=a-(&q<<shift);let half=BigUint::from(1u32)<<(shift-1);
 if rem>half||(rem==half&&m&1!=0){m+=1;}let mut e=bits-1+1023;
 if m==0x20000000000000{m>>=1;e+=1;}if e>=2047{return f64::from_bits(sign|0x7ff0000000000000);}
 f64::from_bits(sign|(e<<52)|(m&0xfffffffffffff))
}
pub fn ink_int_from_f32(x:f32)->Option<num_bigint::BigInt>{
 if !x.is_finite(){return None;}let b=x.to_bits();let e=((b>>23)&255) as i32-127;
 if e<0{return Some(0.into());}let m=(b&0x7fffff)|0x800000;let n=num_bigint::BigInt::from(m);
 let v=if e>=23{n<<((e-23) as usize)}else{n>>((23-e) as usize)};
 Some(if b&0x80000000!=0{-v}else{v})
}
pub fn ink_f32_from_int(x:&num_bigint::BigInt)->f32{
 use num_bigint::{BigUint,Sign};let a=x.magnitude();let bits=a.bits();let sign=if x.sign()==Sign::Minus{0x80000000}else{0};
 if bits==0{return 0.0;}if bits<=24{let n=a.to_u32_digits()[0] as f32;return if sign==0{n}else{-n};}
 if bits>128{return f32::from_bits(sign|0x7f800000);}
 let shift=(bits-24) as usize;let q=a>>shift;let mut m=q.to_u32_digits()[0];let rem=a-(&q<<shift);let half=BigUint::from(1u32)<<(shift-1);
 if rem>half||(rem==half&&m&1!=0){m+=1;}let mut e=bits as u32-1+127;
 if m==0x1000000{m>>=1;e+=1;}if e>=255{return f32::from_bits(sign|0x7f800000);}
 f32::from_bits(sign|(e<<23)|(m&0x7fffff))
}

mod temporary {
// Affine owners use a Vec directly until partitioned. Partitions share one
// allocation with disjoint logical ranges. Checked source cannot retain the old
// owner or escape a partition; growth detaches a range before it can overlap.
#[derive(Clone, Debug)]
enum InkBufferStorage<T> {
    Owned(Vec<T>),
    Shared { data:std::rc::Rc<std::cell::RefCell<Vec<T>>>, start:usize, end:usize },
}
#[derive(Clone, Debug)]
pub struct OwnedBuffer<T>(InkBufferStorage<T>);
pub struct BorrowedBuffer<'a,T>(&'a[T]);
impl<T:Clone> BorrowedBuffer<'_,T> {
    pub fn len(&self)->u32 {self.0.len().try_into().expect("buffer exceeds u32")}
    pub fn get(&self,i:u32)->Option<T> {self.0.get(i as usize).cloned()}
    pub fn with_item<R>(&self,i:u32,f:impl FnOnce(Option<&T>)->R)->R {f(self.0.get(i as usize))}
    pub unsafe fn get_unchecked(&self,i:u32)->T {unsafe{self.0.get_unchecked(i as usize).clone()}}
    pub fn with_range<R>(&self,start:u32,count:u32,f:impl FnOnce(BorrowedBuffer<'_,T>)->R)->R {
        let start=(start as usize).min(self.0.len());let count=(count as usize).min(self.0.len()-start);
        f(BorrowedBuffer(&self.0[start..start+count]))
    }
}
impl<T:Clone> OwnedBuffer<T> {
    pub fn new(xs:Vec<T>)->Self { Self(InkBufferStorage::Owned(xs)) }
    // Opaque native handles are invocation-local aliases, not source owners.
    pub fn shared(xs:Vec<T>)->Self { let end=xs.len();Self(InkBufferStorage::Shared{data:std::rc::Rc::new(std::cell::RefCell::new(xs)),start:0,end}) }
    fn read<R>(&self,f:impl FnOnce(&[T])->R)->R {match &self.0 {
        InkBufferStorage::Owned(xs)=>f(xs),
        InkBufferStorage::Shared{start,end,..} if start==end=>f(&[]),
        InkBufferStorage::Shared{data,start,end}=>f(&data.borrow()[*start..*end]),
    }}
    fn edit<R>(&mut self,f:impl FnOnce(&mut [T])->R)->R {match &mut self.0 {
        InkBufferStorage::Owned(xs)=>f(xs),
        InkBufferStorage::Shared{start,end,..} if start==end=>f(&mut []),
        InkBufferStorage::Shared{data,start,end}=>f(&mut data.borrow_mut()[*start..*end]),
    }}
    pub fn len(&self)->u32 {let n=match &self.0 {InkBufferStorage::Owned(xs)=>xs.len(),InkBufferStorage::Shared{start,end,..}=>end-start};n.try_into().expect("buffer exceeds u32")}
    pub fn get(&self,i:u32)->Option<T>{self.read(|xs|xs.get(i as usize).cloned())}
    pub fn with_item<R>(&self,i:u32,f:impl FnOnce(Option<&T>)->R)->R {self.read(|xs|f(xs.get(i as usize)))}
    pub fn with_range<R>(&self,start:u32,count:u32,f:impl FnOnce(BorrowedBuffer<'_,T>)->R)->R {
        self.read(|xs|{let start=(start as usize).min(xs.len());let count=(count as usize).min(xs.len()-start);f(BorrowedBuffer(&xs[start..start+count]))})
    }
    // Opaque handles already use shared storage. These invocation-local views
    // are readonly in checked source and retain the original logical bounds.
    pub fn range_handle(&self,start:u32,count:u32)->Self {
        match &self.0 {
            InkBufferStorage::Shared{data,start:base,end}=> {
                let start=*base+(start as usize).min(*end-*base);
                let end=start+(count as usize).min(*end-start);
                Self(InkBufferStorage::Shared{data:data.clone(),start,end})
            },
            InkBufferStorage::Owned(_)=>self.read(|xs|{let start=(start as usize).min(xs.len());let count=(count as usize).min(xs.len()-start);Self::shared(xs[start..start+count].to_vec())}),
        }
    }
    pub unsafe fn get_unchecked(&self,i:u32)->T {self.read(|xs|unsafe{xs.get_unchecked(i as usize).clone()})}
    pub fn set(mut self,i:u32,value:T)->Self {self.edit(|xs|if let Some(x)=xs.get_mut(i as usize){*x=value});self}
    pub fn swap(mut self,a:u32,b:u32)->Self {self.edit(|xs|if (a as usize)<xs.len()&&(b as usize)<xs.len(){xs.swap(a as usize,b as usize)});self}
    pub fn fill_range(mut self,start:u32,count:u32,value:T)->Self {
        self.edit(|xs|{let start=(start as usize).min(xs.len());let count=(count as usize).min(xs.len()-start);xs[start..start+count].fill(value)});self
    }
    pub fn copy_within(mut self,source:u32,destination:u32,count:u32)->Self {
        self.edit(|xs|{
            let source=(source as usize).min(xs.len());let destination=(destination as usize).min(xs.len());
            let count=(count as usize).min(xs.len()-source).min(xs.len()-destination);
            if source==destination{return}
            if destination>source {for i in (0..count).rev(){xs[destination+i]=xs[source+i].clone();}}
            else {for i in 0..count{xs[destination+i]=xs[source+i].clone();}}
        });self
    }
    pub fn copy_within_copy(mut self,source:u32,destination:u32,count:u32)->Self where T:Copy {
        self.edit(|xs|{
            let a=(source as usize).min(xs.len());let b=(destination as usize).min(xs.len());
            let n=(count as usize).min(xs.len()-a).min(xs.len()-b);
            xs.copy_within(a..a+n,b);
        });self
    }
    pub fn map_inplace(mut self,mut f:impl FnMut(T)->T)->Self {self.edit(|xs|for x in xs{*x=f(x.clone())});self}
    pub fn map_indexed_inplace(mut self,mut f:impl FnMut(u32,T)->T)->Self {self.edit(|xs|for(i,x)in xs.iter_mut().enumerate(){*x=f(i as u32,x.clone())});self}
    pub fn scan_inplace(mut self,acc:T,mut f:impl FnMut(T,T)->T)->Self {let mut state=Some(acc);self.edit(|xs|for x in xs{let next=f(state.take().expect("scan state"),x.clone());*x=next.clone();state=Some(next)});self}
    pub fn filter_inplace(mut self,mut f:impl FnMut(T)->bool)->Self {
        let kept=self.edit(|xs|{let mut n=0;for i in 0..xs.len(){if f(xs[i].clone()){xs.swap(n,i);n+=1}}n});
        self.truncate(kept as u32)
    }
    pub fn pop(self)->Self {let n=self.len().saturating_sub(1);self.truncate(n)}
    pub fn truncate(mut self,n:u32)->Self {match &mut self.0 {
        InkBufferStorage::Owned(xs)=>xs.truncate(n as usize),
        InkBufferStorage::Shared{start,end,..}=>*end=*start+((*end-*start).min(n as usize)),
    };self}
    pub fn push(mut self,value:T)->Self {
        assert!(self.len()<u32::MAX,"buffer length exhausted");
        match &mut self.0 {
            InkBufferStorage::Owned(xs)=>{xs.push(value);return self},
            InkBufferStorage::Shared{data,start,end} if *start==0&&*end==data.borrow().len()=>{data.borrow_mut().push(value);*end+=1;return self},
            _=>{},
        }
        let mut xs=self.freeze();xs.push(value);Self::new(xs)
    }
    pub fn split(self,at:u32)->(Self,Self){
        if at==0 || at>=self.len(){
            let empty=if matches!(&self.0,InkBufferStorage::Shared{..}){Self::shared(Vec::new())}else{Self::new(Vec::new())};
            return if at==0 {(empty,self)}else{(self,empty)}
        }
        let (data,start,end)=match self.0 {
            InkBufferStorage::Owned(xs)=>{let end=xs.len();(std::rc::Rc::new(std::cell::RefCell::new(xs)),0,end)},
            InkBufferStorage::Shared{data,start,end}=>(data,start,end),
        };
        let cut=start+(at as usize).min(end-start);
        (Self(InkBufferStorage::Shared{data:data.clone(),start,end:cut}),Self(InkBufferStorage::Shared{data,start:cut,end}))
    }
    pub fn append(self,other:Self)->Self {
        if let (InkBufferStorage::Shared{data,start,end},InkBufferStorage::Shared{data:rhs,start:rstart,end:rend})=(&self.0,&other.0) {
            if std::rc::Rc::ptr_eq(data,rhs)&&end==rstart {return Self(InkBufferStorage::Shared{data:data.clone(),start:*start,end:*rend})}
        }
        let mut rhs=other.freeze();
        let mut left=self;
        if let InkBufferStorage::Shared{data,start,end}=&mut left.0 {
            if *start==0&&*end==data.borrow().len(){data.borrow_mut().append(&mut rhs);*end=data.borrow().len();return left}
        }
        let mut xs=left.freeze();xs.append(&mut rhs);Self::new(xs)
    }
    // Opaque handles obey checked source moves. Other nonempty aliases are
    // dead after this transfer; empty scoped partitions remain usable.
    pub fn freeze_handle(self)->Vec<T>{
        if let InkBufferStorage::Shared{data,start,end}=&self.0 {
            if start==end{return Vec::new()}
            if *start==0&&*end==data.borrow().len(){return std::mem::take(&mut *data.borrow_mut())}
        }
        self.freeze()
    }
    pub fn freeze(self)->Vec<T>{match self.0 {
        InkBufferStorage::Owned(xs)=>xs,
        InkBufferStorage::Shared{start,end,..} if start==end=>Vec::new(),
        InkBufferStorage::Shared{data,start,end}=>match std::rc::Rc::try_unwrap(data) {
            Ok(cell)=>{let mut xs=cell.into_inner();xs.truncate(end);if start==0{xs}else{xs.drain(..start);xs}},
            Err(data)=>data.borrow()[start..end].to_vec(),
        }
    }}
}
impl<T:Clone+PartialEq> PartialEq for OwnedBuffer<T>{fn eq(&self,r:&Self)->bool{self.read(|a|r.read(|b|a==b))}}
impl<T:Clone+Eq> Eq for OwnedBuffer<T>{}
impl<T:Clone+PartialOrd> PartialOrd for OwnedBuffer<T>{fn partial_cmp(&self,r:&Self)->Option<std::cmp::Ordering>{self.read(|a|r.read(|b|a.partial_cmp(b)))}}
impl<T:Clone+Ord> Ord for OwnedBuffer<T>{fn cmp(&self,r:&Self)->std::cmp::Ordering{self.read(|a|r.read(|b|a.cmp(b)))}}
// Exact dense scalar scratch with bounded per-thread allocation reuse. Keys
// outside the dense domain migrate all live entries into the ordered fallback.
const INK_DENSE_LIMIT: usize = 4096;
const INK_SCRATCH_RETAIN: usize = 2048;
const INK_SCRATCH_POOL_LIMIT: usize = 8;
std::thread_local! {static INK_MAP_POOL:std::cell::RefCell<Vec<Box<dyn std::any::Any>>>=const{std::cell::RefCell::new(Vec::new())};}
#[derive(Clone, Debug)]
struct InkSlot<K,V> { epoch:u64, value:Option<(K,V)> }
#[derive(Clone, Debug)]
struct InkDense<K,V> { epoch:u64, length:usize, slots:Vec<InkSlot<K,V>> }
impl<K:'static,V:'static> InkDense<K,V> {
    fn fresh()->Self {
        let old=INK_MAP_POOL.with(|pool| {let mut pool=pool.borrow_mut();let at=pool.iter().position(|p|p.as_ref().is::<Self>());at.map(|i|*pool.swap_remove(i).downcast::<Self>().unwrap())});
        let mut scratch=old.unwrap_or(Self{epoch:0,length:0,slots:vec![]});
        if scratch.epoch==u64::MAX {for slot in &mut scratch.slots {slot.epoch=0;slot.value=None;}scratch.epoch=1;}
        else {scratch.epoch+=1;}
        scratch.length=0;scratch
    }
}
fn ink_dense_index<K:'static>(key:&K)->Option<usize> {
    let any=key as &dyn std::any::Any;
    let index=if let Some(&x)=any.downcast_ref::<u32>() {x as u64}
        else if let Some(&x)=any.downcast_ref::<u64>() {x}
        else if let Some(&x)=any.downcast_ref::<i32>() {u64::try_from(x).ok()?}
        else if let Some(&x)=any.downcast_ref::<bool>() {u64::from(x)} else {return None};
    if index<INK_DENSE_LIMIT as u64 {Some(index as usize)}else{None}
}
fn ink_scalar<T:'static>()->bool {
    let id=std::any::TypeId::of::<T>();[std::any::TypeId::of::<u32>(),std::any::TypeId::of::<u64>(),std::any::TypeId::of::<i32>(),std::any::TypeId::of::<bool>()].contains(&id)
}
#[derive(Clone, Debug)]
enum InkMapStorage<K:Ord+'static,V:'static> { Sparse(std::collections::BTreeMap<K,V>), Dense(InkDense<K,V>), Shared(std::rc::Rc<std::cell::RefCell<OwnedMap<K,V>>>) }
#[derive(Clone, Debug)]
pub struct OwnedMap<K:Ord+'static,V:'static>(InkMapStorage<K,V>);
impl<K:Ord+Clone+'static,V:Clone+'static> OwnedMap<K,V> {
    pub fn new()->Self {
        if ink_scalar::<K>()&&ink_scalar::<V>() {Self(InkMapStorage::Dense(InkDense::fresh()))}
        else {Self::new_sparse()}
    }
    pub fn shared()->Self {Self(InkMapStorage::Shared(std::rc::Rc::new(std::cell::RefCell::new(Self::new()))))}
    pub fn new_sparse()->Self {Self(InkMapStorage::Sparse(std::collections::BTreeMap::new()))}
    fn entries(&self)->Box<dyn Iterator<Item=(K,V)>+'_> {
        match &self.0 {
            InkMapStorage::Shared(map)=>Box::new(map.borrow().entries().collect::<Vec<_>>().into_iter()),
            InkMapStorage::Sparse(map)=>Box::new(map.iter().map(|(k,v)|(k.clone(),v.clone()))),
            InkMapStorage::Dense(s)=>Box::new(s.slots.iter().filter(move|x|x.epoch==s.epoch).filter_map(|x|x.value.as_ref().map(|(k,v)|(k.clone(),v.clone())))),
        }
    }
    pub fn len(&self)->u32 {match &self.0 {InkMapStorage::Sparse(map)=>map.len(),InkMapStorage::Dense(s)=>s.length,InkMapStorage::Shared(map)=>return map.borrow().len()}.try_into().expect("map exceeds u32")}
    pub fn get(&self,key:&K)->Option<V> {
        match &self.0 {
            InkMapStorage::Shared(map)=>map.borrow().get(key),
            InkMapStorage::Sparse(map)=>map.get(key).cloned(),
            InkMapStorage::Dense(s)=>ink_dense_index(key).and_then(|i|s.slots.get(i)).filter(|x|x.epoch==s.epoch).and_then(|x|x.value.as_ref().map(|(_,v)|v.clone())),
        }
    }
    pub fn contains(&self,key:&K)->bool {self.get(key).is_some()}
    pub fn set(mut self,key:K,value:V)->Self {
        if let InkMapStorage::Shared(data)=&self.0 {let mut map=data.borrow_mut();let old=std::mem::replace(&mut *map,Self::new_sparse());*map=old.set(key,value);drop(map);return self;}
        if let InkMapStorage::Dense(s)=&mut self.0 {
            if let Some(index)=ink_dense_index(&key).filter(|&i|i<=s.slots.len().saturating_mul(8)+64) {
                s.slots.resize_with(s.slots.len().max(index+1),||InkSlot{epoch:0,value:None});
                let slot=&mut s.slots[index];if slot.epoch!=s.epoch||slot.value.is_none(){s.length+=1;}
                slot.value=Some((key,value));slot.epoch=s.epoch;return self;
            }
            let mut ordered=std::collections::BTreeMap::new();
            for slot in &mut s.slots {if slot.epoch==s.epoch {if let Some((k,v))=slot.value.take(){ordered.insert(k,v);}}}
            ordered.insert(key,value);
            let old=std::mem::replace(&mut self.0,InkMapStorage::Sparse(ordered));
            if let InkMapStorage::Dense(s)=old {ink_recycle(s);}
        } else if let InkMapStorage::Sparse(map)=&mut self.0 {map.insert(key,value);}
        self
    }
    pub fn remove(mut self,key:&K)->Self {
        if let InkMapStorage::Shared(data)=&self.0 {let mut map=data.borrow_mut();let old=std::mem::replace(&mut *map,Self::new_sparse());*map=old.remove(key);drop(map);return self;}
        match &mut self.0 {
            InkMapStorage::Shared(_)=>unreachable!("shared handled above"),
            InkMapStorage::Sparse(map)=>{map.remove(key);},
            InkMapStorage::Dense(s)=>{if let Some(slot)=ink_dense_index(key).and_then(|i|s.slots.get_mut(i)){if slot.epoch==s.epoch&&slot.value.take().is_some(){s.length-=1;slot.epoch=0;}}},
        }self
    }
    pub fn keys(&self)->Vec<K>{self.entries().map(|(k,_)|k.clone()).collect()}
    pub fn values(&self)->Vec<V>{self.entries().map(|(_,v)|v.clone()).collect()}
}
fn ink_recycle<K:'static,V:'static>(scratch:InkDense<K,V>) {
    if scratch.slots.capacity()<=INK_SCRATCH_RETAIN {INK_MAP_POOL.with(|pool|{let mut pool=pool.borrow_mut();if pool.len()<INK_SCRATCH_POOL_LIMIT {pool.push(Box::new(scratch));}});}
}
impl<K:Ord+'static,V:'static> Drop for OwnedMap<K,V> {
    fn drop(&mut self) {if matches!(self.0,InkMapStorage::Dense(_)){if let InkMapStorage::Dense(s)=std::mem::replace(&mut self.0,InkMapStorage::Sparse(std::collections::BTreeMap::new())){ink_recycle(s);}}}
}
impl<K:Ord+Clone+'static,V:Clone+PartialEq+'static> PartialEq for OwnedMap<K,V>{fn eq(&self,other:&Self)->bool{self.entries().eq(other.entries())}}
impl<K:Ord+Clone+'static,V:Clone+Eq+'static> Eq for OwnedMap<K,V>{}
impl<K:Ord+Clone+'static,V:Clone+Ord+'static> Ord for OwnedMap<K,V>{fn cmp(&self,other:&Self)->std::cmp::Ordering{self.entries().cmp(other.entries())}}
impl<K:Ord+Clone+'static,V:Clone+PartialOrd+'static> PartialOrd for OwnedMap<K,V>{fn partial_cmp(&self,other:&Self)->Option<std::cmp::Ordering>{self.entries().partial_cmp(other.entries())}}

// Bounded fork/join execution. Each worker owns a disjoint mutable slice;
// joining retains source order. Nested parallel requests execute sequentially.
std::thread_local! {static INK_PARALLEL_DEPTH:std::cell::Cell<u32>=const{std::cell::Cell::new(0)};}
struct InkParallelGuard(u32);
impl InkParallelGuard {
    fn enter() -> Self {
        Self(INK_PARALLEL_DEPTH.with(|d| {
            let old = d.get();
            d.set(old + 1);
            old
        }))
    }
}
impl Drop for InkParallelGuard {
    fn drop(&mut self) {
        INK_PARALLEL_DEPTH.with(|d| d.set(self.0));
    }
}
fn ink_parallel_workers(len: usize, grain: u32) -> usize {
    if cfg!(target_arch = "wasm32") {
        return 1;
    }
    if INK_PARALLEL_DEPTH.with(|d| d.get() > 0) {
        return 1;
    }
    let available = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(1);
    let requested = std::env::var("INK_THREADS")
        .ok()
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(available)
        .clamp(1, 32);
    requested.min(len / (grain.max(1) as usize)).max(1)
}
pub fn ink_parallel_map<T: Clone + Sync, U: Send, F: Fn(u32, T) -> U + Sync>(
    xs: Vec<T>,
    grain: u32,
    f: F,
) -> Vec<U> {
    let workers = ink_parallel_workers(xs.len(), grain);
    let _guard = InkParallelGuard::enter();
    if workers == 1 {
        return xs
            .into_iter()
            .enumerate()
            .map(|(i, x)| f(i as u32, x))
            .collect();
    }
    let chunk = (xs.len() + workers - 1) / workers;
    ink_parallel_start_receipt();
    std::thread::scope(|scope| {
        let handles = xs
            .chunks(chunk)
            .enumerate()
            .map(|(part, slice)| {
                let f = &f;
                scope.spawn(move || {
                    let _guard = InkParallelGuard::enter();
                    ink_parallel_record_thread();
                    slice
                        .iter()
                        .cloned()
                        .enumerate()
                        .map(|(i, x)| f((part * chunk + i) as u32, x))
                        .collect::<Vec<U>>()
                })
            })
            .collect::<Vec<_>>();
        let mut output = Vec::with_capacity(xs.len());
        for handle in handles {
            output.extend(handle.join().expect("parallel worker failed"));
        }
        output
    })
}
pub fn ink_parallel_update<T: Clone + Send, F: Fn(u32, T) -> T + Sync>(
    mut xs: Vec<T>,
    grain: u32,
    f: F,
) -> Vec<T> {
    let workers = ink_parallel_workers(xs.len(), grain);
    let _guard = InkParallelGuard::enter();
    if workers == 1 {
        for (i, x) in xs.iter_mut().enumerate() {
            *x = f(i as u32, x.clone());
        }
        return xs;
    }
    let chunk = (xs.len() + workers - 1) / workers;
    ink_parallel_start_receipt();
    std::thread::scope(|scope| {
        for (part, slice) in xs.chunks_mut(chunk).enumerate() {
            let f = &f;
            scope.spawn(move || {
                let _guard = InkParallelGuard::enter();
                ink_parallel_record_thread();
                for (i, x) in slice.iter_mut().enumerate() {
                    *x = f((part * chunk + i) as u32, x.clone());
                }
            });
        }
    });
    xs
}

pub fn ink_parallel_nested()->bool{INK_PARALLEL_DEPTH.with(|d|d.get()>0)}
pub fn with_parallel_worker<T>(f:impl FnOnce()->T)->T{let _guard=InkParallelGuard::enter();f()}

// Diagnostic receipt counts actual entered OS threads, never planned jobs.
static INK_PARALLEL_RECEIPT: std::sync::LazyLock<std::sync::Mutex<(u64,std::collections::BTreeSet<String>,std::collections::BTreeSet<String>)>> = std::sync::LazyLock::new(||std::sync::Mutex::new((0,std::collections::BTreeSet::new(),std::collections::BTreeSet::new())));
fn ink_parallel_start_receipt(){INK_PARALLEL_RECEIPT.lock().expect("parallel receipt lock").2.clear();}
fn ink_parallel_record_thread(){let mut r=INK_PARALLEL_RECEIPT.lock().expect("parallel receipt lock");r.0+=1;let id=format!("{:?}",std::thread::current().id());r.1.insert(id.clone());r.2.insert(id);}
pub fn ink_parallel_statistics()->(u64,Vec<String>,Vec<String>){let r=INK_PARALLEL_RECEIPT.lock().expect("parallel receipt lock");(r.0,r.1.iter().cloned().collect(),r.2.iter().cloned().collect())}

// Rust's ordinary (non-fast-math) f32 operations retain their separate rounding
// points after inlining. Keep NaN canonicalisation visible to vectorisation.
#[inline]
pub fn ink_f32(value:f32)->f32{if value.is_nan(){f32::from_bits(0x7fc00000)}else{value}}
pub fn ink_f64(value:f64)->f64{if value.is_nan(){f64::from_bits(0x7ff8000000000000)}else{value}}
pub fn ink_f64_div(x:f64,y:f64)->f64{ink_f64(x/y)}
pub fn ink_sqrt_f64(x:f64)->f64{ink_f64(x.sqrt())}
pub fn ink_floor_f64(x:f64)->f64{ink_f64(x.floor())}
pub fn ink_ceil_f64(x:f64)->f64{ink_f64(x.ceil())}
pub fn ink_trunc_f64(x:f64)->f64{ink_f64(x.trunc())}
pub fn ink_round_ties_even_f64(x:f64)->f64{ink_f64(x.round_ties_even())}
pub fn ink_u32_from_f64(x:f64)->Option<u32>{let x=x.trunc();(x.is_finite()&&x>=0.0&&x<4294967296.0).then(||x as u32)}
pub fn ink_u64_from_f64(x:f64)->Option<u64>{let x=x.trunc();(x.is_finite()&&x>=0.0&&x<18446744073709551616.0).then(||x as u64)}
pub fn ink_i32_from_f64(x:f64)->Option<i32>{let x=x.trunc();(x.is_finite()&&x>=-2147483648.0&&x<2147483648.0).then(||x as i32)}

// An explicit private-vector representation of the same affine Buffer value.
// Splitting copies into independent owners; allocation identity is unobservable.
// Selected by a checked physical plan, never by a workload matcher.
#[derive(Clone,Debug,PartialEq,Eq,PartialOrd,Ord)]
pub struct DirectBuffer<T>(Vec<T>);
impl<T:Clone> DirectBuffer<T> {
    pub fn new(xs:Vec<T>)->Self {Self(xs)}
    pub fn shared(xs:Vec<T>)->Self {Self(xs)}
    pub fn len(&self)->u32 {self.0.len().try_into().expect("buffer exceeds u32")}
    pub fn get(&self,i:u32)->Option<T>{self.0.get(i as usize).cloned()}
    pub fn with_item<R>(&self,i:u32,f:impl FnOnce(Option<&T>)->R)->R{f(self.0.get(i as usize))}
    pub fn with_range<R>(&self,start:u32,count:u32,f:impl FnOnce(BorrowedBuffer<'_,T>)->R)->R {
        let start=(start as usize).min(self.0.len());let count=(count as usize).min(self.0.len()-start);
        f(BorrowedBuffer(&self.0[start..start+count]))
    }
    pub fn range_handle(&self,start:u32,count:u32)->Self {
        let start=(start as usize).min(self.0.len());let count=(count as usize).min(self.0.len()-start);
        Self::new(self.0[start..start+count].to_vec())
    }
    pub unsafe fn get_unchecked(&self,i:u32)->T{self.0.get_unchecked(i as usize).clone()}
    pub fn set(mut self,i:u32,v:T)->Self{if let Some(x)=self.0.get_mut(i as usize){*x=v;}self}
    pub fn swap(mut self,a:u32,b:u32)->Self{if(a as usize)<self.0.len()&&(b as usize)<self.0.len(){self.0.swap(a as usize,b as usize);}self}
    pub fn fill_range(mut self,start:u32,count:u32,v:T)->Self{let a=(start as usize).min(self.0.len());let n=(count as usize).min(self.0.len()-a);self.0[a..a+n].fill(v);self}
    pub fn copy_within(mut self,source:u32,destination:u32,count:u32)->Self{
        let a=(source as usize).min(self.0.len());let b=(destination as usize).min(self.0.len());let n=(count as usize).min(self.0.len()-a).min(self.0.len()-b);
        if b>a {for i in (0..n).rev(){self.0[b+i]=self.0[a+i].clone();}}else if a!=b {for i in 0..n{self.0[b+i]=self.0[a+i].clone();}}self
    }
    pub fn copy_within_copy(mut self,source:u32,destination:u32,count:u32)->Self where T:Copy {
        let a=(source as usize).min(self.0.len());let b=(destination as usize).min(self.0.len());
        let n=(count as usize).min(self.0.len()-a).min(self.0.len()-b);
        self.0.copy_within(a..a+n,b);self
    }
    pub fn map_inplace(mut self,mut f:impl FnMut(T)->T)->Self{for v in &mut self.0{*v=f(v.clone());}self}
    pub fn map_indexed_inplace(mut self,mut f:impl FnMut(u32,T)->T)->Self{for(i,v)in self.0.iter_mut().enumerate(){*v=f(i as u32,v.clone());}self}
    pub fn scan_inplace(mut self,initial:T,mut f:impl FnMut(T,T)->T)->Self{let mut acc=initial;for v in &mut self.0{acc=f(acc,v.clone());*v=acc.clone();}self}
    pub fn filter_inplace(mut self,mut f:impl FnMut(T)->bool)->Self{self.0.retain(|v|f(v.clone()));self}
    pub fn truncate(mut self,n:u32)->Self{self.0.truncate(n as usize);self}
    pub fn pop(mut self)->Self{self.0.pop();self}
    pub fn push(mut self,v:T)->Self{
        if self.0.len()>=u32::MAX as usize{return self.length_exhausted(v);}
        // Keep the consuming owner's allocation path out of the hot loop. A
        // separate call lets the host compiler retain the vector in registers
        // between pushes without changing its capacity or element semantics.
        if self.0.len()==self.0.capacity(){return self.grow_and_push(v);}
        self.0.push(v);self
    }
    #[cold]
    #[inline(never)]
    fn length_exhausted(self,_v:T)->Self{panic!("buffer length exhausted")}
    #[cold]
    #[inline(never)]
    fn grow_and_push(mut self,v:T)->Self{self.0.push(v);self}
    pub fn split(mut self,at:u32)->(Self,Self){let right=self.0.split_off((at as usize).min(self.0.len()));(self,Self(right))}
    pub fn append(mut self,mut other:Self)->Self{self.0.append(&mut other.0);self}
    pub fn freeze(self)->Vec<T>{self.0}
    pub fn freeze_handle(self)->Vec<T>{self.0}
}

// Lossless scalar columns. Values outside the preferred lane promote storage;
// promotion checks value validity, never runtime profitability.
#[derive(Clone,Debug)]
enum InkWordLanes { U8(Vec<u8>), U16(Vec<u16>), U32(Vec<u32>), U64(Vec<u64>) }
#[derive(Clone,Debug)]
pub struct PackedWords<const BITS:u8,const BASE:u8=64>{data:InkWordLanes}
impl<const BITS:u8,const BASE:u8> Default for PackedWords<BITS,BASE>{fn default()->Self{Self{data:match BITS{8=>InkWordLanes::U8(vec![]),16=>InkWordLanes::U16(vec![]),32=>InkWordLanes::U32(vec![]),64=>InkWordLanes::U64(vec![]),_=>panic!("invalid packed word width")}}}}
impl<const BITS:u8,const BASE:u8> PackedWords<BITS,BASE>{
 pub fn with_capacity(n:usize)->Self{Self{data:match BITS{8=>InkWordLanes::U8(Vec::with_capacity(n)),16=>InkWordLanes::U16(Vec::with_capacity(n)),32=>InkWordLanes::U32(Vec::with_capacity(n)),64=>InkWordLanes::U64(Vec::with_capacity(n)),_=>panic!("invalid packed word width")}}}
 pub fn prepare_push(&mut self,x:u64){if !self.fits(x){self.promote(x);}self.reserve(1);}
 pub fn reserve(&mut self,n:usize){match &mut self.data{InkWordLanes::U8(v)=>v.reserve(n),InkWordLanes::U16(v)=>v.reserve(n),InkWordLanes::U32(v)=>v.reserve(n),InkWordLanes::U64(v)=>v.reserve(n)}}
 pub fn prepare_append(&mut self,other:&Self){if other.len()==0{return;}let bound=match other.data{InkWordLanes::U8(_)=>u8::MAX as u64,InkWordLanes::U16(_)=>u16::MAX as u64,InkWordLanes::U32(_)=>u32::MAX as u64,InkWordLanes::U64(_)=>u64::MAX};if !self.fits(bound){self.promote(bound);}self.reserve(other.len());}
 pub fn len(&self)->usize{match &self.data{InkWordLanes::U8(v)=>v.len(),InkWordLanes::U16(v)=>v.len(),InkWordLanes::U32(v)=>v.len(),InkWordLanes::U64(v)=>v.len()}}
 pub fn storage_identity(&self)->usize{match &self.data{InkWordLanes::U8(v)=>v.as_ptr()as usize,InkWordLanes::U16(v)=>v.as_ptr()as usize,InkWordLanes::U32(v)=>v.as_ptr()as usize,InkWordLanes::U64(v)=>v.as_ptr()as usize}}
 pub fn payload_bytes(&self)->usize{self.len()*match self.data{InkWordLanes::U8(_)=>1,InkWordLanes::U16(_)=>2,InkWordLanes::U32(_)=>4,InkWordLanes::U64(_)=>8}}
 pub fn get(&self,i:usize)->u64{assert!(i<self.len());unsafe{self.get_unchecked(i)}}
 pub unsafe fn get_unchecked(&self,i:usize)->u64{match &self.data{InkWordLanes::U8(v)=>*v.get_unchecked(i)as u64,InkWordLanes::U16(v)=>*v.get_unchecked(i)as u64,InkWordLanes::U32(v)=>*v.get_unchecked(i)as u64,InkWordLanes::U64(v)=>*v.get_unchecked(i)}}
 fn fits(&self,x:u64)->bool{match self.data{InkWordLanes::U8(_)=>x<=u8::MAX as u64,InkWordLanes::U16(_)=>x<=u16::MAX as u64,InkWordLanes::U32(_)=>x<=u32::MAX as u64,InkWordLanes::U64(_)=>true}}
 fn promote(&mut self,value:u64){let xs=(0..self.len()).map(|i|self.get(i)).collect::<Vec<_>>();self.data=if BASE<=32&&value<=u32::MAX as u64{InkWordLanes::U32(xs.into_iter().map(|v|v as u32).collect())}else{InkWordLanes::U64(xs)};}
 pub fn push(&mut self,x:u64){if !self.fits(x){self.promote(x);}match &mut self.data{InkWordLanes::U8(v)=>v.push(x as u8),InkWordLanes::U16(v)=>v.push(x as u16),InkWordLanes::U32(v)=>v.push(x as u32),InkWordLanes::U64(v)=>v.push(x)}}
 pub fn set(&mut self,i:usize,x:u64){assert!(i<self.len());if !self.fits(x){self.promote(x);}match &mut self.data{InkWordLanes::U8(v)=>v[i]=x as u8,InkWordLanes::U16(v)=>v[i]=x as u16,InkWordLanes::U32(v)=>v[i]=x as u32,InkWordLanes::U64(v)=>v[i]=x}}
 pub fn truncate(&mut self,n:usize){match &mut self.data{InkWordLanes::U8(v)=>v.truncate(n),InkWordLanes::U16(v)=>v.truncate(n),InkWordLanes::U32(v)=>v.truncate(n),InkWordLanes::U64(v)=>v.truncate(n)}}
}
#[derive(Clone,Debug,Default)]
pub struct PackedBits{len:usize,words:Vec<u64>}
impl PackedBits{
 pub fn with_capacity(n:usize)->Self{Self{len:0,words:Vec::with_capacity(n.div_ceil(64))}}
 pub fn reserve(&mut self,n:usize){let total=self.len.checked_add(n).expect("bit length overflow").div_ceil(64);self.words.reserve(total-self.words.len());}
 pub fn prepare_push(&mut self,_:bool){self.reserve(1);}
 pub fn prepare_append(&mut self,other:&Self){self.reserve(other.len());}
 pub fn len(&self)->usize{self.len}
 pub fn payload_bytes(&self)->usize{self.words.len()*8}
 pub fn storage_identity(&self)->usize{self.words.as_ptr()as usize}
 pub fn get(&self,i:usize)->bool{assert!(i<self.len);unsafe{self.get_unchecked(i)}}
 pub unsafe fn get_unchecked(&self,i:usize)->bool{(*self.words.get_unchecked(i/64)&(1u64<<(i%64)))!=0}
 pub fn push(&mut self,x:bool){if self.len%64==0{self.words.push(0);}let i=self.len;self.len+=1;self.set(i,x);}
 pub fn set(&mut self,i:usize,x:bool){assert!(i<self.len);let mask=1u64<<(i%64);let w=&mut self.words[i/64];*w=(*w&!mask)|if x{mask}else{0};}
 pub fn truncate(&mut self,n:usize){self.len=self.len.min(n);self.words.truncate(self.len.div_ceil(64));if self.len%64!=0{if let Some(last)=self.words.last_mut(){*last&=(1u64<<(self.len%64))-1;}}}
}

// Fixed scalar/text execution support. Float arithmetic canonicalises NaNs.
pub fn ink_sqrt(x:f32)->f32{ink_f32(x.sqrt())}
pub fn ink_f32_div(x:f32,y:f32)->f32{ink_f32(x/y)}
pub fn ink_floor(x:f32)->f32{ink_f32(x.floor())}
pub fn ink_ceil(x:f32)->f32{ink_f32(x.ceil())}
pub fn ink_trunc(x:f32)->f32{ink_f32(x.trunc())}
pub fn ink_round_ties_even(x:f32)->f32{ink_f32(x.round_ties_even())}
pub fn ink_u32_from_f32(x:f32)->Option<u32>{let x=x.trunc();(x.is_finite()&&x>=0.0&&x<4294967296.0).then(||x as u32)}
pub fn ink_u64_from_f32(x:f32)->Option<u64>{let x=x.trunc();(x.is_finite()&&x>=0.0&&x<18446744073709551616.0).then(||x as u64)}
pub fn ink_i32_from_f32(x:f32)->Option<i32>{let x=x.trunc();(x.is_finite()&&x>=-2147483648.0&&x<2147483648.0).then(||x as i32)}
pub fn ink_string_byte_len(x:&str)->u32{x.len().try_into().expect("String exceeds U32 byte length")}
pub fn ink_string_byte_at(x:&str,i:u32)->Option<u32>{x.as_bytes().get(i as usize).map(|b|*b as u32)}
pub fn ink_string_slice(x:&str,a:u32,b:u32)->Option<String>{x.get(a as usize..b as usize).map(str::to_owned)}
pub fn ink_string_concat(a:&str,b:&str)->String{assert!(a.len().checked_add(b.len()).is_some_and(|n|n<=u32::MAX as usize),"String exceeds U32 byte length");format!("{a}{b}")}
pub fn ink_string_find(x:&str,needle:&str,from:u32)->Option<u32>{x.get(from as usize..).and_then(|s|s.find(needle)).map(|i|from+i as u32)}

// Immutable snapshots share pages. An edit detaches the page directory and
// the touched page only; previous transaction/host before-images stay intact.
#[derive(Clone,Debug)]
pub struct PagedColumn<T,const PAGE:usize>{
    length:usize,
    pages:std::sync::Arc<Vec<std::sync::Arc<Vec<T>>>>,
}
impl<T,const PAGE:usize> Default for PagedColumn<T,PAGE>{
    fn default()->Self{Self{length:0,pages:std::sync::Arc::new(Vec::new())}}
}
impl<T:Clone,const PAGE:usize> PagedColumn<T,PAGE>{
    pub fn with_capacity(n:usize)->Self{
        assert!(PAGE>0);
        Self{length:0,pages:std::sync::Arc::new(Vec::with_capacity(n/PAGE+usize::from(n%PAGE!=0)))}
    }
    pub fn len(&self)->usize{self.length}
    pub fn reserve(&mut self,_additional:usize){}
    pub fn as_ptr(&self)->*const (){std::sync::Arc::as_ptr(&self.pages).cast()}
    pub unsafe fn get_unchecked(&self,i:usize)->&T{
        debug_assert!(i<self.length);
        unsafe{self.pages.get_unchecked(i/PAGE).get_unchecked(i%PAGE)}
    }
    pub unsafe fn get_unchecked_mut(&mut self,i:usize)->&mut T{
        debug_assert!(i<self.length);
        let pages=std::sync::Arc::make_mut(&mut self.pages);
        let page=unsafe{pages.get_unchecked_mut(i/PAGE)};
        unsafe{std::sync::Arc::make_mut(page).get_unchecked_mut(i%PAGE)}
    }
    pub fn set_if_changed_by(&mut self,i:usize,value:T,equal:impl FnOnce(&T,&T)->bool)->bool{
        assert!(i<self.length);
        if equal(unsafe{self.get_unchecked(i)},&value){return false}
        unsafe{*self.get_unchecked_mut(i)=value;}
        true
    }
    pub fn push(&mut self,value:T){
        let length=self.length.checked_add(1).expect("column length overflow");
        let pages=std::sync::Arc::make_mut(&mut self.pages);
        if self.length%PAGE==0{pages.push(std::sync::Arc::new(Vec::with_capacity(PAGE)));}
        std::sync::Arc::make_mut(pages.last_mut().expect("column page")).push(value);
        self.length=length;
    }
    pub fn truncate(&mut self,n:usize){
        if n>=self.length{return}
        if n==0{*self=Self::default();return}
        let pages=std::sync::Arc::make_mut(&mut self.pages);
        pages.truncate(n/PAGE+usize::from(n%PAGE!=0));
        if n%PAGE!=0{std::sync::Arc::make_mut(pages.last_mut().unwrap()).truncate(n%PAGE);}
        self.length=n;
    }
    pub fn append(&mut self,other:&mut Self){
        let length=self.length.checked_add(other.length).expect("column length overflow");
        if self.length%PAGE==0{
            let rhs=std::mem::take(other);
            std::sync::Arc::make_mut(&mut self.pages).extend(rhs.pages.iter().cloned());
            self.length=length;
        }else{
            for i in 0..other.length{self.push(unsafe{other.get_unchecked(i)}.clone());}
            *other=Self::default();
        }
    }
}
pub type InkTable<K,V> = std::collections::BTreeMap<K,V>; pub trait TableCapacity {fn reserve(&mut self,additional:usize);} impl<K,V> TableCapacity for InkTable<K,V>{fn reserve(&mut self,_:usize){}}
}
use temporary::{OwnedMap,InkTable,ink_parallel_map,ink_parallel_update};
use temporary::OwnedBuffer;
use temporary::TableCapacity;

impl<T:Clone> Wire for OwnedBuffer<T>{fn from_json(_: &Json)->Result<Self,String>{Err("temporary storage is internal to a pure invocation".into())}fn to_json(&self)->Json{Json::Null}}
impl<K:Ord+Clone+'static,V:Clone+'static> Wire for OwnedMap<K,V>{fn from_json(_: &Json)->Result<Self,String>{Err("temporary storage is internal to a pure invocation".into())}fn to_json(&self)->Json{Json::Null}}
impl<T:Clone> InkDataEq for OwnedBuffer<T>{fn ink_data_eq(&self,_:&Self)->bool{panic!("temporary storage has no value equality")}}
impl<K:Ord+Clone+'static,V:Clone+'static> InkDataEq for OwnedMap<K,V>{fn ink_data_eq(&self,_:&Self)->bool{panic!("temporary storage has no value equality")}}

mod transaction {
//! Fixed transaction primitives, shared verbatim with generated execution.
//! These describe the base protocol; they select no optimisation or layout.

pub const SEMANTICS: &str = "ink-change-boundary-v1";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Decision {
    Rollback,
    Commit { version: u64 },
    Exhausted,
}

/// A domain error wins over commit exhaustion. The body has already run;
/// both Rollback and Exhausted require restoration of its tentative effects.
#[inline]
pub fn decide(version: u64, succeeded: bool) -> Decision {
    if !succeeded {
        Decision::Rollback
    } else if let Some(version) = version.checked_add(1) {
        Decision::Commit { version }
    } else {
        Decision::Exhausted
    }
}

/// A nested change's error cannot be captured or ignored by its caller.
/// The outer Err exits the caller; the inner Result is its ordinary value.
#[inline]
pub fn nested_change<T, E>(result: Result<T, E>) -> Result<Result<T, E>, E> {
    match result {
        value @ Ok(_) => Ok(value),
        Err(error) => Err(error),
    }
}

#[derive(Debug, PartialEq, Eq)]
pub struct Publication<T> {
    pub commit: u64,
    pub position: u64,
    pub value: T,
}

/// Preserve staged order and number the committed suffix from zero, regardless
/// of earlier outbox contents. Publication neither clones nor reorders payloads.
pub fn publish<T>(
    version: u64,
    staged: impl Iterator<Item = T>,
) -> impl Iterator<Item = Publication<T>> {
    staged
        .enumerate()
        .map(move |(position, value)| Publication {
            commit: version,
            position: position as u64,
            value,
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn domain_errors_precede_exhaustion_and_success_never_wraps() {
        for version in [0, 1, 1 << 63, u64::MAX - 1, u64::MAX] {
            assert_eq!(decide(version, false), Decision::Rollback);
            assert_eq!(
                decide(version, true),
                match version.checked_add(1) {
                    Some(version) => Decision::Commit { version },
                    None => Decision::Exhausted,
                }
            );
        }
    }

    #[test]
    fn nested_result_and_ordered_publication_move_payloads() {
        struct Owned(&'static str);
        assert!(nested_change::<Owned, _>(Err(Owned("error"))).is_err());
        let value = nested_change::<_, Owned>(Ok(Owned("value")))
            .ok()
            .unwrap()
            .ok()
            .unwrap();
        let events: Vec<_> = publish(u64::MAX, [value, Owned("second")].into_iter()).collect();
        assert_eq!(events[0].commit, u64::MAX);
        assert_eq!(events[0].position, 0);
        assert_eq!(events[0].value.0, "value");
        assert_eq!(events[1].position, 1);
        assert_eq!(events[1].value.0, "second");
        assert_eq!(publish::<Owned>(2, std::iter::empty()).count(), 0);
    }
}

}

mod portable {
//! Shared, representation-independent snapshot codec. This module also ships
//! verbatim in generated applications; it has no AST/evaluator dependency.
use num_bigint::{BigInt, Sign};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::cmp::Ordering;

/// Raw binary64 payloads use canonical decimal u64 strings at JSON boundaries.
/// This codec is also embedded verbatim in generated applications.
pub fn f64_bits_from_json(value:&Value)->Result<u64,String> {
    if let Some(bits)=value.get("F64Bits") {
        if value.as_object().is_none_or(|o|o.len()!=1){return Err("expected only F64Bits field".into());}
        let text=bits.as_str().ok_or("F64Bits requires a decimal u64 string")?;
        if text.len()>20{return Err("invalid F64Bits word".into());}
        let parsed=text.parse::<u64>().map_err(|_|"invalid F64Bits word")?;
        if parsed.to_string()!=text{return Err("noncanonical F64Bits word".into());}
        Ok(parsed)
    }else{
        let x=value.as_f64().ok_or("expected binary64 number or F64Bits")?;
        if !x.is_finite(){return Err("finite f64 or explicit F64Bits required".into());}
        Ok(x.to_bits())
    }
}
pub fn f64_bits_to_json(bits:u64)->Value {
    let x=f64::from_bits(bits);
    if x.is_finite(){json!(x)}else{json!({"F64Bits":bits.to_string()})}
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Schema {
    Unit,
    Bool,
    U32,
    U64,
    I32,
    F32,
    F64,
    Vector(Box<Schema>, u8),
    Int,
    String,
    Id,
    Record(Vec<(String, Schema)>),
    Bind(String,Box<Schema>),
    Ref(String),
    Enum(Vec<String>),
    List(Box<Schema>),
    Option(Box<Schema>),
    Result(Box<Schema>, Box<Schema>),
}
/// Literal snapshot descriptors, distinct from public value ABI descriptors.
pub fn descriptor(s:&Schema)->Value {
    match s {
        Schema::Bind(n,t)=>json!({"kind":"bind","name":n,"body":descriptor(t)}),
        Schema::Ref(n)=>json!({"kind":"ref","name":n}),
        Schema::Record(fs)=>json!({"kind":"record","fields":fs.iter().map(|(n,t)|json!({"name":n,"type":descriptor(t)})).collect::<Vec<_>>()}),
        Schema::Enum(xs)=>json!({"kind":"enum","variants":xs}),
        Schema::List(t)=>json!({"kind":"list","element":descriptor(t)}),
        Schema::Option(t)=>json!({"kind":"option","element":descriptor(t)}),
        Schema::Result(a,b)=>json!({"kind":"result","ok":descriptor(a),"error":descriptor(b)}),
        Schema::Vector(t,n)=>json!({"kind":"vector","element":descriptor(t),"size":n}),
        _=>json!({"kind":match s {Schema::Unit=>"unit",Schema::Bool=>"bool",Schema::U32=>"u32",Schema::U64=>"u64",Schema::I32=>"i32",Schema::F32=>"f32",Schema::F64=>"f64",Schema::Int=>"int",Schema::String=>"string",Schema::Id=>"id",_=>unreachable!()}}),
    }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Layout {
    pub program: [u8; 32],
    pub schema: [u8; 32],
    pub roots: Vec<(String, Schema, Schema)>,
    pub events: Vec<(String, Schema)>,
}
#[derive(Clone, Debug, PartialEq)]
pub struct Event {
    pub commit: u64,
    pub position: u64,
    pub channel: usize,
    pub value: Value,
}
#[derive(Clone, Debug, PartialEq)]
pub struct Logical {
    pub version: u64,
    pub tables: Vec<Vec<(Value, Value)>>,
    pub outbox: Vec<Event>,
}
#[derive(Clone, Copy, Debug)]
pub struct Limits {
    pub bytes: usize,
    pub values: usize,
    pub depth: usize,
}
impl Default for Limits {
    fn default() -> Self {
        Self {
            bytes: 64 * 1024 * 1024,
            values: 1_000_000,
            depth: 128,
        }
    }
}
/// Magnitude bound for one exact integer. Decimal conversion is superlinear,
/// so without it a single large Int in a snapshot takes minutes to hours.
pub const MAX_INT_BYTES: usize = 4096;
const MAGIC: &[u8; 8] = b"VLSTATE\0";
const HEADER: usize = 8 + 2 + 2 + 32 + 32 + 8;
type R<T> = Result<T, String>;
fn u64_bytes(out: &mut Vec<u8>, v: u64) {
    out.extend_from_slice(&v.to_le_bytes());
}
fn count(out: &mut Vec<u8>, n: usize) {
    u64_bytes(out, n as u64);
}
fn raw(out: &mut Vec<u8>, b: &[u8]) {
    count(out, b.len());
    out.extend_from_slice(b);
}
fn tag<'a>(v: &'a Value, name: &str) -> R<&'a Value> {
    let o = v.as_object().ok_or("expected tagged object")?;
    if o.len() != 1 {
        return Err("expected exactly one tag".into());
    }
    o.get(name).ok_or("unexpected value tag".into())
}
fn integer(v: &Value) -> R<BigInt> {
    let s = tag(v, "Int")?.as_str().ok_or("expected Int string")?;
    // Every Int within the bound has fewer than 2.41 decimal digits per byte.
    if s.len() > MAX_INT_BYTES * 5 / 2 + 1 {
        return Err("snapshot Int exceeds size limit".into());
    }
    let n = s.parse::<BigInt>().map_err(|_| "invalid Int")?;
    if n.bits() > 8 * MAX_INT_BYTES as u64 {
        return Err("snapshot Int exceeds size limit".into());
    }
    if n.to_string() != s {
        return Err("noncanonical Int".into());
    }
    Ok(n)
}
fn identifier(v: &Value) -> R<u128> {
    let s = v.as_str().ok_or("expected ID")?;
    if s.len() != 32
        || !s
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return Err("noncanonical ID".into());
    }
    u128::from_str_radix(s, 16).map_err(|e| e.to_string())
}
fn compare(t: &Schema, a: &Value, b: &Value) -> R<Ordering> {
    Ok(match t {
        Schema::Bool=>a.as_bool().ok_or("invalid Bool key")?.cmp(&b.as_bool().ok_or("invalid Bool key")?),
        Schema::I32 => a
            .as_i64()
            .and_then(|n| i32::try_from(n).ok())
            .ok_or("invalid i32 key")?
            .cmp(
                &b.as_i64()
                    .and_then(|n| i32::try_from(n).ok())
                    .ok_or("invalid i32 key")?,
            ),
        Schema::U32 | Schema::U64 => a
            .as_u64()
            .ok_or("invalid key")?
            .cmp(&b.as_u64().ok_or("invalid key")?),
        Schema::String => a
            .as_str()
            .ok_or("invalid key")?
            .as_bytes()
            .cmp(b.as_str().ok_or("invalid key")?.as_bytes()),
        Schema::Id => identifier(a)?.cmp(&identifier(b)?),
        _ => return Err("unsupported snapshot key schema".into()),
    })
}
fn tick(left: &mut usize, depth: usize, limits: Limits) -> R<()> {
    if *left == 0 || depth > limits.depth {
        return Err("snapshot value/depth limit exceeded".into());
    }
    *left -= 1;
    Ok(())
}
fn encode_value<'s>(
    t: &'s Schema,
    v: &Value,
    out: &mut Vec<u8>,
    left: &mut usize,
    depth: usize,
    limits: Limits,
    bindings: &mut Vec<(&'s str,&'s Schema)>,
) -> R<()> {
    tick(left, depth, limits)?;
    match t {
        Schema::Bind(name,body) => {
            bindings.push((name,body));
            let result=encode_value(body,v,out,left,depth+1,limits,bindings);
            bindings.pop();result?;
        }
        Schema::Ref(name) => {
            let body=bindings.iter().rev().find(|(n,_)|*n==name).map(|(_,s)|*s).ok_or("unbound recursive snapshot schema")?;
            encode_value(body,v,out,left,depth+1,limits,bindings)?;
        }
        Schema::Unit => {
            if !v.is_null() {
                return Err("expected Unit".into());
            }
        }
        Schema::Bool => out.push(v.as_bool().ok_or("expected Bool")? as u8),
        Schema::U32 => out.extend_from_slice(
            &u32::try_from(v.as_u64().ok_or("expected u32")?)
                .map_err(|_| "u32 overflow")?
                .to_le_bytes(),
        ),
        Schema::U64 => u64_bytes(out, v.as_u64().ok_or("expected u64")?),
        Schema::I32 => out.extend_from_slice(
            &i32::try_from(v.as_i64().ok_or("expected i32")?)
                .map_err(|_| "i32 overflow")?
                .to_le_bytes(),
        ),
        Schema::F64 => out.extend_from_slice(&f64_bits_from_json(v)?.to_le_bytes()),
        Schema::F32 => {
            let bits = if let Some(b) = v.get("F32Bits") {
                if v.as_object().is_none_or(|o| o.len() != 1) {
                    return Err("expected only F32Bits field".into());
                }
                u32::try_from(b.as_u64().ok_or("expected f32 bits")?)
                    .map_err(|_| "f32 bits overflow")?
            } else {
                let f = v.as_f64().ok_or("expected f32")? as f32;
                if !f.is_finite() {
                    return Err("finite f32 or F32Bits required".into());
                }
                f.to_bits()
            };
            out.extend_from_slice(&bits.to_le_bytes());
        }
        Schema::Vector(inner, n) => {
            if !(2..=4).contains(n)
                || !matches!(inner.as_ref(), Schema::U32 | Schema::I32 | Schema::F32)
            {
                return Err("invalid vector schema".into());
            }
            let xs = v.as_array().ok_or("expected vector")?;
            if xs.len() != *n as usize {
                return Err("vector dimension mismatch".into());
            }
            for x in xs {
                encode_value(inner, x, out, left, depth + 1, limits,bindings)?;
            }
        }
        Schema::Int => {
            let n = integer(v)?;
            let (sign, b) = n.to_bytes_le();
            out.push(match sign {
                Sign::NoSign => 0,
                Sign::Plus => 1,
                Sign::Minus => 2,
            });
            if sign == Sign::NoSign {
                raw(out, &[])
            } else {
                raw(out, &b)
            }
        }
        Schema::String => raw(out, v.as_str().ok_or("expected String")?.as_bytes()),
        Schema::Id => out.extend_from_slice(&identifier(v)?.to_le_bytes()),
        Schema::Enum(names) => {
            let s = v.as_str().ok_or("expected enum string")?;
            let index = names
                .iter()
                .position(|n| n == s)
                .ok_or("unknown enum variant")?;
            out.extend_from_slice(&(index as u32).to_le_bytes());
        }
        Schema::Record(fields) => {
            let obj = v.as_object().ok_or("expected record")?;
            if obj.len() != fields.len() {
                return Err("record field mismatch".into());
            }
            for (n, t) in fields {
                encode_value(
                    t,
                    obj.get(n).ok_or("missing record field")?,
                    out,
                    left,
                    depth + 1,
                    limits,
                    bindings,
                )?;
            }
        }
        Schema::List(inner) => {
            let xs = v.as_array().ok_or("expected List")?;
            if xs.len() > *left {
                return Err("snapshot value limit exceeded".into());
            }
            count(out, xs.len());
            for x in xs {
                encode_value(inner, x, out, left, depth + 1, limits,bindings)?;
            }
        }
        Schema::Option(inner) => {
            if let Ok(x) = tag(v, "Some") {
                out.push(1);
                encode_value(inner, x, out, left, depth + 1, limits,bindings)?;
            } else {
                if !tag(v, "None")?.is_null() {
                    return Err("invalid None".into());
                }
                out.push(0);
            }
        }
        Schema::Result(a, b) => {
            if let Ok(x) = tag(v, "Ok") {
                out.push(0);
                encode_value(a, x, out, left, depth + 1, limits,bindings)?;
            } else {
                out.push(1);
                encode_value(b, tag(v, "Err")?, out, left, depth + 1, limits,bindings)?;
            }
        }
    }
    if out.len() > limits.bytes {
        return Err("snapshot byte limit exceeded".into());
    }
    Ok(())
}
struct Reader<'a> {
    bytes: &'a [u8],
    at: usize,
    left: usize,
    limits: Limits,
}
impl<'a> Reader<'a> {
    fn take(&mut self, n: usize) -> R<&'a [u8]> {
        let end = self.at.checked_add(n).ok_or("snapshot length overflow")?;
        let b = self.bytes.get(self.at..end).ok_or("truncated snapshot")?;
        self.at = end;
        Ok(b)
    }
    fn byte(&mut self) -> R<u8> {
        Ok(self.take(1)?[0])
    }
    fn u32(&mut self) -> R<u32> {
        Ok(u32::from_le_bytes(self.take(4)?.try_into().unwrap()))
    }
    fn u64(&mut self) -> R<u64> {
        Ok(u64::from_le_bytes(self.take(8)?.try_into().unwrap()))
    }
    fn len(&mut self) -> R<usize> {
        usize::try_from(self.u64()?).map_err(|_| "snapshot length not addressable".into())
    }
    fn sequence(&mut self) -> R<usize> {
        let n = self.len()?;
        if n > self.left {
            return Err("snapshot value limit exceeded".into());
        }
        Ok(n)
    }
    fn raw(&mut self) -> R<&'a [u8]> {
        let n = self.len()?;
        self.take(n)
    }
    fn value(&mut self, t: &Schema, depth: usize) -> R<Value> {
        self.value_scoped(t,depth,&mut vec![])
    }
    fn value_scoped<'s>(&mut self,t:&'s Schema,depth:usize,bindings:&mut Vec<(&'s str,&'s Schema)>)->R<Value>{
        tick(&mut self.left, depth, self.limits)?;
        Ok(match t {
            Schema::Bind(name,body) => {
                bindings.push((name,body));let result=self.value_scoped(body,depth+1,bindings);bindings.pop();result?
            }
            Schema::Ref(name) => {
                let body=bindings.iter().rev().find(|(n,_)|*n==name).map(|(_,s)|*s).ok_or("unbound recursive snapshot schema")?;
                self.value_scoped(body,depth+1,bindings)?
            }
            Schema::Unit => Value::Null,
            Schema::Bool => match self.byte()? {
                0 => json!(false),
                1 => json!(true),
                _ => return Err("invalid Bool tag".into()),
            },
            Schema::U32 => json!(self.u32()?),
            Schema::U64 => json!(self.u64()?),
            Schema::I32 => json!(self.u32()? as i32),
            Schema::F64 => f64_bits_to_json(self.u64()?),
            Schema::F32 => {
                let bits = self.u32()?;
                let f = f32::from_bits(bits);
                if f.is_finite() {
                    json!(f)
                } else {
                    json!({"F32Bits":bits})
                }
            }
            Schema::Vector(inner, n) => {
                if !(2..=4).contains(n)
                    || !matches!(inner.as_ref(), Schema::U32 | Schema::I32 | Schema::F32)
                {
                    return Err("invalid vector schema".into());
                }
                (0..*n)
                    .map(|_| self.value_scoped(inner, depth + 1,bindings))
                    .collect::<R<Vec<_>>>()?
                    .into()
            }
            Schema::Int => {
                let sign = self.byte()?;
                let bytes = self.raw()?;
                if bytes.len() > MAX_INT_BYTES {
                    return Err("snapshot Int exceeds size limit".into());
                }
                let sign = match sign {
                    0 if bytes.is_empty() => Sign::NoSign,
                    1 if !bytes.is_empty() && bytes.last() != Some(&0) => Sign::Plus,
                    2 if !bytes.is_empty() && bytes.last() != Some(&0) => Sign::Minus,
                    _ => return Err("noncanonical signed integer".into()),
                };
                json!({"Int":BigInt::from_bytes_le(sign,bytes).to_string()})
            }
            Schema::String => json!(std::str::from_utf8(self.raw()?).map_err(|_| "invalid UTF-8")?),
            Schema::Id => json!(format!(
                "{:032x}",
                u128::from_le_bytes(self.take(16)?.try_into().unwrap())
            )),
            Schema::Enum(names) => {
                json!(names.get(self.u32()? as usize).ok_or("invalid enum tag")?)
            }
            Schema::Record(fields) => {
                let mut obj = serde_json::Map::new();
                for (n, t) in fields {
                    obj.insert(n.clone(), self.value_scoped(t, depth + 1,bindings)?);
                }
                Value::Object(obj)
            }
            Schema::List(t) => {
                let n = self.sequence()?;
                let mut xs = Vec::new();
                for _ in 0..n {
                    xs.push(self.value_scoped(t, depth + 1,bindings)?);
                }
                Value::Array(xs)
            }
            Schema::Option(t) => match self.byte()? {
                0 => json!({"None":null}),
                1 => json!({"Some":self.value_scoped(t,depth+1,bindings)?}),
                _ => return Err("invalid Option tag".into()),
            },
            Schema::Result(a, b) => match self.byte()? {
                0 => json!({"Ok":self.value_scoped(a,depth+1,bindings)?}),
                1 => json!({"Err":self.value_scoped(b,depth+1,bindings)?}),
                _ => return Err("invalid Result tag".into()),
            },
        })
    }
}
fn event_order(e: &Event, version: u64, prior: Option<(u64, u64)>) -> R<()> {
    if e.commit == 0 || e.commit > version || prior.is_some_and(|p| p >= (e.commit, e.position)) {
        return Err("invalid snapshot event sequence".into());
    }
    Ok(())
}
fn table_rows(kt:&Schema,vt:&Schema,rows:&[(Value,Value)],out:&mut Vec<u8>,left:&mut usize,limits:Limits)->R<()> {
    if rows.len()>*left/2{return Err("snapshot row limit exceeded".into());}
    count(out,rows.len());
    let mut prior=None;
    for (k,v) in rows {
        if let Some(before)=prior {
            if compare(kt,before,k)?!=Ordering::Less {return Err("snapshot keys must be strictly ordered".into());}
        }
        encode_value(kt,k,out,left,0,limits,&mut vec![])?;
        encode_value(vt,v,out,left,0,limits,&mut vec![])?;
        prior=Some(k);
    }
    Ok(())
}
/// Canonical raw table identity, including float payloads and signed zero.
pub fn table_bytes(kt:&Schema,vt:&Schema,rows:&[(Value,Value)],limits:Limits)->R<Vec<u8>> {
    let mut out=vec![];let mut left=limits.values;
    table_rows(kt,vt,rows,&mut out,&mut left,limits)?;
    if out.len()>limits.bytes{return Err("snapshot byte limit exceeded".into());}
    Ok(out)
}
pub fn encode(layout: &Layout, s: &Logical, limits: Limits) -> R<Vec<u8>> {
    if s.tables.len() != layout.roots.len() {
        return Err("snapshot root count mismatch".into());
    }
    let mut out = Vec::new();
    let mut left = limits.values;
    u64_bytes(&mut out, s.version);
    for (rows, (_, kt, vt)) in s.tables.iter().zip(&layout.roots) {
        table_rows(kt,vt,rows,&mut out,&mut left,limits)?;
    }
    count(&mut out, s.outbox.len());
    let mut prior = None;
    for e in &s.outbox {
        event_order(e, s.version, prior)?;
        let (_, t) = layout
            .events
            .get(e.channel)
            .ok_or("unknown event channel")?;
        u64_bytes(&mut out, e.commit);
        u64_bytes(&mut out, e.position);
        out.extend_from_slice(&(e.channel as u32).to_le_bytes());
        encode_value(t, &e.value, &mut out, &mut left, 0, limits,&mut vec![])?;
        prior = Some((e.commit, e.position));
    }
    if HEADER
        .checked_add(out.len())
        .and_then(|n| n.checked_add(32))
        .is_none_or(|n| n > limits.bytes)
    {
        return Err("snapshot byte limit exceeded".into());
    }
    let mut bytes = Vec::new();
    bytes.extend_from_slice(MAGIC);
    bytes.extend_from_slice(&1u16.to_le_bytes());
    bytes.extend_from_slice(&1u16.to_le_bytes());
    bytes.extend_from_slice(&layout.program);
    bytes.extend_from_slice(&layout.schema);
    count(&mut bytes, out.len());
    bytes.extend_from_slice(&out);
    let digest = Sha256::digest(&bytes);
    bytes.extend_from_slice(&digest);
    Ok(bytes)
}
pub fn decode(layout: &Layout, bytes: &[u8], limits: Limits) -> R<Logical> {
    if bytes.len() > limits.bytes || bytes.len() < HEADER + 32 {
        return Err("snapshot byte length invalid".into());
    }
    if &bytes[..8] != MAGIC || bytes[8..12] != [1, 0, 1, 0] {
        return Err("snapshot format or semantics version mismatch".into());
    }
    if bytes[12..44] != layout.program || bytes[44..76] != layout.schema {
        return Err("snapshot program or schema identity mismatch".into());
    }
    let n = usize::try_from(u64::from_le_bytes(bytes[76..84].try_into().unwrap()))
        .map_err(|_| "snapshot length not addressable")?;
    if HEADER.checked_add(n).and_then(|v| v.checked_add(32)) != Some(bytes.len()) {
        return Err("snapshot payload length mismatch".into());
    }
    let end = bytes.len() - 32;
    if Sha256::digest(&bytes[..end]).as_slice() != &bytes[end..] {
        return Err("snapshot integrity check failed".into());
    }
    let mut r = Reader {
        bytes: &bytes[HEADER..end],
        at: 0,
        left: limits.values,
        limits,
    };
    let version = r.u64()?;
    let mut tables = vec![];
    for (_, kt, vt) in &layout.roots {
        let n = r.sequence()?;
        if n > r.left / 2 {
            return Err("snapshot row limit exceeded".into());
        }
        let mut rows: Vec<(Value, Value)> = vec![];
        for _ in 0..n {
            let k = r.value(kt, 0)?;
            let v = r.value(vt, 0)?;
            if let Some((prior, _)) = rows.last() {
                if compare(kt, prior, &k)? != Ordering::Less {
                    return Err("duplicate or unordered snapshot key".into());
                }
            }
            rows.push((k, v));
        }
        tables.push(rows);
    }
    let n = r.sequence()?;
    let mut outbox = vec![];
    let mut prior = None;
    for _ in 0..n {
        let commit = r.u64()?;
        let position = r.u64()?;
        let channel = r.u32()? as usize;
        let (_, t) = layout
            .events
            .get(channel)
            .ok_or("unknown snapshot event channel")?;
        let value = r.value(t, 0)?;
        let e = Event {
            commit,
            position,
            channel,
            value,
        };
        event_order(&e, version, prior)?;
        prior = Some((commit, position));
        outbox.push(e);
    }
    if r.at != r.bytes.len() {
        return Err("trailing snapshot payload".into());
    }
    Ok(Logical {
        version,
        tables,
        outbox,
    })
}

#[cfg(test)]
mod recursive_schema_tests {
    use super::*;
    fn node(next:Schema)->Schema {Schema::Record(vec![("value".into(),Schema::U64),("next".into(),Schema::Option(Box::new(next)))])}
    fn layout(value:Schema)->Layout {Layout{program:[1;32],schema:[2;32],roots:vec![("Rows".into(),Schema::U64,value)],events:vec![]}}
    #[test]
    fn recursive_schema_preserves_wire_bytes_and_rejects_truncation() {
        let bound=layout(Schema::Bind("Node".into(),Box::new(node(Schema::Ref("Node".into())))));
        let unrolled=layout(node(node(Schema::Unit)));
        let logical=Logical{version:4,tables:vec![vec![(json!(3),json!({"value":7,"next":{"Some":{"value":9,"next":{"None":null}}}}))]],outbox:vec![]};
        let bytes=encode(&bound,&logical,Limits::default()).unwrap();
        assert_eq!(bytes,encode(&unrolled,&logical,Limits::default()).unwrap());
        assert_eq!(logical,decode(&bound,&bytes,Limits::default()).unwrap());
        assert!(decode(&bound,&bytes[..bytes.len()-1],Limits::default()).is_err());
        assert!(decode(&bound,&bytes,Limits{depth:3,..Limits::default()}).unwrap_err().contains("depth"));
    }
    #[test]
    fn schema_references_cannot_escape_or_loop_without_consuming_budget() {
        let logical=Logical{version:0,tables:vec![vec![(json!(0),Value::Null)]],outbox:vec![]};
        assert!(encode(&layout(Schema::Ref("Missing".into())),&logical,Limits::default()).unwrap_err().contains("unbound"));
        let cyclic=layout(Schema::Bind("X".into(),Box::new(Schema::Ref("X".into()))));
        assert!(encode(&cyclic,&logical,Limits{depth:8,..Limits::default()}).unwrap_err().contains("depth"));
    }
}

}
pub use portable::Limits as SnapshotLimits;

struct TypedSnapshotWriter{out:Vec<u8>,left:usize,limits:SnapshotLimits}
impl TypedSnapshotWriter{
 fn new(limits:SnapshotLimits)->Self{Self{out:vec![],left:limits.values,limits}}
 fn tick(&mut self,depth:usize)->Result<(),String>{if self.left==0||depth>self.limits.depth{return Err("snapshot value/depth limit exceeded".into())}self.left-=1;Ok(())}
 fn bytes(&mut self,bytes:&[u8])->Result<(),String>{self.out.extend_from_slice(bytes);Ok(())}
 fn value_end(&self)->Result<(),String>{if self.out.len()>self.limits.bytes{return Err("snapshot byte limit exceeded".into())}Ok(())}
 fn count(&mut self,n:usize)->Result<(),String>{self.bytes(&(n as u64).to_le_bytes())}
 fn rows(&mut self,n:usize)->Result<(),String>{if n>self.left/2{return Err("snapshot row limit exceeded".into())}self.count(n)}
 fn list_length(&mut self,n:usize)->Result<(),String>{if n>self.left{return Err("snapshot value limit exceeded".into())}self.count(n)}
 fn raw(&mut self,bytes:&[u8])->Result<(),String>{self.count(bytes.len())?;self.bytes(bytes)}
 fn integer(&mut self,n:&BigInt)->Result<(),String>{if n.bits()>8*portable::MAX_INT_BYTES as u64{return Err("snapshot Int exceeds size limit".into())}let(sign,bytes)=n.to_bytes_le();self.bytes(&[match sign{num_bigint::Sign::NoSign=>0,num_bigint::Sign::Plus=>1,num_bigint::Sign::Minus=>2}])?;self.raw(if sign==num_bigint::Sign::NoSign{&[]}else{&bytes})}
 fn finish(self,layout:&portable::Layout)->Result<Vec<u8>,String>{use sha2::{Digest,Sha256};if 84usize.checked_add(self.out.len()).and_then(|n|n.checked_add(32)).is_none_or(|n|n>self.limits.bytes){return Err("snapshot byte limit exceeded".into())}let mut bytes=Vec::new();bytes.extend_from_slice(b"VLSTATE\0");bytes.extend_from_slice(&[1,0,1,0]);bytes.extend_from_slice(&layout.program);bytes.extend_from_slice(&layout.schema);bytes.extend_from_slice(&(self.out.len()as u64).to_le_bytes());bytes.extend_from_slice(&self.out);let digest=Sha256::digest(&bytes);bytes.extend_from_slice(&digest);Ok(bytes)}
}
struct TypedSnapshotReader<'a>{bytes:&'a [u8],at:usize,left:usize,limits:SnapshotLimits}
impl<'a> TypedSnapshotReader<'a>{
 fn new(layout:&portable::Layout,bytes:&'a [u8],limits:SnapshotLimits)->Result<Self,String>{use sha2::{Digest,Sha256};if bytes.len()>limits.bytes||bytes.len()<116{return Err("snapshot byte length invalid".into())}if &bytes[..8]!=b"VLSTATE\0"||bytes[8..12]!=[1,0,1,0]{return Err("snapshot format or semantics version mismatch".into())}if bytes[12..44]!=layout.program||bytes[44..76]!=layout.schema{return Err("snapshot program or schema identity mismatch".into())}let n=usize::try_from(u64::from_le_bytes(bytes[76..84].try_into().unwrap())).map_err(|_|"snapshot length not addressable")?;if 84usize.checked_add(n).and_then(|v|v.checked_add(32))!=Some(bytes.len()){return Err("snapshot payload length mismatch".into())}let end=bytes.len()-32;if Sha256::digest(&bytes[..end]).as_slice()!=&bytes[end..]{return Err("snapshot integrity check failed".into())}Ok(Self{bytes:&bytes[84..end],at:0,left:limits.values,limits})}
 fn tick(&mut self,depth:usize)->Result<(),String>{if self.left==0||depth>self.limits.depth{return Err("snapshot value/depth limit exceeded".into())}self.left-=1;Ok(())}
 fn take(&mut self,n:usize)->Result<&'a [u8],String>{let end=self.at.checked_add(n).ok_or("snapshot length overflow")?;let b=self.bytes.get(self.at..end).ok_or("truncated snapshot")?;self.at=end;Ok(b)}
 fn byte(&mut self)->Result<u8,String>{Ok(self.take(1)?[0])}
 fn u32(&mut self)->Result<u32,String>{Ok(u32::from_le_bytes(self.take(4)?.try_into().unwrap()))}
 fn u64(&mut self)->Result<u64,String>{Ok(u64::from_le_bytes(self.take(8)?.try_into().unwrap()))}
 fn len(&mut self)->Result<usize,String>{usize::try_from(self.u64()?).map_err(|_|"snapshot length not addressable".into())}
 fn sequence(&mut self)->Result<usize,String>{let n=self.len()?;if n>self.left{return Err("snapshot value limit exceeded".into())}Ok(n)}
 fn raw(&mut self)->Result<&'a [u8],String>{let n=self.len()?;self.take(n)}
 fn boolean(&mut self)->Result<bool,String>{match self.byte()?{0=>Ok(false),1=>Ok(true),_=>Err("invalid Bool tag".into())}}
 fn integer(&mut self)->Result<BigInt,String>{let sign=self.byte()?;let bytes=self.raw()?;if bytes.len()>portable::MAX_INT_BYTES{return Err("snapshot Int exceeds size limit".into())}let sign=match sign{0 if bytes.is_empty()=>num_bigint::Sign::NoSign,1 if !bytes.is_empty()&&bytes.last()!=Some(&0)=>num_bigint::Sign::Plus,2 if !bytes.is_empty()&&bytes.last()!=Some(&0)=>num_bigint::Sign::Minus,_=>return Err("noncanonical signed integer".into())};Ok(BigInt::from_bytes_le(sign,bytes))}
 fn finish(self)->Result<(),String>{if self.at!=self.bytes.len(){return Err("trailing snapshot payload".into())}Ok(())}
}
fn snapshot_layout()->portable::Layout{portable::Layout{program:[38, 62, 245, 37, 248, 1, 227, 248, 11, 149, 196, 218, 197, 240, 206, 169, 125, 29, 48, 173, 96, 128, 229, 253, 33, 113, 15, 106, 203, 124, 18, 79],schema:[179, 20, 57, 111, 35, 199, 119, 76, 115, 92, 208, 56, 74, 155, 171, 79, 15, 241, 109, 128, 48, 59, 176, 34, 76, 109, 244, 196, 186, 87, 115, 33],roots:vec![
],events:vec![]}}
#[derive(Clone,Debug)] pub enum EventData {
}
impl EventData {fn wire(&self)->(&'static str,Json){match *self {
}}}
enum Undo {
}
struct HostTransaction {version:u64,removed:Vec<Event>}
pub struct State {version:u64,staged:Vec<EventData>,outbox:Vec<Event>,undo:Vec<Undo>,host:Option<HostTransaction>,
}
impl Default for State {fn default()->Self{Self::new()}}
impl State {pub fn parallel_statistics()->Json{let(n,ids,last)=temporary::ink_parallel_statistics();json!({"workers":n,"workerIds":ids,"lastWorkerIds":last})} pub fn new()->Self{Self{version:0,staged:vec![],outbox:vec![],undo:vec![],host:None,
}}
pub fn begin_transaction(&mut self)->Result<bool,String>{if self.host.is_some()||!self.undo.is_empty()||!self.staged.is_empty(){return Err("transaction already in progress".into())}self.host=Some(HostTransaction{version:self.version,removed:vec![]});Ok(true)}
 pub fn commit_transaction(&mut self){self.host=None;self.undo.clear();self.clear_journal_keys();}
 pub fn rollback_transaction(&mut self){if let Some(host)=self.host.take(){self.rollback();self.version=host.version;self.outbox.retain(|e|e.commit<=host.version);let mut restored=host.removed;restored.append(&mut self.outbox);self.outbox=restored;}}
pub fn version(&self)->u64{self.version}
pub fn outbox(&self)->&[Event]{&self.outbox}
pub fn acknowledge_through(&mut self,commit:u64,position:u64){let old=std::mem::take(&mut self.outbox);for e in old{if(e.commit,e.position)>(commit,position){self.outbox.push(e)}else if let Some(host)=&mut self.host{host.removed.push(e)}}}
pub fn checkpoint(&self)->Result<Vec<u8>,String>{self.checkpoint_with_limits(SnapshotLimits::default())}
pub fn checkpoint_with_limits(&self,limits:SnapshotLimits)->Result<Vec<u8>,String>{if (self.host.is_none()&&!self.undo.is_empty())||!self.staged.is_empty(){return Err("checkpoint requires transaction boundary".into())}let layout=snapshot_layout();let mut writer=TypedSnapshotWriter::new(limits);writer.bytes(&self.version.to_le_bytes())?;writer.count(self.outbox.len())?;let mut prior=None;for event in &self.outbox{if event.commit==0||event.commit>self.version||prior.is_some_and(|p|p>=(event.commit,event.position)){return Err("invalid snapshot event sequence".into())}writer.bytes(&event.commit.to_le_bytes())?;writer.bytes(&event.position.to_le_bytes())?;match &event.data{_=>unreachable!("empty event type"),}prior=Some((event.commit,event.position));}writer.finish(&layout)}
pub fn restore(bytes:&[u8])->Result<Self,String>{Self::restore_with_limits(bytes,SnapshotLimits::default())}
pub fn restore_with_limits(bytes:&[u8],limits:SnapshotLimits)->Result<Self,String>{let layout=snapshot_layout();let mut reader=TypedSnapshotReader::new(&layout,bytes,limits)?;let mut state=Self::new();state.version=reader.u64()?;let count=reader.sequence()?;let mut prior=None;for _ in 0..count{let commit=reader.u64()?;let position=reader.u64()?;let channel=reader.u32()?;let data=match channel{_=>return Err("unknown snapshot event channel".into())};if commit==0||commit>state.version||prior.is_some_and(|p|p>=(commit,position)){return Err("invalid snapshot event sequence".into())}prior=Some((commit,position));state.outbox.push(Event{commit,position,data});}reader.finish()?;Ok(state)}
fn rollback(&mut self){self.rollback_to(0);}
fn rollback_to(&mut self,mark:usize){for undo in self.undo.drain(mark..).rev(){match undo{
}}self.clear_journal_keys();self.staged.clear();}
fn clear_journal_keys(&mut self){}
pub fn function_l_guarded(&self,l_x:u64)->u64{if ((l_x.clone()) <= (4294967295u64)) {u64::from((l_x) as u32)} else {l_x}}
pub fn function_l_relational(&self,l_x:u64,l_upper:u64)->u64{if ((((l_x.clone()) < (l_upper.clone()))) && (((l_upper) <= (4294967296u64)))) {u64::from((l_x) as u32)} else {l_x}}
pub fn function_l_wrapped(&self,l_x:u64)->u64{if (((l_x.clone()).wrapping_add(1u64)) <= (4294967295u64)) {u64::from(((l_x).wrapping_add(1u64)) as u32)} else {(l_x).wrapping_add(1u64)}}
#[cfg(target_arch="wasm32")] pub fn parallel_worker(&self,task:&Json)->Result<Json,String>{let start=task["start"].as_u64().and_then(|x|u32::try_from(x).ok()).ok_or("parallel start")?;let items=task["items"].as_array().ok_or("parallel items")?;let captures=task["captures"].as_array().ok_or("parallel captures")?;temporary::with_parallel_worker(||match task["callback"].as_str().ok_or("parallel callback")?{
_=>Err("unknown compiled parallel callback".into()),})}
pub fn call_json(&mut self,name:&str,args:&Json)->Result<Json,String>{let args=args.as_array().unwrap();match name{
"guarded"=>{let a0=<u64 as Wire>::from_json(&args[0])?;Ok(self.function_l_guarded(a0).to_json())},
"relational"=>{let a0=<u64 as Wire>::from_json(&args[0])?;let a1=<u64 as Wire>::from_json(&args[1])?;Ok(self.function_l_relational(a0,a1).to_json())},
"wrapped"=>{let a0=<u64 as Wire>::from_json(&args[0])?;Ok(self.function_l_wrapped(a0).to_json())},
_=>Err("unknown function".into())}}
pub fn invoke_json(&mut self,name:&str,args:&Json)->Result<Json,String>{let args=args.as_array().unwrap();match name{
_=>Err("unknown action".into())}}}

mod value_wire {
//! Bounded, schema-bound portable values. Networking is deliberately external.
//! The descriptor and codecs are operationally trusted, not proof certificates.
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
pub const FORMAT: &str = "ink-value-wire-v1";
pub const MAGIC: &[u8; 8] = b"INKVAL\0\x01";
// Keep these helpers self-contained: this file is also embedded verbatim in
// generated native applications without a dependency on the compiler or ABI.
pub(crate) fn f64_bits(value:&Value)->Result<u64,String>{
    if let Some(n)=value.as_f64(){
        return if n.is_finite(){Ok(n.to_bits())}else{Err("non-finite f64 needs F64Bits".into())};
    }
    let o=value.as_object().ok_or("expected finite f64 or F64Bits")?;
    if o.len()!=1{return Err("invalid F64Bits fields".into());}
    let text=o.get("F64Bits").and_then(Value::as_str).ok_or("F64Bits needs an unsigned decimal string")?;
    if text.is_empty()||text.len()>20||text.len()>1&&text.starts_with('0')||!text.bytes().all(|c|c.is_ascii_digit()){
        return Err("invalid F64Bits decimal string".into());
    }
    text.parse().map_err(|_|"F64Bits outside u64 range".into())
}
pub(crate) fn f64_raw(bits:u64)->Value{json!({"F64Bits":bits.to_string()})}
#[derive(Clone, Copy, Debug)]
pub struct Limits {
    pub bytes: usize,
    pub nodes: usize,
    pub depth: usize,
}
impl Default for Limits {
    fn default() -> Self {
        Self {
            bytes: 16 * 1024 * 1024,
            nodes: 1_000_000,
            depth: 128,
        }
    }
}
impl Limits {
    pub fn checked(self) -> Result<Self, String> {
        let max = Self::default();
        if self.bytes > max.bytes || self.nodes > max.nodes || self.depth > max.depth {
            return Err("wire hard resource limit".into());
        }
        Ok(self)
    }
}
#[derive(Clone, Debug)]
pub struct Schema {
    root: Value,
    named: BTreeMap<String, Value>,
    identity: [u8; 32],
}
impl Schema {
    pub fn new(root: Value, named: BTreeMap<String, Value>) -> Result<Self, String> {
        fn check(
            t: &Value,
            named: &BTreeMap<String, Value>,
            used: &mut BTreeSet<String>,
            depth: usize,
            budget: &mut usize,
        ) -> Result<(), String> {
            if depth > 64 || *budget == 0 {
                return Err("wire descriptor limit".into());
            }
            *budget -= 1;
            let obj = t.as_object().ok_or("invalid wire descriptor")?;
            let kind = t["kind"].as_str().ok_or("missing wire kind")?;
            let keys: &[&str] = match kind {
                "u32" | "u64" | "i32" | "f32" | "f64" | "bool" | "unit" | "string" | "int" => &["kind"],
                "id" | "ref" => &["kind", "name"],
                "enum" => &["kind", "name", "variants"],
                "record" => &["kind", "name", "fields"],
                "list" | "option" => &["kind", "element"],
                "vector" => &["kind", "element", "size"],
                "result" => &["kind", "ok", "error"],
                _ => return Err("unsupported wire descriptor".into()),
            };
            if obj.len() != keys.len() || keys.iter().any(|k| !obj.contains_key(*k)) {
                return Err("invalid wire descriptor fields".into());
            }
            match kind {
                "id" | "ref" | "enum" | "record" => {
                    t["name"].as_str().ok_or("missing descriptor name")?;
                }
                _ => {}
            }
            match kind {
                "ref" => {
                    let n = t["name"].as_str().unwrap();
                    if used.insert(n.into()) {
                        let d = named.get(n).ok_or("unresolved wire reference")?;
                        if d["kind"] != "record" || d["name"] != n {
                            return Err("invalid named wire reference".into());
                        }
                        check(d, named, used, depth + 1, budget)?;
                    }
                }
                "record" => {
                    let mut seen = BTreeSet::new();
                    for f in t["fields"].as_array().ok_or("missing descriptor fields")? {
                        if f.as_object().is_none_or(|o| o.len() != 2)
                            || !seen.insert(f["name"].as_str().ok_or("invalid field name")?)
                        {
                            return Err("invalid or duplicate wire field".into());
                        }
                        check(&f["type"], named, used, depth + 1, budget)?;
                    }
                }
                "enum" => {
                    let variants = t["variants"].as_array().ok_or("missing variants")?;
                    let mut seen = BTreeSet::new();
                    if variants.is_empty() || variants.len() > 64 {
                        return Err("wire enum limit".into());
                    }
                    for v in variants {
                        if !seen.insert(v.as_str().ok_or("invalid variant")?) {
                            return Err("duplicate variant".into());
                        }
                    }
                }
                "vector" => {
                    if t["size"].as_u64().is_none_or(|n| n == 0 || n > 64) {
                        return Err("invalid vector size".into());
                    }
                    check(&t["element"], named, used, depth + 1, budget)?;
                }
                "list" | "option" => check(&t["element"], named, used, depth + 1, budget)?,
                "result" => {
                    check(&t["ok"], named, used, depth + 1, budget)?;
                    check(&t["error"], named, used, depth + 1, budget)?;
                }
                _ => {}
            }
            Ok(())
        }
        let mut used = BTreeSet::new();
        check(&root, &named, &mut used, 0, &mut 100_000)?;
        let named = named
            .into_iter()
            .filter(|(k, _)| used.contains(k))
            .collect::<BTreeMap<_, _>>();
        let identity = Sha256::digest(
            serde_json::to_vec(&json!({"format":FORMAT,"root":root,"named":named}))
                .map_err(|e| e.to_string())?,
        )
        .into();
        Ok(Self {
            root,
            named,
            identity,
        })
    }
    pub fn root(&self) -> &Value {
        &self.root
    }
    pub fn named(&self) -> &BTreeMap<String, Value> {
        &self.named
    }
    pub fn identity(&self) -> String {
        self.identity.iter().map(|b| format!("{b:02x}")).collect()
    }
    pub fn descriptor(&self) -> Value {
        json!({"format":FORMAT,"root":self.root,"named":self.named,"identity":self.identity()})
    }
    pub fn from_descriptor(v: &Value) -> Result<Self, String> {
        if v["format"] != FORMAT || v.as_object().is_none_or(|o| o.len() != 4) {
            return Err("invalid wire schema envelope".into());
        }
        let s = Self::new(
            v["root"].clone(),
            serde_json::from_value(v["named"].clone()).map_err(|e| e.to_string())?,
        )?;
        if v["identity"] != s.identity() {
            return Err("wire schema identity mismatch".into());
        }
        Ok(s)
    }
    pub(crate) fn resolve<'a>(&'a self, mut t: &'a Value) -> Result<&'a Value, String> {
        for _ in 0..64 {
            if t["kind"] != "ref" {
                return Ok(t);
            }
            t = self
                .named
                .get(t["name"].as_str().ok_or("wire reference name")?)
                .ok_or("wire reference")?;
        }
        Err("wire reference cycle".into())
    }
    pub fn encode(&self, value: &Value, limits: Limits) -> Result<Vec<u8>, String> {
        let limits = limits.checked()?;
        if limits.bytes < 44 {
            return Err("wire byte limit".into());
        }
        let mut out = Vec::new();
        out.extend(MAGIC);
        out.extend(self.identity);
        encode(
            self,
            &self.root,
            value,
            &mut out,
            &mut limits.nodes.clone(),
            0,
            limits,
        )?;
        // Encoding validation is also a check on public numeric/string carriers.
        self.validate(&out, limits)?;
        Ok(out)
    }
    pub fn validate<'a>(
        &'a self,
        bytes: &'a [u8],
        limits: Limits,
    ) -> Result<Validated<'a>, String> {
        let limits = limits.checked()?;
        if bytes.len() > limits.bytes || bytes.len() < 44 {
            return Err("wire byte limit or truncated header".into());
        }
        if &bytes[..8] != MAGIC || bytes[8..40] != self.identity {
            return Err("wire format or schema mismatch".into());
        }
        let mut pos = 40;
        walk(
            self,
            &self.root,
            bytes,
            &mut pos,
            &mut limits.nodes.clone(),
            0,
            limits,
            false,
        )?;
        if pos != bytes.len() {
            return Err("trailing wire bytes".into());
        }
        Ok(Validated {
            schema: self,
            ty: &self.root,
            bytes: &bytes[40..],
            limits,
        })
    }
    pub fn decode(&self, bytes: &[u8], limits: Limits) -> Result<Value, String> {
        self.validate(bytes, limits)?.materialize()
    }
    /// Emit frames directly from a native value or a streaming input adapter.
    /// Final validation binds the emitted shape to this exact schema.
    pub fn encode_with(
        &self,
        limits: Limits,
        emit: impl FnOnce(&mut Encoder) -> Result<(), String>,
    ) -> Result<Vec<u8>, String> {
        let mut writer = Encoder::new(limits)?;
        writer.bytes(MAGIC)?;
        writer.bytes(&self.identity)?;
        emit(&mut writer)?;
        self.validate(&writer.out, limits)?;
        Ok(writer.out)
    }
}

/// Bounded forward frame writer, shared by native and streaming codecs.
/// It carries resource accounting; only Schema::encode_with authenticates types.
pub struct Encoder {
    out: Vec<u8>,
    limits: Limits,
    remaining: usize,
    depth: usize,
}
impl Encoder {
    fn new(limits: Limits) -> Result<Self, String> {
        let limits = limits.checked()?;
        Ok(Self {
            out: Vec::new(),
            remaining: limits.nodes,
            depth: 0,
            limits,
        })
    }
    pub fn position(&self) -> usize {
        self.out.len()
    }
    pub fn bytes(&mut self, bytes: &[u8]) -> Result<(), String> {
        if bytes.len() > self.limits.bytes.saturating_sub(self.out.len()) {
            return Err("wire byte limit".into());
        }
        self.out.extend_from_slice(bytes);
        Ok(())
    }
    pub fn word(&mut self, value: u32) -> Result<(), String> {
        self.bytes(&value.to_le_bytes())
    }
    pub fn patch_word(&mut self, at: usize, value: u32) -> Result<(), String> {
        let end = at.checked_add(4).ok_or("wire offset overflow")?;
        self.out
            .get_mut(at..end)
            .ok_or("wire patch offset")?
            .copy_from_slice(&value.to_le_bytes());
        Ok(())
    }
    pub fn frame(
        &mut self,
        emit: impl FnOnce(&mut Self) -> Result<(), String>,
    ) -> Result<(), String> {
        count(&mut self.remaining, self.depth, self.limits)?;
        let at = self.position();
        self.word(0)?;
        self.depth += 1;
        let result = emit(self);
        self.depth -= 1;
        result?;
        let length = u32::try_from(self.position() - at - 4).map_err(|_| "wire frame overflow")?;
        self.patch_word(at, length)
    }
    /// Reorder a contiguous suffix using a checked permutation of its spans.
    /// Already ordered fields incur no copy. This supports unordered text records.
    pub fn reorder(&mut self, start: usize, spans: &[(usize, usize)]) -> Result<(), String> {
        let mut sorted = spans.to_vec();
        sorted.sort_unstable();
        let mut at = start;
        for &(a, b) in &sorted {
            if a != at || b < a {
                return Err("wire span permutation".into());
            }
            at = b;
        }
        if start > self.out.len() || at != self.out.len() {
            return Err("wire span permutation".into());
        }
        if sorted == spans {
            return Ok(());
        }
        let mut ordered = Vec::with_capacity(self.out.len() - start);
        for &(a, b) in spans {
            ordered.extend_from_slice(self.out.get(a..b).ok_or("wire span offset")?);
        }
        self.out[start..].copy_from_slice(&ordered);
        Ok(())
    }
}
fn count(budget: &mut usize, depth: usize, limits: Limits) -> Result<(), String> {
    if *budget == 0 || depth > limits.depth {
        return Err("wire node or depth limit".into());
    }
    *budget -= 1;
    Ok(())
}
fn decimal(s: &str) -> bool {
    let b = s.strip_prefix('-').unwrap_or(s);
    !b.is_empty()
        && b.bytes().all(|b| b.is_ascii_digit())
        && (b == "0" || !b.starts_with('0'))
        && s != "-0"
}
fn tag<'a>(v: &'a Value, n: &str) -> Result<&'a Value, String> {
    if v.as_object().is_some_and(|o| o.len() == 1) {
        v.get(n).ok_or("invalid wire value tag".into())
    } else {
        Err("invalid wire value tag".into())
    }
}
fn encode(
    s: &Schema,
    t: &Value,
    v: &Value,
    out: &mut Vec<u8>,
    budget: &mut usize,
    d: usize,
    limits: Limits,
) -> Result<(), String> {
    count(budget, d, limits)?;
    let t = s.resolve(t)?;
    let at = out.len();
    out.extend([0; 4]);
    let error = || "invalid value for wire schema".to_string();
    match t["kind"].as_str().ok_or_else(error)? {
        "unit" => {
            if !v.is_null() {
                return Err(error());
            }
        }
        "bool" => out.push(u8::from(v.as_bool().ok_or_else(error)?)),
        "u32" => out.extend(
            u32::try_from(v.as_u64().ok_or_else(error)?)
                .map_err(|_| error())?
                .to_le_bytes(),
        ),
        "i32" => out.extend(
            i32::try_from(v.as_i64().ok_or_else(error)?)
                .map_err(|_| error())?
                .to_le_bytes(),
        ),
        "u64" => {
            let n = if let Some(n) = v.as_u64() {
                n
            } else {
                let text = v.as_str().ok_or_else(error)?;
                if !decimal(text) || text.starts_with('-') {
                    return Err(error());
                }
                text.parse::<u64>().map_err(|_| error())?
            };
            out.extend(n.to_le_bytes());
        }
        "f64" => out.extend(f64_bits(v)?.to_le_bytes()),
        "f32" => {
            let bits = if let Some(n) = v.as_f64() {
                let f = n as f32;
                if !f.is_finite() {
                    return Err(error());
                }
                f.to_bits()
            } else {
                u32::try_from(tag(v, "F32Bits")?.as_u64().ok_or_else(error)?)
                    .map_err(|_| error())?
            };
            out.extend(bits.to_le_bytes());
        }
        "string" | "int" | "id" | "enum" => {
            let text = if t["kind"] == "int" {
                tag(v, "Int")?.as_str().ok_or_else(error)?
            } else {
                v.as_str().ok_or_else(error)?
            };
            if text.len() > limits.bytes.saturating_sub(out.len()) {
                return Err("wire byte limit".into());
            }
            if t["kind"] == "int" && !decimal(text) {
                return Err(error());
            }
            if t["kind"] == "enum" && !t["variants"].as_array().unwrap().contains(v) {
                return Err(error());
            }
            if t["kind"] == "id"
                && (text.len() != 32
                    || !text
                        .bytes()
                        .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase()))
            {
                return Err(error());
            }
            out.extend(text.as_bytes());
        }
        "list" | "vector" => {
            let xs = v.as_array().ok_or_else(error)?;
            if xs.len() > *budget
                || t["kind"] == "vector" && Some(xs.len() as u64) != t["size"].as_u64()
            {
                return Err(error());
            }
            out.extend(u32::try_from(xs.len()).map_err(|_| error())?.to_le_bytes());
            for x in xs {
                encode(s, &t["element"], x, out, budget, d + 1, limits)?;
            }
        }
        "record" => {
            let o = v.as_object().ok_or_else(error)?;
            let fs = t["fields"].as_array().unwrap();
            if o.len() != fs.len() {
                return Err(error());
            }
            for f in fs {
                encode(
                    s,
                    &f["type"],
                    o.get(f["name"].as_str().unwrap()).ok_or_else(error)?,
                    out,
                    budget,
                    d + 1,
                    limits,
                )?;
            }
        }
        "option" => {
            if let Ok(x) = tag(v, "Some") {
                out.push(1);
                encode(s, &t["element"], x, out, budget, d + 1, limits)?;
            } else {
                if !tag(v, "None")?.is_null() {
                    return Err(error());
                }
                out.push(0);
            }
        }
        "result" => {
            if let Ok(x) = tag(v, "Ok") {
                out.push(0);
                encode(s, &t["ok"], x, out, budget, d + 1, limits)?;
            } else {
                out.push(1);
                encode(s, &t["error"], tag(v, "Err")?, out, budget, d + 1, limits)?;
            }
        }
        _ => return Err(error()),
    }
    if out.len() > limits.bytes {
        return Err("wire byte limit".into());
    }
    let len = u32::try_from(out.len() - at - 4).map_err(|_| "wire frame overflow")?;
    out[at..at + 4].copy_from_slice(&len.to_le_bytes());
    Ok(())
}
fn u32_at(bytes: &[u8], pos: usize) -> Result<u32, String> {
    Ok(u32::from_le_bytes(
        bytes
            .get(pos..pos.checked_add(4).ok_or("wire offset overflow")?)
            .ok_or("truncated wire length")?
            .try_into()
            .unwrap(),
    ))
}
fn frame(bytes: &[u8], pos: usize) -> Result<(usize, usize), String> {
    let start = pos.checked_add(4).ok_or("wire offset overflow")?;
    let end = start
        .checked_add(u32_at(bytes, pos)? as usize)
        .ok_or("wire length overflow")?;
    if end > bytes.len() {
        return Err("truncated wire frame".into());
    }
    Ok((start, end))
}
fn walk(
    s: &Schema,
    t: &Value,
    bytes: &[u8],
    pos: &mut usize,
    budget: &mut usize,
    d: usize,
    limits: Limits,
    materialize: bool,
) -> Result<Option<Value>, String> {
    count(budget, d, limits)?;
    let t = s.resolve(t)?;
    let (start, end) = frame(bytes, *pos)?;
    *pos = end;
    let body = &bytes[start..end];
    let mut p = 0;
    let error = || "malformed wire value".to_string();
    let value = match t["kind"].as_str().ok_or_else(error)? {
        "unit" => {
            if !body.is_empty() {
                return Err(error());
            }
            Value::Null
        }
        "bool" => {
            if body.len() != 1 || body[0] > 1 {
                return Err(error());
            }
            Value::Bool(body[0] == 1)
        }
        "u32" | "i32" | "f32" => {
            if body.len() != 4 {
                return Err(error());
            }
            let bits = u32_at(body, 0)?;
            match t["kind"].as_str().unwrap() {
                "u32" => json!(bits),
                "i32" => json!(bits as i32),
                _ => {
                    if materialize {
                        json!({"F32Bits":bits})
                    } else {
                        Value::Null
                    }
                }
            }
        }
        "f64" => {
            if body.len()!=8{return Err(error());}
            if materialize{f64_raw(u64::from_le_bytes(body.try_into().unwrap()))}else{Value::Null}
        }
        "u64" => {
            if body.len() != 8 {
                return Err(error());
            }
            json!(u64::from_le_bytes(body.try_into().unwrap()))
        }
        "string" | "int" | "id" | "enum" => {
            let text = std::str::from_utf8(body).map_err(|_| error())?;
            if t["kind"] == "int" && !decimal(text)
                || t["kind"] == "enum"
                    && !t["variants"]
                        .as_array()
                        .unwrap()
                        .iter()
                        .any(|v| v.as_str() == Some(text))
                || t["kind"] == "id"
                    && (text.len() != 32
                        || !text
                            .bytes()
                            .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase()))
            {
                return Err(error());
            }
            if materialize {
                if t["kind"] == "int" {
                    json!({"Int":text})
                } else {
                    json!(text)
                }
            } else {
                Value::Null
            }
        }
        "list" | "vector" => {
            let n = u32_at(body, 0)? as usize;
            p = 4;
            if n > *budget
                || n > body.len().saturating_sub(4) / 4
                || t["kind"] == "vector" && Some(n as u64) != t["size"].as_u64()
            {
                return Err(error());
            }
            let mut xs = vec![];
            for _ in 0..n {
                if let Some(x) = walk(
                    s,
                    &t["element"],
                    body,
                    &mut p,
                    budget,
                    d + 1,
                    limits,
                    materialize,
                )? {
                    xs.push(x);
                }
            }
            if p != body.len() {
                return Err(error());
            }
            Value::Array(xs)
        }
        "record" => {
            let mut fields = serde_json::Map::new();
            for f in t["fields"].as_array().unwrap() {
                if let Some(x) = walk(
                    s,
                    &f["type"],
                    body,
                    &mut p,
                    budget,
                    d + 1,
                    limits,
                    materialize,
                )? {
                    fields.insert(f["name"].as_str().unwrap().into(), x);
                }
            }
            if p != body.len() {
                return Err(error());
            }
            Value::Object(fields)
        }
        "option" | "result" => {
            let b = *body.first().ok_or_else(error)?;
            if b > 1 {
                return Err(error());
            }
            p = 1;
            if t["kind"] == "option" && b == 0 {
                if body.len() != 1 {
                    return Err(error());
                }
                if materialize {
                    json!({"None":null})
                } else {
                    Value::Null
                }
            } else {
                let (tag, child) = if t["kind"] == "option" {
                    ("Some", &t["element"])
                } else if b == 0 {
                    ("Ok", &t["ok"])
                } else {
                    ("Err", &t["error"])
                };
                let x = walk(s, child, body, &mut p, budget, d + 1, limits, materialize)?;
                if p != body.len() {
                    return Err(error());
                }
                if let Some(x) = x {
                    json!({tag:x})
                } else {
                    Value::Null
                }
            }
        }
        _ => return Err(error()),
    };
    Ok(materialize.then_some(value))
}
/// Borrowed access to already structurally validated bytes. Rust borrowing
/// prevents mutation while this validation witness exists. No JSON tree is built.
#[derive(Clone, Copy)]
pub struct Validated<'a> {
    schema: &'a Schema,
    ty: &'a Value,
    bytes: &'a [u8],
    limits: Limits,
}
impl<'a> Validated<'a> {
    pub fn descriptor(&self) -> Result<&'a Value, String> {
        self.schema.resolve(self.ty)
    }
    pub fn limits(&self) -> Limits {
        self.limits
    }
    pub fn kind(&self) -> Result<&'a str, String> {
        self.schema.resolve(self.ty)?["kind"]
            .as_str()
            .ok_or("wire kind".into())
    }
    pub fn require_kind(&self, kind: &str) -> Result<(), String> {
        if self.kind()? == kind {
            Ok(())
        } else {
            Err("wire native type mismatch".into())
        }
    }
    pub fn require_name(&self, name: &str) -> Result<(), String> {
        if self.schema.resolve(self.ty)?["name"] == name {
            Ok(())
        } else {
            Err("wire nominal type mismatch".into())
        }
    }
    /// Scalar bytes or a container body; safe to borrow for the witness lifetime.
    pub fn body(&self) -> Result<&'a [u8], String> {
        let (a, b) = frame(self.bytes, 0)?;
        Ok(&self.bytes[a..b])
    }
    pub fn fields(&self) -> Result<Fields<'a>, String> {
        self.require_kind("record")?;
        let t = self.schema.resolve(self.ty)?;
        Ok(Fields {
            parent: *self,
            fields: t["fields"].as_array().unwrap().iter(),
            body: self.body()?,
            position: 0,
        })
    }
    pub fn payload(&self) -> &'a [u8] {
        self.bytes
    }
    pub fn materialize(&self) -> Result<Value, String> {
        let mut p = 0;
        walk(
            self.schema,
            self.ty,
            self.bytes,
            &mut p,
            &mut self.limits.nodes.clone(),
            0,
            self.limits,
            true,
        )?
        .ok_or("wire decode".into())
    }
    pub fn field(&self, name: &str) -> Result<Option<Self>, String> {
        let t = self.schema.resolve(self.ty)?;
        if t["kind"] != "record" {
            return Err("wire view is not a record".into());
        }
        let (start, end) = frame(self.bytes, 0)?;
        let body = &self.bytes[start..end];
        let mut p = 0;
        for f in t["fields"].as_array().unwrap() {
            let (_, next) = frame(body, p)?;
            if f["name"] == name {
                return Ok(Some(Self {
                    schema: self.schema,
                    ty: &f["type"],
                    bytes: &body[p..next],
                    limits: self.limits,
                }));
            }
            p = next;
        }
        Ok(None)
    }
    pub fn at(&self, index: usize) -> Result<Option<Self>, String> {
        let t = self.schema.resolve(self.ty)?;
        if t["kind"] != "list" && t["kind"] != "vector" {
            return Err("wire view is not a sequence".into());
        }
        let (start, end) = frame(self.bytes, 0)?;
        let body = &self.bytes[start..end];
        let n = u32_at(body, 0)? as usize;
        if index >= n {
            return Ok(None);
        }
        let mut p = 4;
        for i in 0..n {
            let (_, next) = frame(body, p)?;
            if i == index {
                return Ok(Some(Self {
                    schema: self.schema,
                    ty: &t["element"],
                    bytes: &body[p..next],
                    limits: self.limits,
                }));
            }
            p = next;
        }
        Ok(None)
    }
}

impl<'a> Validated<'a> {
    pub fn text(&self) -> Result<&'a str, String> {
        let t = self.schema.resolve(self.ty)?;
        if !["string", "int", "id", "enum"].contains(&t["kind"].as_str().unwrap_or("")) {
            return Err("wire view is not text".into());
        }
        let (a, b) = frame(self.bytes, 0)?;
        std::str::from_utf8(&self.bytes[a..b]).map_err(|e| e.to_string())
    }
    pub fn len(&self) -> Result<usize, String> {
        let t = self.schema.resolve(self.ty)?;
        if t["kind"] != "list" && t["kind"] != "vector" {
            return Err("wire view is not a sequence".into());
        }
        let (a, _) = frame(self.bytes, 0)?;
        Ok(u32_at(self.bytes, a)? as usize)
    }
    pub fn is_empty(&self) -> Result<bool, String> {
        Ok(self.len()? == 0)
    }
    pub fn variant(&self) -> Result<(bool, Option<Self>), String> {
        let t = self.schema.resolve(self.ty)?;
        if t["kind"] != "option" && t["kind"] != "result" {
            return Err("wire view is not a sum".into());
        }
        let (a, b) = frame(self.bytes, 0)?;
        let tag = self.bytes[a] == 1;
        if t["kind"] == "option" && !tag {
            return Ok((false, None));
        }
        let ty = if t["kind"] == "option" {
            &t["element"]
        } else if tag {
            &t["error"]
        } else {
            &t["ok"]
        };
        Ok((
            tag,
            Some(Self {
                schema: self.schema,
                ty,
                bytes: &self.bytes[a + 1..b],
                limits: self.limits,
            }),
        ))
    }
}

/// A single forward traversal over a validated sequence, without repeated scans.
pub struct Items<'a> {
    schema: &'a Schema,
    ty: &'a Value,
    body: &'a [u8],
    position: usize,
    left: usize,
    limits: Limits,
}
impl<'a> Iterator for Items<'a> {
    type Item = Result<Validated<'a>, String>;
    fn next(&mut self) -> Option<Self::Item> {
        if self.left == 0 {
            return None;
        }
        self.left -= 1;
        let at = self.position;
        Some(frame(self.body, at).map(|(_, end)| {
            self.position = end;
            Validated {
                schema: self.schema,
                ty: self.ty,
                bytes: &self.body[at..end],
                limits: self.limits,
            }
        }))
    }
}
impl<'a> Validated<'a> {
    pub fn items(&self) -> Result<Items<'a>, String> {
        let t = self.schema.resolve(self.ty)?;
        if t["kind"] != "list" && t["kind"] != "vector" {
            return Err("wire view is not a sequence".into());
        }
        let (a, b) = frame(self.bytes, 0)?;
        let body = &self.bytes[a..b];
        Ok(Items {
            schema: self.schema,
            ty: &t["element"],
            body,
            position: 4,
            left: u32_at(body, 0)? as usize,
            limits: self.limits,
        })
    }
}

/// Declaration-order record traversal without repeated name scans.
pub struct Fields<'a> {
    parent: Validated<'a>,
    fields: std::slice::Iter<'a, Value>,
    body: &'a [u8],
    position: usize,
}
impl<'a> Iterator for Fields<'a> {
    type Item = Result<Validated<'a>, String>;
    fn next(&mut self) -> Option<Self::Item> {
        let f = self.fields.next()?;
        let at = self.position;
        Some(frame(self.body, at).map(|(_, end)| {
            self.position = end;
            Validated {
                schema: self.parent.schema,
                ty: &f["type"],
                bytes: &self.body[at..end],
                limits: self.parent.limits,
            }
        }))
    }
}

/// Optional O(1) sequence access. Construction is a single scan; offsets are u32
/// because the authenticated wire is bounded to 16 MiB. The witness borrows it.
pub struct SequenceIndex<'a> {
    parent: Validated<'a>,
    offsets: Vec<u32>,
}
impl<'a> SequenceIndex<'a> {
    pub fn len(&self) -> usize {
        self.offsets.len()
    }
    pub fn is_empty(&self) -> bool {
        self.offsets.is_empty()
    }
    pub fn retained_bytes(&self) -> usize {
        self.offsets.capacity() * std::mem::size_of::<u32>()
    }
    pub fn at(&self, index: usize) -> Result<Option<Validated<'a>>, String> {
        let Some(&at) = self.offsets.get(index) else {
            return Ok(None);
        };
        let t = self.parent.schema.resolve(self.parent.ty)?;
        let body = self.parent.body()?;
        let (_, end) = frame(body, at as usize)?;
        Ok(Some(Validated {
            schema: self.parent.schema,
            ty: &t["element"],
            bytes: &body[at as usize..end],
            limits: self.parent.limits,
        }))
    }
}
impl<'a> Validated<'a> {
    pub fn index(&self) -> Result<SequenceIndex<'a>, String> {
        let items = self.items()?;
        let mut offsets = Vec::with_capacity(items.left);
        let mut at = 4usize;
        for item in items {
            let item = item?;
            offsets.push(u32::try_from(at).map_err(|_| "wire index offset")?);
            at += item.bytes.len();
        }
        Ok(SequenceIndex {
            parent: *self,
            offsets,
        })
    }
}

}
pub use value_wire::Limits as ValueWireLimits;
// Generic pure-call binary boundary. Types and schema identities are emitted
// from the complete checked source. This adapter does no networking.
impl State {
 fn binary_schema_map()->&'static std::collections::BTreeMap<String,(value_wire::Schema,value_wire::Schema)>{
  static SCHEMAS:std::sync::OnceLock<std::collections::BTreeMap<String,(value_wire::Schema,value_wire::Schema)>>=std::sync::OnceLock::new();
  SCHEMAS.get_or_init(||{
   let manifest:Json=serde_json::from_str(INK_WIRE_CONTRACT).expect("compiled wire metadata");
   manifest["functions"].as_object().expect("compiled functions").iter().filter(|(_,v)|v.get("unsupported").is_none()).map(|(name,v)|{
    (name.clone(),(value_wire::Schema::from_descriptor(&v["arguments"]).expect("compiled argument schema"),value_wire::Schema::from_descriptor(&v["result"]).expect("compiled result schema")))
   }).collect()
  })
 }
 pub fn binary_schemas(name:&str)->Result<&'static (value_wire::Schema,value_wire::Schema),String>{Self::binary_schema_map().get(name).ok_or("unsupported binary function".into())}
 pub fn binary_function(index:u32)->Result<&'static str,String>{Self::binary_schema_map().keys().nth(index as usize).map(String::as_str).ok_or("unknown binary function index".into())}

 pub fn validate_binary_arguments<'a>(name:&str,bytes:&'a[u8],limits:ValueWireLimits)->Result<value_wire::Validated<'a>,String>{Self::binary_schemas(name)?.0.validate(bytes,limits)}
 pub fn call_binary(&mut self,name:&str,bytes:&[u8],limits:ValueWireLimits)->Result<Vec<u8>,String>{
  let (input,output)=Self::binary_schemas(name)?;
  let record=input.validate(bytes,limits)?;
  self.binary_call_frame(name,record,output,limits)
 }
}
// Generic direct native values: no serde_json document/carrier on this path.
pub trait BinaryValue: Sized {
 fn from_binary(v:value_wire::Validated<'_>)->Result<Self,String>;
 fn write_binary(&self,w:&mut value_wire::Encoder)->Result<(),String>;
}
macro_rules! binary_word {
 ($t:ty,$kind:literal) => {impl BinaryValue for $t{
  fn from_binary(v:value_wire::Validated<'_>)->Result<Self,String>{v.require_kind($kind)?;Ok(Self::from_le_bytes(v.body()?.try_into().map_err(|_|"wire scalar width")?))}
  fn write_binary(&self,w:&mut value_wire::Encoder)->Result<(),String>{w.frame(|w|w.bytes(&self.to_le_bytes()))}
 }};
}
binary_word!(u32,"u32");binary_word!(u64,"u64");binary_word!(i32,"i32");binary_word!(f32,"f32");binary_word!(f64,"f64");
impl BinaryValue for (){
 fn from_binary(v:value_wire::Validated<'_>)->Result<Self,String>{v.require_kind("unit")?;Ok(())}
 fn write_binary(&self,w:&mut value_wire::Encoder)->Result<(),String>{w.frame(|_|Ok(()))}
}
impl BinaryValue for bool{
 fn from_binary(v:value_wire::Validated<'_>)->Result<Self,String>{v.require_kind("bool")?;Ok(v.body()?[0]!=0)}
 fn write_binary(&self,w:&mut value_wire::Encoder)->Result<(),String>{w.frame(|w|w.bytes(&[u8::from(*self)]))}
}
impl BinaryValue for String{
 fn from_binary(v:value_wire::Validated<'_>)->Result<Self,String>{v.require_kind("string")?;Ok(v.text()?.to_owned())}
 fn write_binary(&self,w:&mut value_wire::Encoder)->Result<(),String>{w.frame(|w|w.bytes(self.as_bytes()))}
}
impl BinaryValue for BigInt{
 fn from_binary(v:value_wire::Validated<'_>)->Result<Self,String>{v.require_kind("int")?;v.text()?.parse().map_err(|_|"invalid binary Int".into())}
 fn write_binary(&self,w:&mut value_wire::Encoder)->Result<(),String>{w.frame(|w|w.bytes(self.to_string().as_bytes()))}
}
impl<T:BinaryValue> BinaryValue for Vec<T>{
 fn from_binary(v:value_wire::Validated<'_>)->Result<Self,String>{v.require_kind("list")?;v.items()?.map(|x|T::from_binary(x?)).collect()}
 fn write_binary(&self,w:&mut value_wire::Encoder)->Result<(),String>{w.frame(|w|{w.word(self.len().try_into().map_err(|_|"wire sequence size")?)?;for x in self{x.write_binary(w)?;}Ok(())})}
}
impl<T:BinaryValue,const N:usize> BinaryValue for [T;N]{
 fn from_binary(v:value_wire::Validated<'_>)->Result<Self,String>{v.require_kind("vector")?;v.items()?.map(|x|T::from_binary(x?)).collect::<Result<Vec<_>,_>>()?.try_into().map_err(|_|"wire vector size".into())}
 fn write_binary(&self,w:&mut value_wire::Encoder)->Result<(),String>{w.frame(|w|{w.word(N.try_into().map_err(|_|"wire vector size")?)?;for x in self{x.write_binary(w)?;}Ok(())})}
}
impl<T:BinaryValue> BinaryValue for Box<T>{
 fn from_binary(v:value_wire::Validated<'_>)->Result<Self,String>{T::from_binary(v).map(Box::new)}
 fn write_binary(&self,w:&mut value_wire::Encoder)->Result<(),String>{(**self).write_binary(w)}
}
impl<T:BinaryValue> BinaryValue for Option<T>{
 fn from_binary(v:value_wire::Validated<'_>)->Result<Self,String>{v.require_kind("option")?;let (_,child)=v.variant()?;child.map(T::from_binary).transpose()}
 fn write_binary(&self,w:&mut value_wire::Encoder)->Result<(),String>{w.frame(|w|match self{None=>w.bytes(&[0]),Some(x)=>{w.bytes(&[1])?;x.write_binary(w)}})}
}
impl<T:BinaryValue,E:BinaryValue> BinaryValue for Result<T,E>{
 fn from_binary(v:value_wire::Validated<'_>)->Result<Self,String>{v.require_kind("result")?;let (err,child)=v.variant()?;let child=child.ok_or("wire Result payload")?;if err{E::from_binary(child).map(Err)}else{T::from_binary(child).map(Ok)}}
 fn write_binary(&self,w:&mut value_wire::Encoder)->Result<(),String>{w.frame(|w|match self{Ok(x)=>{w.bytes(&[0])?;x.write_binary(w)},Err(x)=>{w.bytes(&[1])?;x.write_binary(w)}})}
}
impl BinaryValue for InkArithmeticError{
 fn from_binary(v:value_wire::Validated<'_>)->Result<Self,String>{v.require_kind("enum")?;v.require_name("ArithmeticError")?;if v.text()?=="ArithmeticError.Overflow"{Ok(Self::Overflow)}else{Err("wire arithmetic error".into())}}
 fn write_binary(&self,w:&mut value_wire::Encoder)->Result<(),String>{w.frame(|w|w.bytes(b"ArithmeticError.Overflow"))}
}
impl State{fn binary_call_frame(&mut self,name:&str,record:value_wire::Validated<'_>,output:&value_wire::Schema,limits:ValueWireLimits)->Result<Vec<u8>,String>{match name{
"guarded"=>{let mut fields=record.fields()?;
let a0=<u64 as BinaryValue>::from_binary(fields.next().ok_or("wire argument")??)?;
let result=self.function_l_guarded(a0);output.encode_with(limits,|w|result.write_binary(w))},
"relational"=>{let mut fields=record.fields()?;
let a0=<u64 as BinaryValue>::from_binary(fields.next().ok_or("wire argument")??)?;
let a1=<u64 as BinaryValue>::from_binary(fields.next().ok_or("wire argument")??)?;
let result=self.function_l_relational(a0,a1);output.encode_with(limits,|w|result.write_binary(w))},
"wrapped"=>{let mut fields=record.fields()?;
let a0=<u64 as BinaryValue>::from_binary(fields.next().ok_or("wire argument")??)?;
let result=self.function_l_wrapped(a0);output.encode_with(limits,|w|result.write_binary(w))},
_=>Err("unsupported binary function".into())}}}
