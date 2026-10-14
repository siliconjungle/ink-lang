use std::{hint::black_box,time::Instant};
unsafe extern "C" { fn ink_box2d_pairs(boxes:*const f32,count:u32,out:*mut *mut u64)->usize;fn ink_box2d_free(out:*mut u64); }
enum Output {Ink(Vec<Pair>),Rust(Vec<(u32,u32)>),Box2d{data:*mut u64,len:usize}}
impl Output {
 fn keys(&self)->Vec<(u32,u32)>{match self{
  Self::Ink(xs)=>xs.iter().map(|p|(p.l_a,p.l_b)).collect(),Self::Rust(xs)=>xs.clone(),
  Self::Box2d{data,len}=>{if *len==0{return vec![];}unsafe{std::slice::from_raw_parts(*data,*len)}.iter().map(|p|((p>>32)as u32,*p as u32)).collect()}
 }}
}
impl Drop for Output {fn drop(&mut self){if let Self::Box2d{data,..}=self{unsafe{ink_box2d_free(*data)}}}}
fn valid(b:&[f32;4])->bool{b.iter().all(|x|x.is_finite())&&b[0]<=b[2]&&b[1]<=b[3]}
fn overlaps(a:&[f32;4],b:&[f32;4])->bool{a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1]}
fn oracle(xs:&[[f32;4]])->Vec<(u32,u32)>{let mut out=vec![];for(i,a)in xs.iter().enumerate(){for(j,b)in xs.iter().enumerate().skip(i+1){if valid(a)&&valid(b)&&overlaps(a,b){out.push((i as u32,j as u32));}}}out}
fn key(x:f32)->u32{let b=x.to_bits();if b&0x80000000==0{b^0x80000000}else{!b}}
fn radix(keys:&[u32],mut order:Vec<u32>)->Vec<u32>{
 for shift in [0,8,16,24]{let mut counts=[0u32;256];for &id in &order{counts[((keys[id as usize]>>shift)&255)as usize]+=1;}
  let mut offsets=[0u32;256];let mut sum=0u32;for(i,&n)in counts.iter().enumerate(){offsets[i]=sum;sum+=n;}
  let mut out=vec![0u32;order.len()];for &id in &order{let bucket=((keys[id as usize]>>shift)&255)as usize;out[offsets[bucket]as usize]=id;offsets[bucket]+=1;}order=out;
 }order
}
#[inline(never)]
fn rust_sweep(xs:Vec<[f32;4]>)->Output{
 let keys:Vec<_>=xs.iter().map(|b|key(b[0])).collect();let ids=(0..xs.len()as u32).filter(|&i|valid(&xs[i as usize])).collect();let order=radix(&keys,ids);let mut pairs=vec![];
 for(k,&id)in order.iter().enumerate(){let a=&xs[id as usize];for &other in &order[k+1..]{let b=&xs[other as usize];if b[0]>a[2]{break;}if overlaps(a,b){assert!(pairs.len()<u32::MAX as usize);pairs.push(if id<other{(id,other)}else{(other,id)});}}}
 canonical_pairs(pairs)
}
fn canonical_pairs(pairs:Vec<(u32,u32)>)->Output{
 let second:Vec<_>=pairs.iter().map(|p|p.1).collect();let first:Vec<_>=pairs.iter().map(|p|p.0).collect();let order=radix(&second,(0..pairs.len()as u32).collect());let order=radix(&first,order);
 Output::Rust(order.into_iter().map(|i|pairs[i as usize]).collect())
}
#[derive(Clone,Copy)]struct Node{bounds:[f32;4],left:u32,right:u32,id:u32,leaf:bool}
#[inline(never)]
fn rust_bvh(xs:Vec<[f32;4]>)->Output{
 let keys:Vec<_>=xs.iter().map(|b|key(b[0])).collect();let ids=(0..xs.len()as u32).filter(|&i|valid(&xs[i as usize])).collect();let order=radix(&keys,ids);
 let mut nodes:Vec<Node>=order.iter().map(|&id|Node{bounds:xs[id as usize],left:0,right:0,id,leaf:true}).collect();let mut front:Vec<u32>=(0..nodes.len()as u32).collect();
 while front.len()>1{let mut next=vec![];for pair in front.chunks(2){if pair.len()==1{next.push(pair[0]);continue;}
  let left=pair[0];let right=pair[1];let a=nodes[left as usize].bounds;let b=nodes[right as usize].bounds;
  let bounds=[if a[0]<b[0]{a[0]}else{b[0]},if a[1]<b[1]{a[1]}else{b[1]},if a[2]>b[2]{a[2]}else{b[2]},if a[3]>b[3]{a[3]}else{b[3]}];
  assert!(nodes.len()<u32::MAX as usize);let id=nodes.len()as u32;nodes.push(Node{bounds,left,right,id:0,leaf:false});next.push(id);
 }front=next;}
 let mut pairs=vec![];for(id,a)in xs.iter().enumerate(){if !valid(a)||nodes.is_empty(){continue;}let mut stack=vec![front[0]];
  for _ in 0..nodes.len(){let Some(index)=stack.pop()else{break;};let node=nodes[index as usize];if !overlaps(a,&node.bounds){continue;}
   if node.leaf{if node.id>id as u32{assert!(pairs.len()<u32::MAX as usize);pairs.push((id as u32,node.id));}}else{stack.push(node.left);stack.push(node.right);}
  }
 }canonical_pairs(pairs)
}

