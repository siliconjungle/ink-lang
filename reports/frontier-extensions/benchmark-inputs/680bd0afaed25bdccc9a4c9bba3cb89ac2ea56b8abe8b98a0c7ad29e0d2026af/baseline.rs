// ink-definition-rust-v1: checked bodies; Rust/backend are trusted.
#![allow(non_camel_case_types, non_snake_case, non_upper_case_globals, dead_code, unused_variables, unused_parens, unused_unsafe, improper_ctypes_definitions)]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a { C0,C1(u64,std::sync::Arc<D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a>) }
impl D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a{fn take_tail(&mut self)->Option<std::sync::Arc<Self>>{match self{Self::C0=>None,Self::C1(_,tail)=>Some(std::mem::replace(tail,std::sync::Arc::new(Self::C0))),}}}
impl Drop for D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a{fn drop(&mut self){let mut pending=self.take_tail();while let Some(tail)=pending{match std::sync::Arc::try_unwrap(tail){Ok(mut node)=>pending=node.take_tail(),Err(_)=>break,}}}}
fn d_08900326f42f7c97618ac060953348a4b7d6db2532e48b5293d14e31ea47b36c(v0: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> bool { match v0 { D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v1,v2,v3,v4) => { *v3 } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b { C0(std::sync::Arc<D_96ac90d56efe899a31eb0e2f5a287ae27e49056c48cf0f97878b6a3071500018>) }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_0d99b398bfe870de870e843dfb762df7dc59b49ea0c40dbef3738cd581095075 { C0(std::sync::Arc<D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b>,std::sync::Arc<D_dc3361ea8b26fea23ed6f5a2d95d5e92b002ca290540d5c1281dc07696f3d106>) }
fn d_1177459c8615b8fe5c475c2f3f14f7370518bcd29b4cfa18672ade6884585373(v5: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333,v6: u64) -> D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333 { match v5 { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 => { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 },D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v8,v9,v10) => { if ((v6) == (*v8)) { d_1177459c8615b8fe5c475c2f3f14f7370518bcd29b4cfa18672ade6884585373(v10.as_ref(),v6) } else { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(*v8,std::sync::Arc::clone(v9),std::sync::Arc::new(d_1177459c8615b8fe5c475c2f3f14f7370518bcd29b4cfa18672ade6884585373(v10.as_ref(),v6))) } } } }
fn d_266d9b32ec61031ac0d5a749b7a40e192e5d3493d2584514f7e57def91d3f9ee(v11: &D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b,v12: u64) -> D_0d99b398bfe870de870e843dfb762df7dc59b49ea0c40dbef3738cd581095075 { D_0d99b398bfe870de870e843dfb762df7dc59b49ea0c40dbef3738cd581095075::C0(std::sync::Arc::new((v11).clone()),std::sync::Arc::new(d_d3d7f592bfb8c85812dc5920736149325f8c4635061d84c9daa8de59194e7bc7(&(d_4641a0c613562838cd7e2176c788e7df505b3ecc6b80e00a5697c69b5accd219(v11)),v12))) }
fn d_2db94b4c59fa814cdb29f1eece40a3d8d1bc5b6e5c1bc81e957dfd0695e12d04(v13: &D_0d99b398bfe870de870e843dfb762df7dc59b49ea0c40dbef3738cd581095075) -> D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b { match v13 { D_0d99b398bfe870de870e843dfb762df7dc59b49ea0c40dbef3738cd581095075::C0(v14,v15) => { (v14.as_ref()).clone() } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_39de6ddc13aabfcf805583f41e9bc0c6f7a8e2b2af079099a10d38e5cbf13273 { C0(std::sync::Arc<D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b>,std::sync::Arc<D_a052624544f6d73ef9de3834cf97708df12875f77020694bf019de88c7808d4c>) }
fn d_3eceae92490f9f9d536135ad4c23c098f8922d16ddba90a27b458ecdda424de9(v16: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333) -> D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25 { match v16 { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 => { D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25::C0 },D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v18,v19,v20) => { D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25::C1(d_08900326f42f7c97618ac060953348a4b7d6db2532e48b5293d14e31ea47b36c(v19.as_ref()),std::sync::Arc::new(d_3eceae92490f9f9d536135ad4c23c098f8922d16ddba90a27b458ecdda424de9(v20.as_ref()))) } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f { C0,C1(std::sync::Arc<D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9>,std::sync::Arc<D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f>) }
impl D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f{fn take_tail(&mut self)->Option<std::sync::Arc<Self>>{match self{Self::C0=>None,Self::C1(_,tail)=>Some(std::mem::replace(tail,std::sync::Arc::new(Self::C0))),}}}
impl Drop for D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f{fn drop(&mut self){let mut pending=self.take_tail();while let Some(tail)=pending{match std::sync::Arc::try_unwrap(tail){Ok(mut node)=>pending=node.take_tail(),Err(_)=>break,}}}}
fn d_4641a0c613562838cd7e2176c788e7df505b3ecc6b80e00a5697c69b5accd219(v21: &D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b) -> D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133 { match v21 { D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b::C0(v22) => { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_e1722813514852d355dd7d4abcec2eb6daf0f23a148311857684f30ad544cd37(v22.as_ref()))) } } }
fn d_4a71da3fa72dee68befe3555a0a234a49beb94c3c69674deff4ad844ea4e7478(v23: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333,v24: u64) -> bool { match &(d_ddc7dbae8629d9a12cf7e7a9a908bcae3f9c9444025738902ed6a32f47b803bd(v23,v24)) { D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C0 => { false },D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C1(v25) => { true } } }
fn d_4d21be41958f4ae5812845370018dac3f4a55d94c1fe0e3847e4f3b3410e8db3(v26: &D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133,v27: u64,v28: u64) -> D_a052624544f6d73ef9de3834cf97708df12875f77020694bf019de88c7808d4c { D_a052624544f6d73ef9de3834cf97708df12875f77020694bf019de88c7808d4c::C0(std::sync::Arc::new(d_ddc7dbae8629d9a12cf7e7a9a908bcae3f9c9444025738902ed6a32f47b803bd(&(match v26 { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(v29) => { (v29.as_ref()).clone() } }),v28)),false,v27,std::sync::Arc::new((v26).clone()),std::sync::Arc::clone({static v30:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v30.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})) }
fn d_57b9b1659761cdb4d2d72a9987923c169a0914a13571cccedfcb23ba124c94dc(v31: &D_0d99b398bfe870de870e843dfb762df7dc59b49ea0c40dbef3738cd581095075) -> D_dc3361ea8b26fea23ed6f5a2d95d5e92b002ca290540d5c1281dc07696f3d106 { match v31 { D_0d99b398bfe870de870e843dfb762df7dc59b49ea0c40dbef3738cd581095075::C0(v32,v33) => { (v33.as_ref()).clone() } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e { C0(std::sync::Arc<D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>,bool,u64,std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>,std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>),C1(u64,u64,std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>) }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9 { C0(u64,bool,bool,bool) }
fn d_6cd17674e29481ccebbe1090803d54f0d909dab088b2640c3fb3daa41d541082(v34: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333) -> D_96ac90d56efe899a31eb0e2f5a287ae27e49056c48cf0f97878b6a3071500018 { D_96ac90d56efe899a31eb0e2f5a287ae27e49056c48cf0f97878b6a3071500018::C0(std::sync::Arc::new(d_c97e1c7bddd008c78acda5db14e3c970d0da24eae8cfc1ab4dc2ddcb02eca6c9(v34)),std::sync::Arc::new(d_b9da95c5d9f903b2996322149f867eed958577ecd6ccd0e47276bbe6fe4ff601(v34)),std::sync::Arc::new(d_82b9b7bb5fc563aefd9d2f369ed56cf15a63f1bec44b7f806fbdc98300a2206d(v34)),std::sync::Arc::new(d_3eceae92490f9f9d536135ad4c23c098f8922d16ddba90a27b458ecdda424de9(v34)),std::sync::Arc::new(d_f6da15f91e42c201ab8adc5ec055c7474d0e24eb230da79eaf5551f59f419f84(v34))) }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_7388572c4de0f5e74f353cc861a72befee54ef2b91c8001076912324b8428a3e { C0(std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>) }
fn d_82b9b7bb5fc563aefd9d2f369ed56cf15a63f1bec44b7f806fbdc98300a2206d(v35: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333) -> D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25 { match v35 { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 => { D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25::C0 },D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v37,v38,v39) => { D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25::C1(d_87ae30c37ddd8ea93d060bdc5e06969429c527536fa2872e5e055a78e02dc59e(v38.as_ref()),std::sync::Arc::new(d_82b9b7bb5fc563aefd9d2f369ed56cf15a63f1bec44b7f806fbdc98300a2206d(v39.as_ref()))) } } }
fn d_87ae30c37ddd8ea93d060bdc5e06969429c527536fa2872e5e055a78e02dc59e(v40: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> bool { match v40 { D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v41,v42,v43,v44) => { *v42 } } }
fn d_8bcdb17785a0076cdfbd2e6b143ee026abd7e674a6ce2728467f6c901d6e204f(v45: &D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b,v46: u64,v47: u64,v48: bool) -> D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e { d_e64b4eca1784b1331becdd38fd64818f684f5ea324b606cf34568c8e4835e296(&(d_4641a0c613562838cd7e2176c788e7df505b3ecc6b80e00a5697c69b5accd219(v45)),v46,v47,v48) }
fn d_8bde5cca889d562ef845c700098af9a54ffd13c245b02eed5f1ae8477896276b(v49: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333,v50: u64,v51: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333 { match v49 { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 => { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 },D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v53,v54,v55) => { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(*v53,std::sync::Arc::new(if ((v50) == (*v53)) { (v51).clone() } else { (v54.as_ref()).clone() }),std::sync::Arc::new(d_8bde5cca889d562ef845c700098af9a54ffd13c245b02eed5f1ae8477896276b(v55.as_ref(),v50,v51))) } } }
fn d_8c3fe32c5aef8938d90d04d94f9ac834ea3e9080e1222005d47fdfa3ac427591(v56: &D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a,v57: &D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a,v58: &D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25,v59: &D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25,v60: &D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25) -> D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333 { match v56 { D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a::C0 => { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 },D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a::C1(v62,v63) => { match v57 { D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a::C0 => { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 },D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a::C1(v65,v66) => { match v58 { D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25::C0 => { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 },D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25::C1(v68,v69) => { match v59 { D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25::C0 => { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 },D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25::C1(v71,v72) => { match v60 { D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25::C0 => { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 },D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25::C1(v74,v75) => { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(*v62,std::sync::Arc::new(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(*v65,*v68,*v71,*v74)),std::sync::Arc::new(d_8c3fe32c5aef8938d90d04d94f9ac834ea3e9080e1222005d47fdfa3ac427591(v63.as_ref(),v66.as_ref(),v69.as_ref(),v72.as_ref(),v75.as_ref()))) } } } } } } } } } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f { C0(std::sync::Arc<D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c>),C1(std::sync::Arc<D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b>) }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_96ac90d56efe899a31eb0e2f5a287ae27e49056c48cf0f97878b6a3071500018 { C0(std::sync::Arc<D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a>,std::sync::Arc<D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a>,std::sync::Arc<D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25>,std::sync::Arc<D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25>,std::sync::Arc<D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25>) }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d { C0,C1(std::sync::Arc<D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9>) }
fn d_9af6cc513f6afd389c27298bfc84fd80538fc67def7854880e20ad87a97608e4(v76: &D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e) -> D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e { (v76).clone() }
fn d_9bc6b949a0e1ad9e474b3ca3217418fe9010900b02a7eba839f6ad310d2077ba(v77: &D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a,v78: &D_de11c8a29cbacab71906b2cb8d95465f9945c4af2d8ce313218341c19c119ef1) -> D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a { match v77 { D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0 => { D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C1(std::sync::Arc::new((v78).clone()),std::sync::Arc::clone({static v79:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v79.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})) },D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C1(v80,v81) => { D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C1(std::sync::Arc::clone(v80),std::sync::Arc::new(d_9bc6b949a0e1ad9e474b3ca3217418fe9010900b02a7eba839f6ad310d2077ba(v81.as_ref(),v78))) } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_a052624544f6d73ef9de3834cf97708df12875f77020694bf019de88c7808d4c { C0(std::sync::Arc<D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d>,bool,u64,std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>,std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>),C1(u64,u64,std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>) }
fn d_a4073b19aa606037a988a888e2745fed8c6010fe91f79f623bd40310dc0241d9(v82: &D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b,v83: u64,v84: u64) -> D_39de6ddc13aabfcf805583f41e9bc0c6f7a8e2b2af079099a10d38e5cbf13273 { D_39de6ddc13aabfcf805583f41e9bc0c6f7a8e2b2af079099a10d38e5cbf13273::C0(std::sync::Arc::new((v82).clone()),std::sync::Arc::new(d_4d21be41958f4ae5812845370018dac3f4a55d94c1fe0e3847e4f3b3410e8db3(&(d_4641a0c613562838cd7e2176c788e7df505b3ecc6b80e00a5697c69b5accd219(v82)),v83,v84))) }
fn d_a55d979365086f1d50b4a1b50ab2537f8d45debc84a59ecaa4b47366ff738bc2(v85: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333,v86: u64,v87: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333 { match v85 { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 => { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v86,std::sync::Arc::new((v87).clone()),std::sync::Arc::clone({static v88:std::sync::OnceLock<std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>>=std::sync::OnceLock::new();v88.get_or_init(||std::sync::Arc::new(D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0))})) },D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v89,v90,v91) => { if (((((v86).wrapping_add(2147483648u64)) & (4294967295u64))) < ((((*v89).wrapping_add(2147483648u64)) & (4294967295u64)))) { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v86,std::sync::Arc::new((v87).clone()),std::sync::Arc::new((v85).clone())) } else { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(*v89,std::sync::Arc::clone(v90),std::sync::Arc::new(d_a55d979365086f1d50b4a1b50ab2537f8d45debc84a59ecaa4b47366ff738bc2(v91.as_ref(),v86,v87))) } } } }
fn d_ac3b6e81f1cb305bcad3abee8005d45eb10fadaf314fadbac2323c668600ec15(v92: &D_39de6ddc13aabfcf805583f41e9bc0c6f7a8e2b2af079099a10d38e5cbf13273) -> D_a052624544f6d73ef9de3834cf97708df12875f77020694bf019de88c7808d4c { match v92 { D_39de6ddc13aabfcf805583f41e9bc0c6f7a8e2b2af079099a10d38e5cbf13273::C0(v93,v94) => { (v94.as_ref()).clone() } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_b734bf35d604578ece3a84d28e3cf2c53a1aec8a7703d1572ee5fdf9a564050f { C0(std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>) }
fn d_b9da95c5d9f903b2996322149f867eed958577ecd6ccd0e47276bbe6fe4ff601(v95: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333) -> D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a { match v95 { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 => { D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a::C0 },D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v97,v98,v99) => { D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a::C1(d_c6021ea65a3b47e82e08a1d5e1473b3dc4f69567805f958232d19223918efca5(v98.as_ref()),std::sync::Arc::new(d_b9da95c5d9f903b2996322149f867eed958577ecd6ccd0e47276bbe6fe4ff601(v99.as_ref()))) } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c { C0 }
impl D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c{fn take_tail(&mut self)->Option<std::sync::Arc<Self>>{match self{Self::C0=>None,}}}
impl Drop for D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c{fn drop(&mut self){let mut pending=self.take_tail();while let Some(tail)=pending{match std::sync::Arc::try_unwrap(tail){Ok(mut node)=>pending=node.take_tail(),Err(_)=>break,}}}}
fn d_c6021ea65a3b47e82e08a1d5e1473b3dc4f69567805f958232d19223918efca5(v100: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> u64 { match v100 { D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v101,v102,v103,v104) => { *v101 } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a { C0,C1(std::sync::Arc<D_de11c8a29cbacab71906b2cb8d95465f9945c4af2d8ce313218341c19c119ef1>,std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>) }
impl D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a{fn take_tail(&mut self)->Option<std::sync::Arc<Self>>{match self{Self::C0=>None,Self::C1(_,tail)=>Some(std::mem::replace(tail,std::sync::Arc::new(Self::C0))),}}}
impl Drop for D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a{fn drop(&mut self){let mut pending=self.take_tail();while let Some(tail)=pending{match std::sync::Arc::try_unwrap(tail){Ok(mut node)=>pending=node.take_tail(),Err(_)=>break,}}}}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b { C0 }
impl D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b{fn take_tail(&mut self)->Option<std::sync::Arc<Self>>{match self{Self::C0=>None,}}}
impl Drop for D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b{fn drop(&mut self){let mut pending=self.take_tail();while let Some(tail)=pending{match std::sync::Arc::try_unwrap(tail){Ok(mut node)=>pending=node.take_tail(),Err(_)=>break,}}}}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133 { C0(std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>) }
fn d_c97e1c7bddd008c78acda5db14e3c970d0da24eae8cfc1ab4dc2ddcb02eca6c9(v105: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333) -> D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a { match v105 { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 => { D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a::C0 },D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v107,v108,v109) => { D_02e15915e24f08c08d88f93bf5443a841f944ec2e81070cb4f074aeac728e49a::C1(*v107,std::sync::Arc::new(d_c97e1c7bddd008c78acda5db14e3c970d0da24eae8cfc1ab4dc2ddcb02eca6c9(v109.as_ref()))) } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333 { C0,C1(u64,std::sync::Arc<D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9>,std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>) }
impl D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333{fn take_tail(&mut self)->Option<std::sync::Arc<Self>>{match self{Self::C0=>None,Self::C1(_,_,tail)=>Some(std::mem::replace(tail,std::sync::Arc::new(Self::C0))),}}}
impl Drop for D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333{fn drop(&mut self){let mut pending=self.take_tail();while let Some(tail)=pending{match std::sync::Arc::try_unwrap(tail){Ok(mut node)=>pending=node.take_tail(),Err(_)=>break,}}}}
fn d_d0cf621c736aa0efac4507641f392b2d6a145627ab251b029b22bd8e8b9bab75(v110: &D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133,v111: u64,v112: u64,v113: u64,v114: bool,v115: bool,v116: bool,v117: bool) -> D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e { match &(D_d35c1fda33e1ce035175aa5faefb7d99b1cc1d39bfa60e1b55a22bee2331eebf::C0(std::sync::Arc::new(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v113,v114,v115,v116)))) { D_d35c1fda33e1ce035175aa5faefb7d99b1cc1d39bfa60e1b55a22bee2331eebf::C0(v118) => { if d_4a71da3fa72dee68befe3555a0a234a49beb94c3c69674deff4ad844ea4e7478(&(match v110 { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(v119) => { (v119.as_ref()).clone() } }),v112) { if d_4a71da3fa72dee68befe3555a0a234a49beb94c3c69674deff4ad844ea4e7478(&(match v110 { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(v120) => { (v120.as_ref()).clone() } }),v112) { match &(D_7388572c4de0f5e74f353cc861a72befee54ef2b91c8001076912324b8428a3e::C0(std::sync::Arc::new(match v110 { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(v121) => { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_8bde5cca889d562ef845c700098af9a54ffd13c245b02eed5f1ae8477896276b(&(match v110 { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(v122) => { (v122.as_ref()).clone() } }),v112,v118.as_ref()))) } }))) { D_7388572c4de0f5e74f353cc861a72befee54ef2b91c8001076912324b8428a3e::C0(v123) => { match &(D_b734bf35d604578ece3a84d28e3cf2c53a1aec8a7703d1572ee5fdf9a564050f::C0(std::sync::Arc::new(d_9bc6b949a0e1ad9e474b3ca3217418fe9010900b02a7eba839f6ad310d2077ba(&(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0),&(D_de11c8a29cbacab71906b2cb8d95465f9945c4af2d8ce313218341c19c119ef1::C0(std::sync::Arc::clone(v118))))))) { D_b734bf35d604578ece3a84d28e3cf2c53a1aec8a7703d1572ee5fdf9a564050f::C0(v125) => { if v117 { match &(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(std::sync::Arc::clone({static v126:std::sync::OnceLock<std::sync::Arc<D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b>>=std::sync::OnceLock::new();v126.get_or_init(||std::sync::Arc::new(D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b::C0))}))) { D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(v128) => { if ((v111) == (18446744073709551615u64)) { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(1u64,v111,std::sync::Arc::new((v110).clone())) } else { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(std::sync::Arc::clone(v128))),true,(v111).wrapping_add(1u64),std::sync::Arc::clone(v123),std::sync::Arc::clone(v125)) } },D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(v129) => { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(std::sync::Arc::clone(v129))),false,v111,std::sync::Arc::new((v110).clone()),std::sync::Arc::clone({static v130:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v130.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})) } } } else { match &(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(std::sync::Arc::clone({static v131:std::sync::OnceLock<std::sync::Arc<D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c>>=std::sync::OnceLock::new();v131.get_or_init(||std::sync::Arc::new(D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c::C0))}))) { D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(v133) => { if ((v111) == (18446744073709551615u64)) { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(1u64,v111,std::sync::Arc::new((v110).clone())) } else { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(std::sync::Arc::clone(v133))),true,(v111).wrapping_add(1u64),std::sync::Arc::clone(v123),std::sync::Arc::clone(v125)) } },D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(v134) => { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(std::sync::Arc::clone(v134))),false,v111,std::sync::Arc::new((v110).clone()),std::sync::Arc::clone({static v135:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v135.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})) } } } } } } } } else { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(2u64,v111,std::sync::Arc::new((v110).clone())) } } else { if d_4a71da3fa72dee68befe3555a0a234a49beb94c3c69674deff4ad844ea4e7478(&(match v110 { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(v136) => { (v136.as_ref()).clone() } }),v112) { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(2u64,v111,std::sync::Arc::new((v110).clone())) } else { match &(D_7388572c4de0f5e74f353cc861a72befee54ef2b91c8001076912324b8428a3e::C0(std::sync::Arc::new(match v110 { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(v137) => { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_a55d979365086f1d50b4a1b50ab2537f8d45debc84a59ecaa4b47366ff738bc2(&(match v110 { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(v138) => { (v138.as_ref()).clone() } }),v112,v118.as_ref()))) } }))) { D_7388572c4de0f5e74f353cc861a72befee54ef2b91c8001076912324b8428a3e::C0(v139) => { match &(D_b734bf35d604578ece3a84d28e3cf2c53a1aec8a7703d1572ee5fdf9a564050f::C0(std::sync::Arc::new(d_9bc6b949a0e1ad9e474b3ca3217418fe9010900b02a7eba839f6ad310d2077ba(&(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0),&(D_de11c8a29cbacab71906b2cb8d95465f9945c4af2d8ce313218341c19c119ef1::C0(std::sync::Arc::clone(v118))))))) { D_b734bf35d604578ece3a84d28e3cf2c53a1aec8a7703d1572ee5fdf9a564050f::C0(v141) => { if v117 { match &(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(std::sync::Arc::clone({static v142:std::sync::OnceLock<std::sync::Arc<D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b>>=std::sync::OnceLock::new();v142.get_or_init(||std::sync::Arc::new(D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b::C0))}))) { D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(v144) => { if ((v111) == (18446744073709551615u64)) { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(1u64,v111,std::sync::Arc::new((v110).clone())) } else { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(std::sync::Arc::clone(v144))),true,(v111).wrapping_add(1u64),std::sync::Arc::clone(v139),std::sync::Arc::clone(v141)) } },D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(v145) => { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(std::sync::Arc::clone(v145))),false,v111,std::sync::Arc::new((v110).clone()),std::sync::Arc::clone({static v146:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v146.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})) } } } else { match &(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(std::sync::Arc::clone({static v147:std::sync::OnceLock<std::sync::Arc<D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c>>=std::sync::OnceLock::new();v147.get_or_init(||std::sync::Arc::new(D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c::C0))}))) { D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(v149) => { if ((v111) == (18446744073709551615u64)) { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(1u64,v111,std::sync::Arc::new((v110).clone())) } else { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(std::sync::Arc::clone(v149))),true,(v111).wrapping_add(1u64),std::sync::Arc::clone(v139),std::sync::Arc::clone(v141)) } },D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(v150) => { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(std::sync::Arc::clone(v150))),false,v111,std::sync::Arc::new((v110).clone()),std::sync::Arc::clone({static v151:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v151.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})) } } } } } } } } } } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_d35c1fda33e1ce035175aa5faefb7d99b1cc1d39bfa60e1b55a22bee2331eebf { C0(std::sync::Arc<D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9>) }
fn d_d3d7f592bfb8c85812dc5920736149325f8c4635061d84c9daa8de59194e7bc7(v152: &D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133,v153: u64) -> D_dc3361ea8b26fea23ed6f5a2d95d5e92b002ca290540d5c1281dc07696f3d106 { D_dc3361ea8b26fea23ed6f5a2d95d5e92b002ca290540d5c1281dc07696f3d106::C0(std::sync::Arc::new(d_f8c4822bc088dcc6a93b8ea4294a9de7164c41efb3bcd36687050f57635970c5(&(match v152 { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(v154) => { (v154.as_ref()).clone() } }))),false,v153,std::sync::Arc::new((v152).clone()),std::sync::Arc::clone({static v155:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v155.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})) }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_dc3361ea8b26fea23ed6f5a2d95d5e92b002ca290540d5c1281dc07696f3d106 { C0(std::sync::Arc<D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f>,bool,u64,std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>,std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>),C1(u64,u64,std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>) }
fn d_ddc7dbae8629d9a12cf7e7a9a908bcae3f9c9444025738902ed6a32f47b803bd(v156: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333,v157: u64) -> D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d { match v156 { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 => { D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C0 },D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v159,v160,v161) => { if ((v157) == (*v159)) { D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C1(std::sync::Arc::clone(v160)) } else { d_ddc7dbae8629d9a12cf7e7a9a908bcae3f9c9444025738902ed6a32f47b803bd(v161.as_ref(),v157) } } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_de11c8a29cbacab71906b2cb8d95465f9945c4af2d8ce313218341c19c119ef1 { C0(std::sync::Arc<D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9>) }
fn d_df2634b4709d2f792b0c2fed5e6d2f6cf528c744e218159ad1ad70d6b870f509(v162: &D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133) -> D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b { match v162 { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(v163) => { D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b::C0(std::sync::Arc::new(d_6cd17674e29481ccebbe1090803d54f0d909dab088b2640c3fb3daa41d541082(v163.as_ref()))) } } }
fn d_dfc27dba7b90cad4be737623bfd3a76ce3bbb9ff20150d2691356194af6ae7f6(v164: &D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e) -> D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b { d_df2634b4709d2f792b0c2fed5e6d2f6cf528c744e218159ad1ad70d6b870f509(&(match v164 { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(v165,v166,v167,v168,v169) => { (v168.as_ref()).clone() },D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(v170,v171,v172) => { (v172.as_ref()).clone() } })) }
fn d_e1722813514852d355dd7d4abcec2eb6daf0f23a148311857684f30ad544cd37(v173: &D_96ac90d56efe899a31eb0e2f5a287ae27e49056c48cf0f97878b6a3071500018) -> D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333 { match v173 { D_96ac90d56efe899a31eb0e2f5a287ae27e49056c48cf0f97878b6a3071500018::C0(v174,v175,v176,v177,v178) => { d_8c3fe32c5aef8938d90d04d94f9ac834ea3e9080e1222005d47fdfa3ac427591(v174.as_ref(),v175.as_ref(),v176.as_ref(),v177.as_ref(),v178.as_ref()) } } }
fn d_e64b4eca1784b1331becdd38fd64818f684f5ea324b606cf34568c8e4835e296(v179: &D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133,v180: u64,v181: u64,v182: bool) -> D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e { match &(D_7388572c4de0f5e74f353cc861a72befee54ef2b91c8001076912324b8428a3e::C0(std::sync::Arc::new(match v179 { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(v183) => { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_1177459c8615b8fe5c475c2f3f14f7370518bcd29b4cfa18672ade6884585373(&(match v179 { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(v184) => { (v184.as_ref()).clone() } }),v181))) } }))) { D_7388572c4de0f5e74f353cc861a72befee54ef2b91c8001076912324b8428a3e::C0(v185) => { if v182 { match &(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(std::sync::Arc::clone({static v186:std::sync::OnceLock<std::sync::Arc<D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b>>=std::sync::OnceLock::new();v186.get_or_init(||std::sync::Arc::new(D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b::C0))}))) { D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(v188) => { if ((v180) == (18446744073709551615u64)) { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(1u64,v180,std::sync::Arc::new((v179).clone())) } else { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(std::sync::Arc::clone(v188))),true,(v180).wrapping_add(1u64),std::sync::Arc::clone(v185),std::sync::Arc::clone({static v189:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v189.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})) } },D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(v190) => { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(std::sync::Arc::clone(v190))),false,v180,std::sync::Arc::new((v179).clone()),std::sync::Arc::clone({static v191:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v191.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})) } } } else { match &(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(std::sync::Arc::clone({static v192:std::sync::OnceLock<std::sync::Arc<D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c>>=std::sync::OnceLock::new();v192.get_or_init(||std::sync::Arc::new(D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c::C0))}))) { D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(v194) => { if ((v180) == (18446744073709551615u64)) { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(1u64,v180,std::sync::Arc::new((v179).clone())) } else { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(std::sync::Arc::clone(v194))),true,(v180).wrapping_add(1u64),std::sync::Arc::clone(v185),std::sync::Arc::clone({static v195:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v195.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})) } },D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(v196) => { D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(std::sync::Arc::clone(v196))),false,v180,std::sync::Arc::new((v179).clone()),std::sync::Arc::clone({static v197:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v197.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})) } } } } } }
fn d_e70bae89d62b1e65926b98bdf1fc2cbc8a73deb072dac86c716d63e798eb7be9(v198: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> bool { match v198 { D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v199,v200,v201,v202) => { *v202 } } }
fn d_e9692fea556ee4a80fd8afee120ab334c2aee3d9911e431666bd6da4c6543cb3(v203: &D_39de6ddc13aabfcf805583f41e9bc0c6f7a8e2b2af079099a10d38e5cbf13273) -> D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b { match v203 { D_39de6ddc13aabfcf805583f41e9bc0c6f7a8e2b2af079099a10d38e5cbf13273::C0(v204,v205) => { (v204.as_ref()).clone() } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25 { C0,C1(bool,std::sync::Arc<D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25>) }
impl D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25{fn take_tail(&mut self)->Option<std::sync::Arc<Self>>{match self{Self::C0=>None,Self::C1(_,tail)=>Some(std::mem::replace(tail,std::sync::Arc::new(Self::C0))),}}}
impl Drop for D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25{fn drop(&mut self){let mut pending=self.take_tail();while let Some(tail)=pending{match std::sync::Arc::try_unwrap(tail){Ok(mut node)=>pending=node.take_tail(),Err(_)=>break,}}}}
fn d_f6da15f91e42c201ab8adc5ec055c7474d0e24eb230da79eaf5551f59f419f84(v206: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333) -> D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25 { match v206 { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 => { D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25::C0 },D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v208,v209,v210) => { D_f339924e96a0f1faa8f0889189000a6e336e4b39437ec268a3b71bd085148b25::C1(d_e70bae89d62b1e65926b98bdf1fc2cbc8a73deb072dac86c716d63e798eb7be9(v209.as_ref()),std::sync::Arc::new(d_f6da15f91e42c201ab8adc5ec055c7474d0e24eb230da79eaf5551f59f419f84(v210.as_ref()))) } } }
fn d_f8998f59341d0a922a473b4719ca589d043440d30a996d999d10c6baec92bad4(v211: &D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b,v212: u64,v213: u64,v214: u64,v215: bool,v216: bool,v217: bool,v218: bool) -> D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e { d_d0cf621c736aa0efac4507641f392b2d6a145627ab251b029b22bd8e8b9bab75(&(d_4641a0c613562838cd7e2176c788e7df505b3ecc6b80e00a5697c69b5accd219(v211)),v212,v213,v214,v215,v216,v217,v218) }
fn d_f8c4822bc088dcc6a93b8ea4294a9de7164c41efb3bcd36687050f57635970c5(v219: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333) -> D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f { match v219 { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 => { D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f::C0 },D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v221,v222,v223) => { D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f::C1(std::sync::Arc::clone(v222),std::sync::Arc::new(d_f8c4822bc088dcc6a93b8ea4294a9de7164c41efb3bcd36687050f57635970c5(v223.as_ref()))) } } }
pub fn f_266d9b32ec61031ac0d5a749b7a40e192e5d3493d2584514f7e57def91d3f9ee(v224: &D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b,v225: u64) -> D_0d99b398bfe870de870e843dfb762df7dc59b49ea0c40dbef3738cd581095075 { d_266d9b32ec61031ac0d5a749b7a40e192e5d3493d2584514f7e57def91d3f9ee(v224,v225) }
pub fn f_2db94b4c59fa814cdb29f1eece40a3d8d1bc5b6e5c1bc81e957dfd0695e12d04(v226: &D_0d99b398bfe870de870e843dfb762df7dc59b49ea0c40dbef3738cd581095075) -> D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b { d_2db94b4c59fa814cdb29f1eece40a3d8d1bc5b6e5c1bc81e957dfd0695e12d04(v226) }
pub fn f_4641a0c613562838cd7e2176c788e7df505b3ecc6b80e00a5697c69b5accd219(v227: &D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b) -> D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133 { d_4641a0c613562838cd7e2176c788e7df505b3ecc6b80e00a5697c69b5accd219(v227) }
pub fn f_57b9b1659761cdb4d2d72a9987923c169a0914a13571cccedfcb23ba124c94dc(v228: &D_0d99b398bfe870de870e843dfb762df7dc59b49ea0c40dbef3738cd581095075) -> D_dc3361ea8b26fea23ed6f5a2d95d5e92b002ca290540d5c1281dc07696f3d106 { d_57b9b1659761cdb4d2d72a9987923c169a0914a13571cccedfcb23ba124c94dc(v228) }
pub fn f_8bcdb17785a0076cdfbd2e6b143ee026abd7e674a6ce2728467f6c901d6e204f(v229: &D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b,v230: u64,v231: u64,v232: bool) -> D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e { d_8bcdb17785a0076cdfbd2e6b143ee026abd7e674a6ce2728467f6c901d6e204f(v229,v230,v231,v232) }
pub fn f_9af6cc513f6afd389c27298bfc84fd80538fc67def7854880e20ad87a97608e4(v233: &D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e) -> D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e { d_9af6cc513f6afd389c27298bfc84fd80538fc67def7854880e20ad87a97608e4(v233) }
pub fn f_a4073b19aa606037a988a888e2745fed8c6010fe91f79f623bd40310dc0241d9(v234: &D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b,v235: u64,v236: u64) -> D_39de6ddc13aabfcf805583f41e9bc0c6f7a8e2b2af079099a10d38e5cbf13273 { d_a4073b19aa606037a988a888e2745fed8c6010fe91f79f623bd40310dc0241d9(v234,v235,v236) }
pub fn f_ac3b6e81f1cb305bcad3abee8005d45eb10fadaf314fadbac2323c668600ec15(v237: &D_39de6ddc13aabfcf805583f41e9bc0c6f7a8e2b2af079099a10d38e5cbf13273) -> D_a052624544f6d73ef9de3834cf97708df12875f77020694bf019de88c7808d4c { d_ac3b6e81f1cb305bcad3abee8005d45eb10fadaf314fadbac2323c668600ec15(v237) }
pub fn f_df2634b4709d2f792b0c2fed5e6d2f6cf528c744e218159ad1ad70d6b870f509(v238: &D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133) -> D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b { d_df2634b4709d2f792b0c2fed5e6d2f6cf528c744e218159ad1ad70d6b870f509(v238) }
pub fn f_dfc27dba7b90cad4be737623bfd3a76ce3bbb9ff20150d2691356194af6ae7f6(v239: &D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e) -> D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b { d_dfc27dba7b90cad4be737623bfd3a76ce3bbb9ff20150d2691356194af6ae7f6(v239) }
pub fn f_e9692fea556ee4a80fd8afee120ab334c2aee3d9911e431666bd6da4c6543cb3(v240: &D_39de6ddc13aabfcf805583f41e9bc0c6f7a8e2b2af079099a10d38e5cbf13273) -> D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b { d_e9692fea556ee4a80fd8afee120ab334c2aee3d9911e431666bd6da4c6543cb3(v240) }
pub fn f_f8998f59341d0a922a473b4719ca589d043440d30a996d999d10c6baec92bad4(v241: &D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b,v242: u64,v243: u64,v244: u64,v245: bool,v246: bool,v247: bool,v248: bool) -> D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e { d_f8998f59341d0a922a473b4719ca589d043440d30a996d999d10c6baec92bad4(v241,v242,v243,v244,v245,v246,v247,v248) }
fn q_266d9b32ec61031ac0d5a749b7a40e192e5d3493d2584514f7e57def91d3f9ee(v0:&D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b,v1:u64)->D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f{match v0 { D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b::C0(v2) => { d_f8c4822bc088dcc6a93b8ea4294a9de7164c41efb3bcd36687050f57635970c5(&(match v2.as_ref() { D_96ac90d56efe899a31eb0e2f5a287ae27e49056c48cf0f97878b6a3071500018::C0(v3,v4,v5,v6,v7) => { d_8c3fe32c5aef8938d90d04d94f9ac834ea3e9080e1222005d47fdfa3ac427591(v3.as_ref(),v4.as_ref(),v5.as_ref(),v6.as_ref(),v7.as_ref()) } })) } }}
fn q_a4073b19aa606037a988a888e2745fed8c6010fe91f79f623bd40310dc0241d9(v0:&D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b,v1:u64,v2:u64)->D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d{match v0 { D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b::C0(v3) => { d_ddc7dbae8629d9a12cf7e7a9a908bcae3f9c9444025738902ed6a32f47b803bd(&(match v3.as_ref() { D_96ac90d56efe899a31eb0e2f5a287ae27e49056c48cf0f97878b6a3071500018::C0(v4,v5,v6,v7,v8) => { d_8c3fe32c5aef8938d90d04d94f9ac834ea3e9080e1222005d47fdfa3ac427591(v4.as_ref(),v5.as_ref(),v6.as_ref(),v7.as_ref(),v8.as_ref()) } }),v2) } }}

