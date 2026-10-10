// Exact source-stage/fused wrapping algorithms shared by native and Wasm.
fn quot(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a/b}}
fn rem(a:u32,b:u32,z:u32)->u32{if b==0{z}else{a%b}}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0;n];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n,n));}
pub fn bench_scalar(case:u32,xs:&[u32],ys:&[u32],seed:u32,k:u32)->u64{match case{
0=>{let mut total=0u32;for &x in xs{let q=quot((x).wrapping_add(seed),k,k);let c=q<seed;let value=if c{quot(((x).wrapping_mul(k)).wrapping_add(seed),seed,k)}else{((if (x<k){(k).wrapping_sub(x)}else{(x).wrapping_sub(k)})).wrapping_add(seed)};total=total.wrapping_add(value);}total as u64},
1=>{let mut total=0u32;for &x in xs{let q=quot((x).wrapping_add(seed),k,k);let c=q<seed;let value=if c{quot(((x).wrapping_mul(k)).wrapping_add(seed),seed,k)}else{0u32.wrapping_sub(((if (x<k){(k).wrapping_sub(x)}else{(x).wrapping_sub(k)})).wrapping_add(seed))};total=total.wrapping_add(value);}total as u64},
2=>{let mut total=0u32;for &x in xs{let q=quot((x).wrapping_add(seed),k,k);let c=q<seed;let value=if c{(quot(((x).wrapping_mul(k)).wrapping_add(seed),seed,k)).wrapping_add((x).wrapping_add(seed))}else{(((if (x<k){(k).wrapping_sub(x)}else{(x).wrapping_sub(k)})).wrapping_add(seed)).wrapping_add((if k!=0{q}else{seed}))};total=total.wrapping_add(value);}total as u64},
3=>{let mut total=0u32;for &x in xs{let m=x.wrapping_mul(k);let q=quot((m).wrapping_add(seed),seed,k);let c=q>k;let value=if c{((if (x>seed){(x).wrapping_sub(seed)}else{(seed).wrapping_sub(x)})).wrapping_mul(3u32)}else{quot((x).wrapping_add(seed),k,seed)};total=total.wrapping_add(value);}total as u64},
4=>{let mut total=0u32;for &x in xs{let m=x.wrapping_mul(k);let q=quot((m).wrapping_add(seed),seed,k);let c=q>k;let value=if c{((if (x>seed){(x).wrapping_sub(seed)}else{(seed).wrapping_sub(x)})).wrapping_mul(3u32)}else{0u32.wrapping_sub(quot((x).wrapping_add(seed),k,seed))};total=total.wrapping_add(value);}total as u64},
5=>{let mut total=0u32;for &x in xs{let m=x.wrapping_mul(k);let q=quot((m).wrapping_add(seed),seed,k);let c=q>k;let value=if c{(((if (x>seed){(x).wrapping_sub(seed)}else{(seed).wrapping_sub(x)})).wrapping_mul(3u32)).wrapping_add(quot(m,k,seed))}else{(quot((x).wrapping_add(seed),k,seed)).wrapping_add((x).wrapping_add(k))};total=total.wrapping_add(value);}total as u64},
_=>panic!("non-scalar case")}}
#[no_mangle]pub unsafe extern "C" fn bench_eval(case:u32,xp:*const u32,xn:usize,yp:*const u32,yn:usize,seed:u32,k:u32,out:*mut u32)->usize{let xs=std::slice::from_raw_parts(xp,xn);let ys=std::slice::from_raw_parts(yp,yn);match case{
0=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
1=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
2=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
3=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
4=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
5=>{*out=bench_scalar(case,xs,ys,seed,k) as u32;1},
6=>{for(j,&x)in xs.iter().enumerate(){let i=j as u32;let a=(if (rem(i,2u32,0u32)==0u32){(x).wrapping_add(k)}else{(x).wrapping_sub(seed)});let b=(if (rem(i,3u32,0u32)==0u32){((x).wrapping_mul(3u32)).wrapping_add(k)}else{(x).wrapping_add(seed)});*out.add(j)=(if (a<b){(a).wrapping_add((b).wrapping_mul(k))}else{(a).wrapping_sub((b).wrapping_mul(k))});}xs.len()},
7=>{for(j,&x)in xs.iter().enumerate(){let i=j as u32;let a=(if (rem(i,2u32,0u32)==0u32){(x).wrapping_add(k)}else{(x).wrapping_sub(seed)});let b=x;*out.add(j)=(if (a<b){(a).wrapping_add((b).wrapping_mul(k))}else{(a).wrapping_sub((b).wrapping_mul(k))});}xs.len()},
8=>{for(j,&x)in xs.iter().enumerate(){let i=j as u32;let a=x;let b=(if (rem(i,3u32,0u32)==0u32){((x).wrapping_mul(3u32)).wrapping_add(k)}else{(x).wrapping_add(seed)});*out.add(j)=(if (a<b){(a).wrapping_add((b).wrapping_mul(k))}else{(a).wrapping_sub((b).wrapping_mul(k))});}xs.len()},
9=>{for(j,&x)in xs.iter().enumerate(){let i=j as u32;let a=(if (rem(i,3u32,0u32)==0u32){(if (x>k){x}else{seed})}else{(x).wrapping_add(k)});let b=(if (rem(i,2u32,0u32)==0u32){(seed).wrapping_sub(x)}else{(x).wrapping_mul(3u32)});*out.add(j)=(if (a>b){((a).wrapping_mul(b)).wrapping_add(seed)}else{(a).wrapping_add((b).wrapping_mul(k))});}xs.len()},
10=>{for(j,&x)in xs.iter().enumerate(){let i=j as u32;let a=(if (rem(i,3u32,0u32)==0u32){(if (x>k){x}else{seed})}else{(x).wrapping_add(k)});let b=x;*out.add(j)=(if (a>b){((a).wrapping_mul(b)).wrapping_add(seed)}else{(a).wrapping_add((b).wrapping_mul(k))});}xs.len()},
11=>{for(j,&x)in xs.iter().enumerate(){let i=j as u32;let a=x;let b=(if (rem(i,2u32,0u32)==0u32){(seed).wrapping_sub(x)}else{(x).wrapping_mul(3u32)});*out.add(j)=(if (a>b){((a).wrapping_mul(b)).wrapping_add(seed)}else{(a).wrapping_add((b).wrapping_mul(k))});}xs.len()},
_=>panic!("unknown case")}}