#[inline(never)]
fn upstream(xs:Vec<[f32;4]>)->Output{assert!(xs.len()<=i32::MAX as usize);let mut data=std::ptr::null_mut();let len=unsafe{ink_box2d_pairs(xs.as_ptr().cast(),xs.len()as u32,&mut data)};Output::Box2d{data,len}}
fn measure(f:&dyn Fn()->Output,reps:usize)->f64{let start=Instant::now();for _ in 0..reps{drop(black_box(f()));}start.elapsed().as_nanos()as f64/reps as f64}
fn dataset(mode:&str,n:usize)->Vec<[f32;4]>{(0..n).map(|i|{let (x,y,w,h)=match mode{
 "uniform"=>(((i*37)%1021)as f32/4.0,((i*73)%1019)as f32/4.0,1.0,1.0),
 "clustered"=>(((i*17)%31)as f32/4.0,((i*23)%29)as f32/4.0,2.0,2.0),
 "x-overlap"=>(0.0,i as f32*2.0,100.0,1.0),"all-overlap"=>(0.0,0.0,1.0,1.0),
 "touching"=>(i as f32,0.0,1.0,1.0),"points"=>((i%7)as f32,(i%11)as f32,0.0,0.0),_=>unreachable!()};[x,y,x+w,y+h]}).collect()}
fn main(){let check_only=std::env::args().any(|a|a=="--check-only");let state=State::new();for mode in ["uniform","clustered","x-overlap","all-overlap","touching","points"]{for n in [0,1,16,64,256,1024]{
 if check_only&&n>16{continue;}let xs=dataset(mode,n);let ink:Vec<_>=xs.iter().map(|b|Aabb{l_min_x:b[0],l_min_y:b[1],l_max_x:b[2],l_max_y:b[3]}).collect();let expected=oracle(&xs);
 let baseline=||Output::Ink(state.function_l_all_pairs(black_box(ink.clone())));let sweep=||Output::Ink(state.function_l_sweep(black_box(ink.clone())));let rust=||rust_sweep(black_box(xs.clone()));let tree=||upstream(black_box(xs.clone()));
 let bvh=||Output::Ink(state.function_l_bvh(black_box(ink.clone())));let rbvh=||rust_bvh(black_box(xs.clone()));let functions:[&dyn Fn()->Output;6]=[&baseline,&sweep,&bvh,&rust,&rbvh,&tree];for f in functions{assert_eq!(f().keys(),expected,"before {mode} {n}");}
 if check_only{println!("checked {mode} {n} {} pairs",expected.len());continue;}for f in functions{for _ in 0..3{drop(black_box(f()));}}
 let calibration=functions.iter().map(|f|measure(*f,1)).fold(0.0,f64::max);let reps=(1_000_000.0/calibration).clamp(1.0,1000.0)as usize;let mut samples=[vec![],vec![],vec![],vec![],vec![],vec![]];
 for round in 0..12{for offset in 0..6{let i=(round+offset)%6;samples[i].push(measure(functions[i],reps));}}
 for f in functions{assert_eq!(f().keys(),expected,"after {mode} {n}");}
 println!("{}",serde_json::json!({"mode":mode,"n":n,"pair_count":expected.len(),"repetitions":reps,"samples_ns":samples,"validated":true}));
}}}