use serde_json::{Value as Json,json};
mod portable{
//! Shared, representation-independent snapshot codec. This module also ships
//! verbatim in generated applications; it has no AST/evaluator dependency.
use num_bigint::{BigInt, Sign};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::cmp::Ordering;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Schema {
    Unit,
    Bool,
    U32,
    U64,
    I32,
    F32,
    Vector(Box<Schema>, u8),
    Int,
    String,
    Id,
    Record(Vec<(String, Schema)>),
    Enum(Vec<String>),
    List(Box<Schema>),
    Option(Box<Schema>),
    Result(Box<Schema>, Box<Schema>),
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
fn encode_value(
    t: &Schema,
    v: &Value,
    out: &mut Vec<u8>,
    left: &mut usize,
    depth: usize,
    limits: Limits,
) -> R<()> {
    tick(left, depth, limits)?;
    match t {
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
                encode_value(inner, x, out, left, depth + 1, limits)?;
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
                encode_value(inner, x, out, left, depth + 1, limits)?;
            }
        }
        Schema::Option(inner) => {
            if let Ok(x) = tag(v, "Some") {
                out.push(1);
                encode_value(inner, x, out, left, depth + 1, limits)?;
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
                encode_value(a, x, out, left, depth + 1, limits)?;
            } else {
                out.push(1);
                encode_value(b, tag(v, "Err")?, out, left, depth + 1, limits)?;
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
        tick(&mut self.left, depth, self.limits)?;
        Ok(match t {
            Schema::Unit => Value::Null,
            Schema::Bool => match self.byte()? {
                0 => json!(false),
                1 => json!(true),
                _ => return Err("invalid Bool tag".into()),
            },
            Schema::U32 => json!(self.u32()?),
            Schema::U64 => json!(self.u64()?),
            Schema::I32 => json!(self.u32()? as i32),
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
                    .map(|_| self.value(inner, depth + 1))
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
                    obj.insert(n.clone(), self.value(t, depth + 1)?);
                }
                Value::Object(obj)
            }
            Schema::List(t) => {
                let n = self.sequence()?;
                let mut xs = Vec::new();
                for _ in 0..n {
                    xs.push(self.value(t, depth + 1)?);
                }
                Value::Array(xs)
            }
            Schema::Option(t) => match self.byte()? {
                0 => json!({"None":null}),
                1 => json!({"Some":self.value(t,depth+1)?}),
                _ => return Err("invalid Option tag".into()),
            },
            Schema::Result(a, b) => match self.byte()? {
                0 => json!({"Ok":self.value(a,depth+1)?}),
                1 => json!({"Err":self.value(b,depth+1)?}),
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
pub fn encode(layout: &Layout, s: &Logical, limits: Limits) -> R<Vec<u8>> {
    if s.tables.len() != layout.roots.len() {
        return Err("snapshot root count mismatch".into());
    }
    let mut out = Vec::new();
    let mut left = limits.values;
    u64_bytes(&mut out, s.version);
    for (rows, (_, kt, vt)) in s.tables.iter().zip(&layout.roots) {
        if rows.len() > left / 2 {
            return Err("snapshot row limit exceeded".into());
        }
        count(&mut out, rows.len());
        let mut prior = None;
        for (k, v) in rows {
            if let Some(p) = prior {
                if compare(kt, p, k)? != Ordering::Less {
                    return Err("snapshot keys must be strictly ordered".into());
                }
            }
            encode_value(kt, k, &mut out, &mut left, 0, limits)?;
            encode_value(vt, v, &mut out, &mut left, 0, limits)?;
            prior = Some(k);
        }
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
        encode_value(t, &e.value, &mut out, &mut left, 0, limits)?;
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

}
pub use portable::Limits as SnapshotLimits;
fn snapshot_layout()->portable::Layout{portable::Layout{program:[59, 229, 236, 189, 10, 78, 170, 59, 200, 212, 154, 57, 133, 67, 162, 181, 142, 11, 178, 51, 58, 2, 143, 140, 52, 105, 184, 212, 130, 207, 208, 137],schema:[130, 180, 234, 191, 59, 192, 46, 109, 98, 209, 218, 73, 97, 106, 8, 251, 0, 202, 28, 12, 131, 63, 199, 28, 61, 136, 4, 232, 244, 68, 200, 58],roots:vec![
("Rows".into(),portable::Schema::I32,portable::Schema::Record(vec![("value".into(),portable::Schema::U64),("active".into(),portable::Schema::Bool),("visible".into(),portable::Schema::Bool),("selected".into(),portable::Schema::Bool)])),
],events:vec![("seen".into(),portable::Schema::Record(vec![("value".into(),portable::Schema::U64),("active".into(),portable::Schema::Bool),("visible".into(),portable::Schema::Bool),("selected".into(),portable::Schema::Bool)])),
]}}
fn one_tag<'a>(v:&'a Json,_kind:&str)->Result<&'a serde_json::Map<String,Json>,String>{Ok(v.as_object().unwrap())}
fn read_0(v:&Json,d:usize)->Result<bool,String>{Ok(
v.as_bool().unwrap())}
fn write_0(v:&bool,d:usize)->Result<Json,String>{Ok(
json!(v))}
fn read_1(v:&Json,d:usize)->Result<u64,String>{Ok(
v.as_i64().unwrap() as i32 as u32 as u64)}
fn write_1(v:&u64,d:usize)->Result<Json,String>{Ok(
{json!(*v as u32 as i32)})}
fn read_2(v:&Json,d:usize)->Result<u64,String>{Ok(
v.as_u64().unwrap())}
fn write_2(v:&u64,d:usize)->Result<Json,String>{Ok(
json!(v))}
fn read_3(v:&Json,d:usize)->Result<D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c,String>{Ok(
{D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c::C0})}
fn write_3(v:&D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c,d:usize)->Result<Json,String>{Ok(
Json::Null)}
fn read_4(v:&Json,d:usize)->Result<D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f,String>{Ok(
{let xs=v.as_array().unwrap();let mut tail=D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f::C0;for x in xs.iter().rev(){tail=D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f::C1(std::sync::Arc::new(read_6(x,d+1)?),std::sync::Arc::new(tail));}tail})}
fn write_4(v:&D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f,d:usize)->Result<Json,String>{Ok(
{let mut cursor=v;let mut xs=vec![];loop{match cursor{D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f::C0=>break,D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f::C1(x,tail)=>{xs.push(write_6(x,d+1)?);cursor=tail.as_ref();}}}Json::Array(xs)})}
fn read_5(v:&Json,d:usize)->Result<D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b,String>{Ok(
{let text=v.as_str().unwrap();match text{"Error.Failed"=>D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b::C0,_=>unreachable!("caller enum precondition")}})}
fn write_5(v:&D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b,d:usize)->Result<Json,String>{Ok(
match v{D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b::C0=>json!("Error.Failed"),})}
fn read_6(v:&Json,d:usize)->Result<D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9,String>{Ok(
{let xs=v.as_object().unwrap();D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(read_2(xs.get("value").unwrap(),d+1)?,read_0(xs.get("active").unwrap(),d+1)?,read_0(xs.get("visible").unwrap(),d+1)?,read_0(xs.get("selected").unwrap(),d+1)?)})}
fn write_6(v:&D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9,d:usize)->Result<Json,String>{Ok(
{let D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(b0,b1,b2,b3)=v;json!({"value":write_2(&b0,d+1)?,"active":write_0(&b1,d+1)?,"visible":write_0(&b2,d+1)?,"selected":write_0(&b3,d+1)?})})}
fn read_7(v:&Json,d:usize)->Result<D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d,String>{Ok(
{let xs=one_tag(v,"Option")?;if let Some(x)=xs.get("Some"){D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C1(std::sync::Arc::new(read_6(x,d+1)?))}else{D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C0}})}
fn write_7(v:&D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d,d:usize)->Result<Json,String>{Ok(
match v{D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C0=>json!({"None":null}),D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C1(x)=>json!({"Some":write_6(x,d+1)?})})}
fn read_8(v:&Json,d:usize)->Result<D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f,String>{Ok(
{let xs=one_tag(v,"Result")?;if let Some(x)=xs.get("Ok"){D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(std::sync::Arc::new(read_3(x,d+1)?))}else{let x=xs.get("Err").unwrap();D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(std::sync::Arc::new(read_5(x,d+1)?))}})}
fn write_8(v:&D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f,d:usize)->Result<Json,String>{Ok(
match v{D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(x)=>json!({"Ok":write_3(x,d+1)?}),D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(x)=>json!({"Err":write_5(x,d+1)?})})}
fn logical_from_tables(tables:&[Vec<(Json,Json)>])->Result<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133,String>{if tables.len()!=1{return Err("representation table count mismatch".into())}
let rows=&tables[0];let mut root0=D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0;for (key,row) in rows.iter().rev(){root0=D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(read_1(key,0)?,std::sync::Arc::new(read_6(row,0)?),std::sync::Arc::new(root0));}
Ok(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(root0)))}
fn logical_tables(state:&D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133)->Result<Vec<Vec<(Json,Json)>>,String>{let D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(r0)=state;
let mut rows0=vec![];let mut cursor=r0.as_ref();loop{match cursor{D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0=>break,D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(key,value,tail)=>{rows0.push((write_1(key,0)?,write_6(value,0)?));cursor=tail.as_ref();}}}
Ok(vec![rows0])}
fn logical_events(events:&D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a)->Result<Vec<(usize,Json)>,String>{let mut cursor=events;let mut out=vec![];loop{match cursor{D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0=>break,D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C1(event,tail)=>{let value=match event.as_ref(){
D_de11c8a29cbacab71906b2cb8d95465f9945c4af2d8ce313218341c19c119ef1::C0(value)=>(0,write_6(value,0)?),
};out.push(value);cursor=tail.as_ref();}}}Ok(out)}
pub use portable::Event;
pub struct Outcome<T>{pub result:T,pub committed:bool,pub version:u64,pub events:Vec<Event>}
pub struct OutcomeView<'a,T>{pub result:T,pub committed:bool,pub version:u64,pub events:&'a[Event]}
impl<T> OutcomeView<'_,T>{pub fn into_owned(self)->Outcome<T>{Outcome{result:self.result,committed:self.committed,version:self.version,events:self.events.to_vec()}}}
pub struct State{physical:D_0b8d5e8471bcad8e837df019bd518ef261197681c40291eea11aeab0be4c085b,version:u64,outbox:Vec<portable::Event>,layout:portable::Layout}
impl State{
// CALLER CONTRACT: arguments must have the declared types and canonical values.
// No runtime type validation. Malformed input may panic, trap or corrupt state.
pub fn new()->Result<Self,String>{let logical=D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0));Ok(Self{physical:f_df2634b4709d2f792b0c2fed5e6d2f6cf528c744e218159ad1ad70d6b870f509(&logical),version:0,outbox:vec![],layout:snapshot_layout()})}
pub fn restore(bytes:&[u8])->Result<Self,String>{let layout=snapshot_layout();let saved=portable::decode(&layout,bytes,SnapshotLimits::default())?;let logical=logical_from_tables(&saved.tables)?;Ok(Self{physical:f_df2634b4709d2f792b0c2fed5e6d2f6cf528c744e218159ad1ad70d6b870f509(&logical),version:saved.version,outbox:saved.outbox,layout})}
pub fn checkpoint(&self)->Result<Vec<u8>,String>{let logical=f_4641a0c613562838cd7e2176c788e7df505b3ecc6b80e00a5697c69b5accd219(&(self.physical));portable::encode(&self.layout,&portable::Logical{version:self.version,tables:logical_tables(&logical)?,outbox:self.outbox.clone()},SnapshotLimits::default())}
pub fn version(&self)->u64{self.version}
pub fn outbox_json(&self)->Json{Json::Array(self.outbox.iter().map(|e|json!({"commit":e.commit,"position":e.position,"channel":self.layout.events[e.channel].0,"value":e.value})).collect())}
pub fn acknowledge_through(&mut self,commit:u64,position:u64){self.outbox.retain(|e|(e.commit,e.position)>(commit,position));}
pub fn query_get(&self,a0:u64)->D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d{q_a4073b19aa606037a988a888e2745fed8c6010fe91f79f623bd40310dc0241d9(&(self.physical),self.version,a0)}
pub fn query_rows(&self,)->D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f{q_266d9b32ec61031ac0d5a749b7a40e192e5d3493d2584514f7e57def91d3f9ee(&(self.physical),self.version)}
pub fn invoke_view_put(&mut self,a0:u64,a1:u64,a2:bool,a3:bool,a4:bool,a5:bool)->Result<OutcomeView<'_,D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>,String>{
let executed=f_f8998f59341d0a922a473b4719ca589d043440d30a996d999d10c6baec92bad4(&(self.physical),self.version,a0,a1,a2,a3,a4,a5);let observed=f_9af6cc513f6afd389c27298bfc84fd80538fc67def7854880e20ad87a97608e4(&(executed));let next=f_dfc27dba7b90cad4be737623bfd3a76ce3bbb9ff20150d2691356194af6ae7f6(&(executed));
let(result,committed,version,events)=match &observed{D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(reply,committed,version,_,events)=>(reply.as_ref().clone(),*committed,*version,events),D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(..)=>return Err("commit sequence exhausted".into())};let start=self.outbox.len();let staged=logical_events(events)?;if committed{self.outbox.try_reserve(staged.len()).map_err(|_|"outbox allocation failure")?;for(position,(channel,value))in staged.into_iter().enumerate(){self.outbox.push(Event{commit:version,position:position as u64,channel,value});}}self.physical=next;self.version=version;Ok(OutcomeView{result,committed,version,events:&self.outbox[start..]})}
pub fn invoke_view_erase(&mut self,a0:u64,a1:bool)->Result<OutcomeView<'_,D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>,String>{
let executed=f_8bcdb17785a0076cdfbd2e6b143ee026abd7e674a6ce2728467f6c901d6e204f(&(self.physical),self.version,a0,a1);let observed=f_9af6cc513f6afd389c27298bfc84fd80538fc67def7854880e20ad87a97608e4(&(executed));let next=f_dfc27dba7b90cad4be737623bfd3a76ce3bbb9ff20150d2691356194af6ae7f6(&(executed));
let(result,committed,version,events)=match &observed{D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(reply,committed,version,_,events)=>(reply.as_ref().clone(),*committed,*version,events),D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(..)=>return Err("commit sequence exhausted".into())};let start=self.outbox.len();let staged=logical_events(events)?;if committed{self.outbox.try_reserve(staged.len()).map_err(|_|"outbox allocation failure")?;for(position,(channel,value))in staged.into_iter().enumerate(){self.outbox.push(Event{commit:version,position:position as u64,channel,value});}}self.physical=next;self.version=version;Ok(OutcomeView{result,committed,version,events:&self.outbox[start..]})}
pub fn invoke_view_get(&mut self,a0:u64)->Result<OutcomeView<'_,D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d>,String>{
let result=q_a4073b19aa606037a988a888e2745fed8c6010fe91f79f623bd40310dc0241d9(&(self.physical),self.version,a0);Ok(OutcomeView{result,committed:false,version:self.version,events:&self.outbox[self.outbox.len()..]})}
pub fn invoke_view_rows(&mut self,)->Result<OutcomeView<'_,D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f>,String>{
let result=q_266d9b32ec61031ac0d5a749b7a40e192e5d3493d2584514f7e57def91d3f9ee(&(self.physical),self.version);Ok(OutcomeView{result,committed:false,version:self.version,events:&self.outbox[self.outbox.len()..]})}
pub fn invoke_json(&mut self,name:&str,args:&Json)->Result<Json,String>{match name{
"put"=>{let xs=args.as_array().unwrap();
let a0=read_1(&xs[0],0)?;
let a1=read_2(&xs[1],0)?;
let a2=read_0(&xs[2],0)?;
let a3=read_0(&xs[3],0)?;
let a4=read_0(&xs[4],0)?;
let a5=read_0(&xs[5],0)?;
let executed=f_f8998f59341d0a922a473b4719ca589d043440d30a996d999d10c6baec92bad4(&(self.physical),self.version,a0,a1,a2,a3,a4,a5);
let observed=f_9af6cc513f6afd389c27298bfc84fd80538fc67def7854880e20ad87a97608e4(&(executed));let next=f_dfc27dba7b90cad4be737623bfd3a76ce3bbb9ff20150d2691356194af6ae7f6(&(executed));let(reply,committed,version,events)=match &observed{D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(reply,committed,version,_,events)=>(reply,*committed,*version,events),D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(..)=>return Err("commit sequence exhausted".into())};let result=write_8(reply,0)?;let staged=logical_events(events)?;let mut published=vec![];
if committed{let channels:&[&str]=&["seen"];for(position,(channel,value))in staged.into_iter().enumerate(){published.push(json!({"commit":version,"position":position as u64,"channel":channels[channel],"value":value}));self.outbox.push(portable::Event{commit:version,position:position as u64,channel,value});}}self.physical=next;self.version=version;Ok(json!({"result":result,"committed":committed,"version":version,"events":published}))},
"erase"=>{let xs=args.as_array().unwrap();
let a0=read_1(&xs[0],0)?;
let a1=read_0(&xs[1],0)?;
let executed=f_8bcdb17785a0076cdfbd2e6b143ee026abd7e674a6ce2728467f6c901d6e204f(&(self.physical),self.version,a0,a1);
let observed=f_9af6cc513f6afd389c27298bfc84fd80538fc67def7854880e20ad87a97608e4(&(executed));let next=f_dfc27dba7b90cad4be737623bfd3a76ce3bbb9ff20150d2691356194af6ae7f6(&(executed));let(reply,committed,version,events)=match &observed{D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(reply,committed,version,_,events)=>(reply,*committed,*version,events),D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(..)=>return Err("commit sequence exhausted".into())};let result=write_8(reply,0)?;let staged=logical_events(events)?;let mut published=vec![];
if committed{let channels:&[&str]=&["seen"];for(position,(channel,value))in staged.into_iter().enumerate(){published.push(json!({"commit":version,"position":position as u64,"channel":channels[channel],"value":value}));self.outbox.push(portable::Event{commit:version,position:position as u64,channel,value});}}self.physical=next;self.version=version;Ok(json!({"result":result,"committed":committed,"version":version,"events":published}))},
"get"=>{let xs=args.as_array().unwrap();
let a0=read_1(&xs[0],0)?;
let reply=q_a4073b19aa606037a988a888e2745fed8c6010fe91f79f623bd40310dc0241d9(&(self.physical),self.version,a0);let result=write_7(&reply,0)?;Ok(json!({"result":result,"committed":false,"version":self.version,"events":[]}))},
"rows"=>{let xs=args.as_array().unwrap();
let reply=q_266d9b32ec61031ac0d5a749b7a40e192e5d3493d2584514f7e57def91d3f9ee(&(self.physical),self.version);let result=write_4(&reply,0)?;Ok(json!({"result":result,"committed":false,"version":self.version,"events":[]}))},
_=>Err(format!("unknown action {name}"))}}}
