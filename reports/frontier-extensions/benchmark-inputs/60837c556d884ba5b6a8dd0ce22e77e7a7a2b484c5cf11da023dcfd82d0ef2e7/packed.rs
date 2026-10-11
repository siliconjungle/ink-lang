// ink-definition-rust-v1: checked bodies; Rust/backend are trusted.
#![allow(non_camel_case_types, non_snake_case, non_upper_case_globals, dead_code, unused_variables, unused_parens, unused_unsafe, improper_ctypes_definitions)]
// Physical refinement of Nil/Cons spines. All words remain exact.
pub trait PackedCell: Clone + Eq + std::fmt::Debug {
    type Block: Clone + std::fmt::Debug;
    const CAPACITY: usize;
    fn empty() -> Self::Block;
    fn at(block: &Self::Block, index: usize) -> Self;
    fn truncate(block: &mut Self::Block, length: usize);
    fn push(block: &mut Self::Block, index: usize, value: Self);
}
#[derive(Clone, Debug)]
pub enum WordBlock {
    Narrow(Vec<u32>),
    Wide(Vec<u64>),
}
impl PackedCell for u64 {
    type Block = WordBlock;
    const CAPACITY: usize = 256;
    fn empty() -> WordBlock {
        WordBlock::Narrow(Vec::new())
    }
    fn at(block: &WordBlock, index: usize) -> Self {
        match block {
            WordBlock::Narrow(xs) => xs[index] as u64,
            WordBlock::Wide(xs) => xs[index],
        }
    }
    fn truncate(block: &mut WordBlock, length: usize) {
        match block {
            WordBlock::Narrow(xs) => xs.truncate(length),
            WordBlock::Wide(xs) => xs.truncate(length),
        }
    }
    fn push(block: &mut WordBlock, _index: usize, value: Self) {
        match block {
            WordBlock::Narrow(xs) if value <= u32::MAX as u64 => xs.push(value as u32),
            WordBlock::Narrow(xs) => {
                let mut wide = std::mem::take(xs)
                    .into_iter()
                    .map(u64::from)
                    .collect::<Vec<_>>();
                wide.push(value);
                *block = WordBlock::Wide(wide);
            }
            WordBlock::Wide(xs) => xs.push(value),
        }
    }
}
impl PackedCell for bool {
    type Block = u64;
    const CAPACITY: usize = 64;
    fn empty() -> u64 {
        0
    }
    fn at(block: &u64, index: usize) -> Self {
        block & (1u64 << index) != 0
    }
    fn truncate(block: &mut u64, length: usize) {
        if length < 64 {
            *block &= (1u64 << length) - 1;
        }
    }
    fn push(block: &mut u64, index: usize, value: Self) {
        if value {
            *block |= 1u64 << index;
        }
    }
}
// Generic data cells retain their existing immutable owners. The spine packs
// those handles contiguously; values are neither flattened nor reinterpreted.
impl<T: Eq + std::fmt::Debug> PackedCell for std::sync::Arc<T> {
    type Block = Vec<Self>;
    const CAPACITY: usize = 128;
    fn empty() -> Self::Block { Vec::new() }
    fn at(block: &Self::Block, index: usize) -> Self { block[index].clone() }
    fn truncate(block: &mut Self::Block, length: usize) { block.truncate(length); }
    fn push(block: &mut Self::Block, _index: usize, value: Self) { block.push(value); }
}
#[derive(Debug)]
pub struct PackedSpine<Tag, Cell: PackedCell> {
    chunk: Option<std::sync::Arc<PackedChunk<Tag, Cell>>>,
    end: usize,
    length: usize,
    tag: std::marker::PhantomData<Tag>,
}
#[derive(Debug)]
struct PackedChunk<Tag, Cell: PackedCell> {
    block: Cell::Block,
    tail: PackedSpine<Tag, Cell>,
}
pub struct PackedView<'a, Tag, Cell: PackedCell> {
    chunk: Option<&'a std::sync::Arc<PackedChunk<Tag, Cell>>>,
    end: usize,
    length: usize,
}
impl<Tag, Cell: PackedCell> Copy for PackedView<'_, Tag, Cell> {}
impl<Tag, Cell: PackedCell> Clone for PackedView<'_, Tag, Cell> {
    fn clone(&self) -> Self {
        *self
    }
}
impl<'a, Tag, Cell: PackedCell> PackedView<'a, Tag, Cell> {
    pub fn view(self) -> Option<(Cell, Self)> {
        let chunk = self.chunk?;
        let head = Cell::at(&chunk.block, self.end - 1);
        let tail = if self.end == 1 {
            chunk.tail.as_view()
        } else {
            Self {
                chunk: self.chunk,
                end: self.end - 1,
                length: self.length - 1,
            }
        };
        Some((head, tail))
    }
    pub fn to_owned(self) -> PackedSpine<Tag, Cell> {
        PackedSpine {
            chunk: self.chunk.cloned(),
            end: self.end,
            length: self.length,
            tag: std::marker::PhantomData,
        }
    }
    pub fn cells(self) -> impl Iterator<Item = Cell> + 'a {
        let mut cursor = self;
        std::iter::from_fn(move || {
            let (head, tail) = cursor.view()?;
            cursor = tail;
            Some(head)
        })
    }
}
impl<Tag, Cell: PackedCell> Clone for PackedSpine<Tag, Cell> {
    fn clone(&self) -> Self {
        Self {
            chunk: self.chunk.clone(),
            end: self.end,
            length: self.length,
            tag: std::marker::PhantomData,
        }
    }
}
impl<Tag, Cell: PackedCell> Clone for PackedChunk<Tag, Cell> {
    fn clone(&self) -> Self {
        Self {
            block: self.block.clone(),
            tail: self.tail.clone(),
        }
    }
}
impl<Tag, Cell: PackedCell> PackedSpine<Tag, Cell> {
    pub const C0: Self = Self {
        chunk: None,
        end: 0,
        length: 0,
        tag: std::marker::PhantomData,
    };
    pub fn C1(value: Cell, tail: std::sync::Arc<Self>) -> Self {
        std::sync::Arc::try_unwrap(tail)
            .unwrap_or_else(|tail| tail.as_ref().clone())
            .prepend(value)
    }
    pub fn prepend(mut self, value: Cell) -> Self {
        let length = self
            .length
            .checked_add(1)
            .expect("packed spine length overflow");
        if self.end < Cell::CAPACITY && self.chunk.is_some() {
            let chunk = std::sync::Arc::make_mut(self.chunk.as_mut().unwrap());
            // A borrowed suffix can hide a later prefix in the same chunk.
            // Truncate that prefix before appending; never expose stale cells.
            Cell::truncate(&mut chunk.block, self.end);
            Cell::push(&mut chunk.block, self.end, value);
            self.end += 1;
            self.length = length;
            self
        } else {
            let mut block = Cell::empty();
            Cell::push(&mut block, 0, value);
            Self {
                chunk: Some(std::sync::Arc::new(PackedChunk { block, tail: self })),
                end: 1,
                length,
                tag: std::marker::PhantomData,
            }
        }
    }
    pub fn view(&self) -> Option<(Cell, Self)> {
        let chunk = self.chunk.as_ref()?;
        let value = Cell::at(&chunk.block, self.end - 1);
        let tail = if self.end == 1 {
            chunk.tail.clone()
        } else {
            Self {
                chunk: self.chunk.clone(),
                end: self.end - 1,
                length: self.length - 1,
                tag: std::marker::PhantomData,
            }
        };
        Some((value, tail))
    }
    pub fn len(&self) -> usize {
        self.length
    }
    pub fn is_empty(&self) -> bool {
        self.length == 0
    }
    pub fn as_view(&self) -> PackedView<'_, Tag, Cell> {
        PackedView {
            chunk: self.chunk.as_ref(),
            end: self.end,
            length: self.length,
        }
    }
    pub fn cells(&self) -> impl Iterator<Item = Cell> + '_ {
        self.as_view().cells()
    }
}
impl<Tag, Cell: PackedCell> PartialEq for PackedSpine<Tag, Cell> {
    fn eq(&self, other: &Self) -> bool {
        self.length == other.length && self.cells().eq(other.cells())
    }
}
impl<Tag, Cell: PackedCell> Eq for PackedSpine<Tag, Cell> {}
impl<Tag, Cell: PackedCell> Drop for PackedSpine<Tag, Cell> {
    fn drop(&mut self) {
        let mut pending = self.chunk.take();
        while let Some(chunk) = pending {
            match std::sync::Arc::try_unwrap(chunk) {
                Ok(mut chunk) => pending = chunk.tail.chunk.take(),
                Err(_) => break,
            }
        }
    }
}
fn d_0363ae53f2a88d1cec1c8435c8eb96359e1a81dd2a611bd3447da3d33c1a4ad6(v0: &D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477) -> D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121 { match v0 { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(v1,v2) => { (v1.as_ref()).clone() } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483 { C0(std::sync::Arc<D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b>,std::sync::Arc<D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b>,std::sync::Arc<D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b>,std::sync::Arc<D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b>,std::sync::Arc<D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b>) }
fn d_0b7f12fa5b72a7a622e9bd28473b6aaf1b6f3daa365faa2862a1e97a4336a191(v3: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v4: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v5: u64) -> D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b { match (v3).view() { None=>{D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b::C0},Some((v7,v8))=>{match (v4).view() { None=>{D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b::C0},Some((v10,v11))=>{if ((v5) == (v7)) { d_0b7f12fa5b72a7a622e9bd28473b6aaf1b6f3daa365faa2862a1e97a4336a191(v8,v11,v5) } else { (d_0b7f12fa5b72a7a622e9bd28473b6aaf1b6f3daa365faa2862a1e97a4336a191(v8,v11,v5)).prepend(v10) }} }} } }
fn d_0cbe37db53267cd70a093f8f57f21f62e28993a9a42982aceeb03f788c76b120(v12: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v13: PackedView<'_,PackedTag_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b,bool>,v14: u64,v15: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b { match (v12).view() { None=>{D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b::C0},Some((v17,v18))=>{match (v13).view() { None=>{D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b::C0},Some((v20,v21))=>{(d_0cbe37db53267cd70a093f8f57f21f62e28993a9a42982aceeb03f788c76b120(v18,v21,v14,v15)).prepend(if ((v14) == (v17)) { d_908d5668edf0fb07e4047581620a91d4a46c61d61bc51d086b8606279d6f97bd(v15) } else { v20 })} }} } }
fn d_0d626cfc0525facef0dc8bceab44736bdb5b53f3ec765e692745276b3945b4dc(v22: &D_71fa76d563f831b1e42072b10a315e93c21693af121ed0d5b601448747a601c0) -> D_dc3361ea8b26fea23ed6f5a2d95d5e92b002ca290540d5c1281dc07696f3d106 { match v22 { D_71fa76d563f831b1e42072b10a315e93c21693af121ed0d5b601448747a601c0::C0(v23,v24) => { (v24.as_ref()).clone() } } }
fn d_0fb64289d1f6661470be998ca35ec8b541347936bfc9312c2c16a656c7392894(v25: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v26: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v27: u64,v28: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b { match (v25).view() { None=>{(D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b::C0).prepend(d_291fbfdaae211817608b223c15b933430949c800fd79b472dbedaa53d497e96e(v28))},Some((v30,v31))=>{match (v26).view() { None=>{D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b::C0},Some((v33,v34))=>{if (((((v27).wrapping_add(2147483648u64)) & (4294967295u64))) < ((((v30).wrapping_add(2147483648u64)) & (4294967295u64)))) { ((v26).to_owned()).prepend(d_291fbfdaae211817608b223c15b933430949c800fd79b472dbedaa53d497e96e(v28)) } else { (d_0fb64289d1f6661470be998ca35ec8b541347936bfc9312c2c16a656c7392894(v31,v34,v27,v28)).prepend(v33) }} }} } }
fn d_12ef40612e626543ae74604a2f7811f4f41132927f0c806d9aa1ad15d7548624(v35: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333) -> D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b { match v35 { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 => { D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b::C0 },D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v37,v38,v39) => { (d_12ef40612e626543ae74604a2f7811f4f41132927f0c806d9aa1ad15d7548624(v39.as_ref())).prepend(d_ecccd5b0a338b6d5532a9789fe240aad158c17a6cd9f16a40a8372df40021f7a(v38.as_ref())) } } }
fn d_159483f57ba13d17b7b0c1575f3f23aa71405fe7dd285e980ee4d8a88e93a0f4(v40: &D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477) -> D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e { match v40 { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(v41,v42) => { (v42.as_ref()).clone() } } }
fn d_19e9fbeade7bbfb5155160590618a322426ee4548dcb2473a37c06ba7ad608e7(v43: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v44: PackedView<'_,PackedTag_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b,bool>,v45: u64,v46: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b { match (v43).view() { None=>{D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b::C0},Some((v48,v49))=>{match (v44).view() { None=>{D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b::C0},Some((v51,v52))=>{(d_19e9fbeade7bbfb5155160590618a322426ee4548dcb2473a37c06ba7ad608e7(v49,v52,v45,v46)).prepend(if ((v45) == (v48)) { d_e5d2caa3fa6434427674c03f279cee44adb1fff012bd86df3272be166654d7b5(v46) } else { v51 })} }} } }
fn d_1a538538c441c602008b3d7f07d83a1bc7dc915b3161f6e6ed39ba9b47b700d4(v53: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333) -> D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b { match v53 { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 => { D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b::C0 },D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v55,v56,v57) => { (d_1a538538c441c602008b3d7f07d83a1bc7dc915b3161f6e6ed39ba9b47b700d4(v57.as_ref())).prepend(d_e5d2caa3fa6434427674c03f279cee44adb1fff012bd86df3272be166654d7b5(v56.as_ref())) } } }
fn d_2423e83bcb3cd46f0d6d303355a32b60e69e80ccc1d71a401d83648dbd4a29fb(v58: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v59: u64) -> D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b { match (v58).view() { None=>{D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b::C0},Some((v61,v62))=>{if ((v59) == (v61)) { d_2423e83bcb3cd46f0d6d303355a32b60e69e80ccc1d71a401d83648dbd4a29fb(v62,v59) } else { (d_2423e83bcb3cd46f0d6d303355a32b60e69e80ccc1d71a401d83648dbd4a29fb(v62,v59)).prepend(v61) }} } }
fn d_291fbfdaae211817608b223c15b933430949c800fd79b472dbedaa53d497e96e(v63: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> u64 { match v63 { D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v64,v65,v66,v67) => { *v64 } } }
fn d_2a502ffe064dea724d677b60bd84b018241a4f9f1c696700da059e591cc8deb7(v68: &D_47bf6b1c0fca360454f3ee60d2dbdf7bc1af7ca79379a2fe955bdb56727952e5) -> D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121 { match v68 { D_47bf6b1c0fca360454f3ee60d2dbdf7bc1af7ca79379a2fe955bdb56727952e5::C0(v69,v70) => { (v69.as_ref()).clone() } } }
fn d_2f78e31f966f3e212176746ed5811b56d3a180ef9dfa49a600e9877fb3d093c7(v71: &D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121,v72: u64,v73: u64,v74: bool) -> D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477 { match v71 { D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(v75) => { if v74 { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v75))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::clone({static v77:std::sync::OnceLock<std::sync::Arc<D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>>=std::sync::OnceLock::new();v77.get_or_init(||std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(std::sync::Arc::clone({static v76:std::sync::OnceLock<std::sync::Arc<D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b>>=std::sync::OnceLock::new();v76.get_or_init(||std::sync::Arc::new(D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b::C0))}))))}),false,v72,std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_ec573a8973ea47f6961463abe806ead27f879847e77c9c1ad957c08091caa5ee(v75.as_ref())))),std::sync::Arc::clone({static v78:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v78.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})))) } else { if ((v72) == (18446744073709551615u64)) { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v75))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(1u64,v72,std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_ec573a8973ea47f6961463abe806ead27f879847e77c9c1ad957c08091caa5ee(v75.as_ref()))))))) } else { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::new(d_bf8de1787a96aa6fd62a40eb37ab8d58c2925f85bed3e694ed7dd38cd088848f(v75.as_ref(),v73)))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::clone({static v80:std::sync::OnceLock<std::sync::Arc<D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>>=std::sync::OnceLock::new();v80.get_or_init(||std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(std::sync::Arc::clone({static v79:std::sync::OnceLock<std::sync::Arc<D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c>>=std::sync::OnceLock::new();v79.get_or_init(||std::sync::Arc::new(D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c::C0))}))))}),true,(v72).wrapping_add(1u64),std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_ec573a8973ea47f6961463abe806ead27f879847e77c9c1ad957c08091caa5ee(&(d_bf8de1787a96aa6fd62a40eb37ab8d58c2925f85bed3e694ed7dd38cd088848f(v75.as_ref(),v73)))))),std::sync::Arc::clone({static v81:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v81.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})))) } } } } }
fn d_349161a6c81439bf474d684707aa3b9eb181204e5fa70221d475c1e3c088c85d(v82: &D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483,v83: u64,v84: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483 { match v82 { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(v85,v86,v87,v88,v89) => { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(std::sync::Arc::new(d_a9666a28fa617521e6ff199bbbe6d993457e4074931a63cd0669646b53b904d1((v85.as_ref()).as_view(),v83,v84)),std::sync::Arc::new(d_0fb64289d1f6661470be998ca35ec8b541347936bfc9312c2c16a656c7392894((v85.as_ref()).as_view(),(v86.as_ref()).as_view(),v83,v84)),std::sync::Arc::new(d_c1b10509eb122c9f1c3d8eb97475cdbb648a10c1969026c83e4072f26f006f73((v85.as_ref()).as_view(),(v87.as_ref()).as_view(),v83,v84)),std::sync::Arc::new(d_a3b20cc892954abbd34ee0d0187d31cbc5df40e49e6a927ac8c5b3049475d00e((v85.as_ref()).as_view(),(v88.as_ref()).as_view(),v83,v84)),std::sync::Arc::new(d_af604cd7b510ebc222996f4d7c9e3ae273bc0ce8e71aa75ed96d804e149f0709((v85.as_ref()).as_view(),(v89.as_ref()).as_view(),v83,v84))) } } }
fn d_36dbd7184484454d3dfb846c5f795216a960aacd56efff71562101af88033af9(v90: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v91: u64,v92: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b { match (v90).view() { None=>{D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b::C0},Some((v94,v95))=>{(d_36dbd7184484454d3dfb846c5f795216a960aacd56efff71562101af88033af9(v95,v91,v92)).prepend(v94)} } }
fn d_37cdd86a2a09901cbe6075e2877953d33fd4b30a9d5b5a97e4886f779913fda9(v96: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v97: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v98: PackedView<'_,PackedTag_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b,bool>,v99: PackedView<'_,PackedTag_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b,bool>,v100: PackedView<'_,PackedTag_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b,bool>) -> D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333 { match (v96).view() { None=>{D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0},Some((v102,v103))=>{match (v97).view() { None=>{D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0},Some((v105,v106))=>{match (v98).view() { None=>{D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0},Some((v108,v109))=>{match (v99).view() { None=>{D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0},Some((v111,v112))=>{match (v100).view() { None=>{D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0},Some((v114,v115))=>{D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v102,std::sync::Arc::new(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v105,v108,v111,v114)),std::sync::Arc::new(d_37cdd86a2a09901cbe6075e2877953d33fd4b30a9d5b5a97e4886f779913fda9(v103,v106,v109,v112,v115)))} }} }} }} }} } }
fn d_38e1378ce743f5afd1abd72bf26c017ed1f3e4214e5f2451f30de3b2b1cf45fa(v116: &D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483,v117: u64,v118: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483 { match v116 { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(v119,v120,v121,v122,v123) => { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(std::sync::Arc::new(d_36dbd7184484454d3dfb846c5f795216a960aacd56efff71562101af88033af9((v119.as_ref()).as_view(),v117,v118)),std::sync::Arc::new(d_9f0e58906dc44c32c6f8e19c4ddb6fb11e500394deecc57b9f913a1d42f73103((v119.as_ref()).as_view(),(v120.as_ref()).as_view(),v117,v118)),std::sync::Arc::new(d_7dc7e1bd3f8d6e18cf6936407ca1e04fdf5d32960c28f6cc2c3dec78284739a9((v119.as_ref()).as_view(),(v121.as_ref()).as_view(),v117,v118)),std::sync::Arc::new(d_0cbe37db53267cd70a093f8f57f21f62e28993a9a42982aceeb03f788c76b120((v119.as_ref()).as_view(),(v122.as_ref()).as_view(),v117,v118)),std::sync::Arc::new(d_19e9fbeade7bbfb5155160590618a322426ee4548dcb2473a37c06ba7ad608e7((v119.as_ref()).as_view(),(v123.as_ref()).as_view(),v117,v118))) } } }
fn d_41b0e6ce55ebb0c1153e88f9d5f90a1d34f9cde64409877011513c23f6fd755c(v124: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333) -> D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b { match v124 { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 => { D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b::C0 },D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v126,v127,v128) => { (d_41b0e6ce55ebb0c1153e88f9d5f90a1d34f9cde64409877011513c23f6fd755c(v128.as_ref())).prepend(*v126) } } }
fn d_4228a0d8adcabdc1dd98caf6489802b4a0d26b37f56c20cf7b6ebe460516b8d5(v129: &D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133) -> D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121 { match v129 { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(v130) => { D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::new(d_d0f8a88ab8855003228b349f61fe41ce7349ac395436b0036ac1d6c510dc7a17(v130.as_ref()))) } } }
#[derive(Debug)]pub struct PackedTag_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f;
pub type D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f=PackedSpine<PackedTag_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f,std::sync::Arc<D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9>>;
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_47bf6b1c0fca360454f3ee60d2dbdf7bc1af7ca79379a2fe955bdb56727952e5 { C0(std::sync::Arc<D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121>,std::sync::Arc<D_a052624544f6d73ef9de3834cf97708df12875f77020694bf019de88c7808d4c>) }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477 { C0(std::sync::Arc<D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121>,std::sync::Arc<D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e>) }
fn d_5c60cc928c7eef579a12aa93ab631d40adf8e36bf6187fdb6a0ff030b5f57e01(v131: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v132: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v133: PackedView<'_,PackedTag_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b,bool>,v134: PackedView<'_,PackedTag_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b,bool>,v135: PackedView<'_,PackedTag_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b,bool>,v136: u64) -> D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d { match (v131).view() { None=>{D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C0},Some((v138,v139))=>{match (v132).view() { None=>{D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C0},Some((v141,v142))=>{match (v133).view() { None=>{D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C0},Some((v144,v145))=>{match (v134).view() { None=>{D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C0},Some((v147,v148))=>{match (v135).view() { None=>{D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C0},Some((v150,v151))=>{if ((v136) == (v138)) { D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C1(std::sync::Arc::new(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v141,v144,v147,v150))) } else { d_5c60cc928c7eef579a12aa93ab631d40adf8e36bf6187fdb6a0ff030b5f57e01(v139,v142,v145,v148,v151,v136) }} }} }} }} }} } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e { C0(std::sync::Arc<D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>,bool,u64,std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>,std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>),C1(u64,u64,std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>) }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9 { C0(u64,bool,bool,bool) }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_71fa76d563f831b1e42072b10a315e93c21693af121ed0d5b601448747a601c0 { C0(std::sync::Arc<D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121>,std::sync::Arc<D_dc3361ea8b26fea23ed6f5a2d95d5e92b002ca290540d5c1281dc07696f3d106>) }
fn d_7dc7e1bd3f8d6e18cf6936407ca1e04fdf5d32960c28f6cc2c3dec78284739a9(v152: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v153: PackedView<'_,PackedTag_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b,bool>,v154: u64,v155: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b { match (v152).view() { None=>{D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b::C0},Some((v157,v158))=>{match (v153).view() { None=>{D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b::C0},Some((v160,v161))=>{(d_7dc7e1bd3f8d6e18cf6936407ca1e04fdf5d32960c28f6cc2c3dec78284739a9(v158,v161,v154,v155)).prepend(if ((v154) == (v157)) { d_ecccd5b0a338b6d5532a9789fe240aad158c17a6cd9f16a40a8372df40021f7a(v155) } else { v160 })} }} } }
#[derive(Debug)]pub struct PackedTag_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b;
pub type D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b=PackedSpine<PackedTag_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b,bool>;
fn d_908d5668edf0fb07e4047581620a91d4a46c61d61bc51d086b8606279d6f97bd(v162: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> bool { match v162 { D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v163,v164,v165,v166) => { *v165 } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f { C0(std::sync::Arc<D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c>),C1(std::sync::Arc<D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b>) }
fn d_9643a9fe5f1673d2a10826b365e5584c60556fb1c35d52dd406294507af24d62(v167: &D_47bf6b1c0fca360454f3ee60d2dbdf7bc1af7ca79379a2fe955bdb56727952e5) -> D_a052624544f6d73ef9de3834cf97708df12875f77020694bf019de88c7808d4c { match v167 { D_47bf6b1c0fca360454f3ee60d2dbdf7bc1af7ca79379a2fe955bdb56727952e5::C0(v168,v169) => { (v169.as_ref()).clone() } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d { C0,C1(std::sync::Arc<D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9>) }
fn d_9f0e58906dc44c32c6f8e19c4ddb6fb11e500394deecc57b9f913a1d42f73103(v170: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v171: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v172: u64,v173: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b { match (v170).view() { None=>{D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b::C0},Some((v175,v176))=>{match (v171).view() { None=>{D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b::C0},Some((v178,v179))=>{(d_9f0e58906dc44c32c6f8e19c4ddb6fb11e500394deecc57b9f913a1d42f73103(v176,v179,v172,v173)).prepend(if ((v172) == (v175)) { d_291fbfdaae211817608b223c15b933430949c800fd79b472dbedaa53d497e96e(v173) } else { v178 })} }} } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_a052624544f6d73ef9de3834cf97708df12875f77020694bf019de88c7808d4c { C0(std::sync::Arc<D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d>,bool,u64,std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>,std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>),C1(u64,u64,std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>) }
fn d_a3b20cc892954abbd34ee0d0187d31cbc5df40e49e6a927ac8c5b3049475d00e(v180: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v181: PackedView<'_,PackedTag_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b,bool>,v182: u64,v183: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b { match (v180).view() { None=>{(D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b::C0).prepend(d_908d5668edf0fb07e4047581620a91d4a46c61d61bc51d086b8606279d6f97bd(v183))},Some((v185,v186))=>{match (v181).view() { None=>{D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b::C0},Some((v188,v189))=>{if (((((v182).wrapping_add(2147483648u64)) & (4294967295u64))) < ((((v185).wrapping_add(2147483648u64)) & (4294967295u64)))) { ((v181).to_owned()).prepend(d_908d5668edf0fb07e4047581620a91d4a46c61d61bc51d086b8606279d6f97bd(v183)) } else { (d_a3b20cc892954abbd34ee0d0187d31cbc5df40e49e6a927ac8c5b3049475d00e(v186,v189,v182,v183)).prepend(v188) }} }} } }
fn d_a9666a28fa617521e6ff199bbbe6d993457e4074931a63cd0669646b53b904d1(v190: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v191: u64,v192: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b { match (v190).view() { None=>{(D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b::C0).prepend(v191)},Some((v194,v195))=>{if (((((v191).wrapping_add(2147483648u64)) & (4294967295u64))) < ((((v194).wrapping_add(2147483648u64)) & (4294967295u64)))) { ((v190).to_owned()).prepend(v191) } else { (d_a9666a28fa617521e6ff199bbbe6d993457e4074931a63cd0669646b53b904d1(v195,v191,v192)).prepend(v194) }} } }
fn d_af604cd7b510ebc222996f4d7c9e3ae273bc0ce8e71aa75ed96d804e149f0709(v196: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v197: PackedView<'_,PackedTag_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b,bool>,v198: u64,v199: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b { match (v196).view() { None=>{(D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b::C0).prepend(d_e5d2caa3fa6434427674c03f279cee44adb1fff012bd86df3272be166654d7b5(v199))},Some((v201,v202))=>{match (v197).view() { None=>{D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b::C0},Some((v204,v205))=>{if (((((v198).wrapping_add(2147483648u64)) & (4294967295u64))) < ((((v201).wrapping_add(2147483648u64)) & (4294967295u64)))) { ((v197).to_owned()).prepend(d_e5d2caa3fa6434427674c03f279cee44adb1fff012bd86df3272be166654d7b5(v199)) } else { (d_af604cd7b510ebc222996f4d7c9e3ae273bc0ce8e71aa75ed96d804e149f0709(v202,v205,v198,v199)).prepend(v204) }} }} } }
fn d_b8d10823504c1a9d1d6a7a3085aa04215315594a3c4bd51f753ad8f52529538b(v206: &D_71fa76d563f831b1e42072b10a315e93c21693af121ed0d5b601448747a601c0) -> D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121 { match v206 { D_71fa76d563f831b1e42072b10a315e93c21693af121ed0d5b601448747a601c0::C0(v207,v208) => { (v207.as_ref()).clone() } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c { C0 }
impl D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c{fn take_tail(&mut self)->Option<std::sync::Arc<Self>>{match self{Self::C0=>None,}}}
impl Drop for D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c{fn drop(&mut self){let mut pending=self.take_tail();while let Some(tail)=pending{match std::sync::Arc::try_unwrap(tail){Ok(mut node)=>pending=node.take_tail(),Err(_)=>break,}}}}
fn d_be07cdee9fd368e9a39079616e4015122652c5002ec3fedd4001bda0fad15373(v209: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333) -> D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b { match v209 { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 => { D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b::C0 },D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v211,v212,v213) => { (d_be07cdee9fd368e9a39079616e4015122652c5002ec3fedd4001bda0fad15373(v213.as_ref())).prepend(d_291fbfdaae211817608b223c15b933430949c800fd79b472dbedaa53d497e96e(v212.as_ref())) } } }
fn d_bf8de1787a96aa6fd62a40eb37ab8d58c2925f85bed3e694ed7dd38cd088848f(v214: &D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483,v215: u64) -> D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483 { match v214 { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(v216,v217,v218,v219,v220) => { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(std::sync::Arc::new(d_2423e83bcb3cd46f0d6d303355a32b60e69e80ccc1d71a401d83648dbd4a29fb((v216.as_ref()).as_view(),v215)),std::sync::Arc::new(d_0b7f12fa5b72a7a622e9bd28473b6aaf1b6f3daa365faa2862a1e97a4336a191((v216.as_ref()).as_view(),(v217.as_ref()).as_view(),v215)),std::sync::Arc::new(d_cba1ed46832af3480ceb38aeddc53c38ce23113908ec8758fa9db27f6d396e6f((v216.as_ref()).as_view(),(v218.as_ref()).as_view(),v215)),std::sync::Arc::new(d_cba1ed46832af3480ceb38aeddc53c38ce23113908ec8758fa9db27f6d396e6f((v216.as_ref()).as_view(),(v219.as_ref()).as_view(),v215)),std::sync::Arc::new(d_cba1ed46832af3480ceb38aeddc53c38ce23113908ec8758fa9db27f6d396e6f((v216.as_ref()).as_view(),(v220.as_ref()).as_view(),v215))) } } }
fn d_c1b10509eb122c9f1c3d8eb97475cdbb648a10c1969026c83e4072f26f006f73(v221: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v222: PackedView<'_,PackedTag_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b,bool>,v223: u64,v224: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b { match (v221).view() { None=>{(D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b::C0).prepend(d_ecccd5b0a338b6d5532a9789fe240aad158c17a6cd9f16a40a8372df40021f7a(v224))},Some((v226,v227))=>{match (v222).view() { None=>{D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b::C0},Some((v229,v230))=>{if (((((v223).wrapping_add(2147483648u64)) & (4294967295u64))) < ((((v226).wrapping_add(2147483648u64)) & (4294967295u64)))) { ((v222).to_owned()).prepend(d_ecccd5b0a338b6d5532a9789fe240aad158c17a6cd9f16a40a8372df40021f7a(v224)) } else { (d_c1b10509eb122c9f1c3d8eb97475cdbb648a10c1969026c83e4072f26f006f73(v227,v230,v223,v224)).prepend(v229) }} }} } }
#[derive(Debug)]pub struct PackedTag_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a;
pub type D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a=PackedSpine<PackedTag_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a,std::sync::Arc<D_de11c8a29cbacab71906b2cb8d95465f9945c4af2d8ce313218341c19c119ef1>>;
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b { C0 }
impl D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b{fn take_tail(&mut self)->Option<std::sync::Arc<Self>>{match self{Self::C0=>None,}}}
impl Drop for D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b{fn drop(&mut self){let mut pending=self.take_tail();while let Some(tail)=pending{match std::sync::Arc::try_unwrap(tail){Ok(mut node)=>pending=node.take_tail(),Err(_)=>break,}}}}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133 { C0(std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>) }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121 { C0(std::sync::Arc<D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483>) }
fn d_c8aa5b10352105cf54e32a38942cfeb661aa86980b3e3731974bc31709a3df65(v231: &D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121) -> D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133 { match v231 { D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(v232) => { D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_ec573a8973ea47f6961463abe806ead27f879847e77c9c1ad957c08091caa5ee(v232.as_ref()))) } } }
fn d_cba1ed46832af3480ceb38aeddc53c38ce23113908ec8758fa9db27f6d396e6f(v233: PackedView<'_,PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>,v234: PackedView<'_,PackedTag_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b,bool>,v235: u64) -> D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b { match (v233).view() { None=>{D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b::C0},Some((v237,v238))=>{match (v234).view() { None=>{D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b::C0},Some((v240,v241))=>{if ((v235) == (v237)) { d_cba1ed46832af3480ceb38aeddc53c38ce23113908ec8758fa9db27f6d396e6f(v238,v241,v235) } else { (d_cba1ed46832af3480ceb38aeddc53c38ce23113908ec8758fa9db27f6d396e6f(v238,v241,v235)).prepend(v240) }} }} } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333 { C0,C1(u64,std::sync::Arc<D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9>,std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>) }
impl D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333{fn take_tail(&mut self)->Option<std::sync::Arc<Self>>{match self{Self::C0=>None,Self::C1(_,_,tail)=>Some(std::mem::replace(tail,std::sync::Arc::new(Self::C0))),}}}
impl Drop for D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333{fn drop(&mut self){let mut pending=self.take_tail();while let Some(tail)=pending{match std::sync::Arc::try_unwrap(tail){Ok(mut node)=>pending=node.take_tail(),Err(_)=>break,}}}}
fn d_d0f8a88ab8855003228b349f61fe41ce7349ac395436b0036ac1d6c510dc7a17(v242: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333) -> D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483 { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(std::sync::Arc::new(d_41b0e6ce55ebb0c1153e88f9d5f90a1d34f9cde64409877011513c23f6fd755c(v242)),std::sync::Arc::new(d_be07cdee9fd368e9a39079616e4015122652c5002ec3fedd4001bda0fad15373(v242)),std::sync::Arc::new(d_12ef40612e626543ae74604a2f7811f4f41132927f0c806d9aa1ad15d7548624(v242)),std::sync::Arc::new(d_f23db6a13d25cf25401f4f3a97a5989f87c81e0cbb00c3173af8e784289e2b7c(v242)),std::sync::Arc::new(d_1a538538c441c602008b3d7f07d83a1bc7dc915b3161f6e6ed39ba9b47b700d4(v242))) }
fn d_d7a349b6f1968b4b56072047b99ee35c7ebf2c4e871a0dce46c246231b2012ad(v243: &D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121,v244: u64,v245: u64) -> D_47bf6b1c0fca360454f3ee60d2dbdf7bc1af7ca79379a2fe955bdb56727952e5 { match v243 { D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(v246) => { D_47bf6b1c0fca360454f3ee60d2dbdf7bc1af7ca79379a2fe955bdb56727952e5::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v246))),std::sync::Arc::new(D_a052624544f6d73ef9de3834cf97708df12875f77020694bf019de88c7808d4c::C0(std::sync::Arc::new(d_e99238f7984e3923a527bb3899f7bcd5c0c7a5dcf48806320c36a1fce9b8e7f9(v246.as_ref(),v245)),false,v244,std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_ec573a8973ea47f6961463abe806ead27f879847e77c9c1ad957c08091caa5ee(v246.as_ref())))),std::sync::Arc::clone({static v247:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v247.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})))) } } }
fn d_d8811bd72f08cf17c247297531eeba4c02e0fa0cc92bdbffee91bbc35bd46f0f(v248: &D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121,v249: u64,v250: u64,v251: u64,v252: bool,v253: bool,v254: bool,v255: bool) -> D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477 { match v248 { D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(v256) => { if match &(d_e99238f7984e3923a527bb3899f7bcd5c0c7a5dcf48806320c36a1fce9b8e7f9(v256.as_ref(),v250)) { D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C0 => { false },D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C1(v257) => { true } } { if match &(d_e99238f7984e3923a527bb3899f7bcd5c0c7a5dcf48806320c36a1fce9b8e7f9(v256.as_ref(),v250)) { D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C0 => { false },D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C1(v258) => { true } } { if v255 { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v256))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::clone({static v260:std::sync::OnceLock<std::sync::Arc<D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>>=std::sync::OnceLock::new();v260.get_or_init(||std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(std::sync::Arc::clone({static v259:std::sync::OnceLock<std::sync::Arc<D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b>>=std::sync::OnceLock::new();v259.get_or_init(||std::sync::Arc::new(D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b::C0))}))))}),false,v249,std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_ec573a8973ea47f6961463abe806ead27f879847e77c9c1ad957c08091caa5ee(v256.as_ref())))),std::sync::Arc::clone({static v261:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v261.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})))) } else { if ((v249) == (18446744073709551615u64)) { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v256))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(1u64,v249,std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_ec573a8973ea47f6961463abe806ead27f879847e77c9c1ad957c08091caa5ee(v256.as_ref()))))))) } else { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::new(d_38e1378ce743f5afd1abd72bf26c017ed1f3e4214e5f2451f30de3b2b1cf45fa(v256.as_ref(),v250,&(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v251,v252,v253,v254)))))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::clone({static v263:std::sync::OnceLock<std::sync::Arc<D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>>=std::sync::OnceLock::new();v263.get_or_init(||std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(std::sync::Arc::clone({static v262:std::sync::OnceLock<std::sync::Arc<D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c>>=std::sync::OnceLock::new();v262.get_or_init(||std::sync::Arc::new(D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c::C0))}))))}),true,(v249).wrapping_add(1u64),std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_ec573a8973ea47f6961463abe806ead27f879847e77c9c1ad957c08091caa5ee(&(d_38e1378ce743f5afd1abd72bf26c017ed1f3e4214e5f2451f30de3b2b1cf45fa(v256.as_ref(),v250,&(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v251,v252,v253,v254)))))))),std::sync::Arc::new((D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0).prepend(std::sync::Arc::new(D_de11c8a29cbacab71906b2cb8d95465f9945c4af2d8ce313218341c19c119ef1::C0(std::sync::Arc::new(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v251,v252,v253,v254))))))))) } } } else { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v256))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(2u64,v249,std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_ec573a8973ea47f6961463abe806ead27f879847e77c9c1ad957c08091caa5ee(v256.as_ref()))))))) } } else { if match &(d_e99238f7984e3923a527bb3899f7bcd5c0c7a5dcf48806320c36a1fce9b8e7f9(v256.as_ref(),v250)) { D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C0 => { false },D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C1(v265) => { true } } { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v256))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(2u64,v249,std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_ec573a8973ea47f6961463abe806ead27f879847e77c9c1ad957c08091caa5ee(v256.as_ref()))))))) } else { if v255 { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v256))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::clone({static v267:std::sync::OnceLock<std::sync::Arc<D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>>=std::sync::OnceLock::new();v267.get_or_init(||std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(std::sync::Arc::clone({static v266:std::sync::OnceLock<std::sync::Arc<D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b>>=std::sync::OnceLock::new();v266.get_or_init(||std::sync::Arc::new(D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b::C0))}))))}),false,v249,std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_ec573a8973ea47f6961463abe806ead27f879847e77c9c1ad957c08091caa5ee(v256.as_ref())))),std::sync::Arc::clone({static v268:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v268.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})))) } else { if ((v249) == (18446744073709551615u64)) { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v256))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(1u64,v249,std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_ec573a8973ea47f6961463abe806ead27f879847e77c9c1ad957c08091caa5ee(v256.as_ref()))))))) } else { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::new(d_349161a6c81439bf474d684707aa3b9eb181204e5fa70221d475c1e3c088c85d(v256.as_ref(),v250,&(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v251,v252,v253,v254)))))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::clone({static v270:std::sync::OnceLock<std::sync::Arc<D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>>=std::sync::OnceLock::new();v270.get_or_init(||std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(std::sync::Arc::clone({static v269:std::sync::OnceLock<std::sync::Arc<D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c>>=std::sync::OnceLock::new();v269.get_or_init(||std::sync::Arc::new(D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c::C0))}))))}),true,(v249).wrapping_add(1u64),std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_ec573a8973ea47f6961463abe806ead27f879847e77c9c1ad957c08091caa5ee(&(d_349161a6c81439bf474d684707aa3b9eb181204e5fa70221d475c1e3c088c85d(v256.as_ref(),v250,&(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v251,v252,v253,v254)))))))),std::sync::Arc::new((D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0).prepend(std::sync::Arc::new(D_de11c8a29cbacab71906b2cb8d95465f9945c4af2d8ce313218341c19c119ef1::C0(std::sync::Arc::new(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v251,v252,v253,v254))))))))) } } } } } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_dc3361ea8b26fea23ed6f5a2d95d5e92b002ca290540d5c1281dc07696f3d106 { C0(std::sync::Arc<D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f>,bool,u64,std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>,std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>),C1(u64,u64,std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>) }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_de11c8a29cbacab71906b2cb8d95465f9945c4af2d8ce313218341c19c119ef1 { C0(std::sync::Arc<D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9>) }
fn d_e5d2caa3fa6434427674c03f279cee44adb1fff012bd86df3272be166654d7b5(v272: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> bool { match v272 { D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v273,v274,v275,v276) => { *v276 } } }
fn d_e99238f7984e3923a527bb3899f7bcd5c0c7a5dcf48806320c36a1fce9b8e7f9(v277: &D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483,v278: u64) -> D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d { match v277 { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(v279,v280,v281,v282,v283) => { d_5c60cc928c7eef579a12aa93ab631d40adf8e36bf6187fdb6a0ff030b5f57e01((v279.as_ref()).as_view(),(v280.as_ref()).as_view(),(v281.as_ref()).as_view(),(v282.as_ref()).as_view(),(v283.as_ref()).as_view(),v278) } } }
fn d_ec573a8973ea47f6961463abe806ead27f879847e77c9c1ad957c08091caa5ee(v284: &D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483) -> D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333 { match v284 { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(v285,v286,v287,v288,v289) => { d_37cdd86a2a09901cbe6075e2877953d33fd4b30a9d5b5a97e4886f779913fda9((v285.as_ref()).as_view(),(v286.as_ref()).as_view(),(v287.as_ref()).as_view(),(v288.as_ref()).as_view(),(v289.as_ref()).as_view()) } } }
fn d_ecccd5b0a338b6d5532a9789fe240aad158c17a6cd9f16a40a8372df40021f7a(v290: &D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9) -> bool { match v290 { D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v291,v292,v293,v294) => { *v292 } } }
fn d_f23db6a13d25cf25401f4f3a97a5989f87c81e0cbb00c3173af8e784289e2b7c(v295: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333) -> D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b { match v295 { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 => { D_7e8ca6f673ad7979c998964104429505aef43656096dc1f648c6e7b4b7ee552b::C0 },D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v297,v298,v299) => { (d_f23db6a13d25cf25401f4f3a97a5989f87c81e0cbb00c3173af8e784289e2b7c(v299.as_ref())).prepend(d_908d5668edf0fb07e4047581620a91d4a46c61d61bc51d086b8606279d6f97bd(v298.as_ref())) } } }
fn d_f8c4822bc088dcc6a93b8ea4294a9de7164c41efb3bcd36687050f57635970c5(v300: &D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333) -> D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f { match v300 { D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0 => { D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f::C0 },D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C1(v302,v303,v304) => { (d_f8c4822bc088dcc6a93b8ea4294a9de7164c41efb3bcd36687050f57635970c5(v304.as_ref())).prepend(std::sync::Arc::clone(&(v303))) } } }
fn d_fe90a77d26e711f5f86414bc4b380b9fd87b339a005f7c6e89c1574bbc17fc69(v305: &D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121,v306: u64) -> D_71fa76d563f831b1e42072b10a315e93c21693af121ed0d5b601448747a601c0 { match v305 { D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(v307) => { D_71fa76d563f831b1e42072b10a315e93c21693af121ed0d5b601448747a601c0::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v307))),std::sync::Arc::new(D_dc3361ea8b26fea23ed6f5a2d95d5e92b002ca290540d5c1281dc07696f3d106::C0(std::sync::Arc::new(d_f8c4822bc088dcc6a93b8ea4294a9de7164c41efb3bcd36687050f57635970c5(&(d_ec573a8973ea47f6961463abe806ead27f879847e77c9c1ad957c08091caa5ee(v307.as_ref())))),false,v306,std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(d_ec573a8973ea47f6961463abe806ead27f879847e77c9c1ad957c08091caa5ee(v307.as_ref())))),std::sync::Arc::clone({static v308:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v308.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})))) } } }
#[derive(Debug)]pub struct PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b;
pub type D_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b=PackedSpine<PackedTag_ffbe01ab3f329d6ae70a665cd39c80a8c1d476f76be2deca27946af7c54faf7b,u64>;
pub fn f_0363ae53f2a88d1cec1c8435c8eb96359e1a81dd2a611bd3447da3d33c1a4ad6(v309: &D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477) -> D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121 { d_0363ae53f2a88d1cec1c8435c8eb96359e1a81dd2a611bd3447da3d33c1a4ad6(v309) }
pub fn f_0d626cfc0525facef0dc8bceab44736bdb5b53f3ec765e692745276b3945b4dc(v310: &D_71fa76d563f831b1e42072b10a315e93c21693af121ed0d5b601448747a601c0) -> D_dc3361ea8b26fea23ed6f5a2d95d5e92b002ca290540d5c1281dc07696f3d106 { d_0d626cfc0525facef0dc8bceab44736bdb5b53f3ec765e692745276b3945b4dc(v310) }
pub fn f_159483f57ba13d17b7b0c1575f3f23aa71405fe7dd285e980ee4d8a88e93a0f4(v311: &D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477) -> D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e { d_159483f57ba13d17b7b0c1575f3f23aa71405fe7dd285e980ee4d8a88e93a0f4(v311) }
pub fn f_2a502ffe064dea724d677b60bd84b018241a4f9f1c696700da059e591cc8deb7(v312: &D_47bf6b1c0fca360454f3ee60d2dbdf7bc1af7ca79379a2fe955bdb56727952e5) -> D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121 { d_2a502ffe064dea724d677b60bd84b018241a4f9f1c696700da059e591cc8deb7(v312) }
pub fn f_2f78e31f966f3e212176746ed5811b56d3a180ef9dfa49a600e9877fb3d093c7(v313: &D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121,v314: u64,v315: u64,v316: bool) -> D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477 { d_2f78e31f966f3e212176746ed5811b56d3a180ef9dfa49a600e9877fb3d093c7(v313,v314,v315,v316) }
pub fn f_4228a0d8adcabdc1dd98caf6489802b4a0d26b37f56c20cf7b6ebe460516b8d5(v317: &D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133) -> D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121 { d_4228a0d8adcabdc1dd98caf6489802b4a0d26b37f56c20cf7b6ebe460516b8d5(v317) }
pub fn f_9643a9fe5f1673d2a10826b365e5584c60556fb1c35d52dd406294507af24d62(v318: &D_47bf6b1c0fca360454f3ee60d2dbdf7bc1af7ca79379a2fe955bdb56727952e5) -> D_a052624544f6d73ef9de3834cf97708df12875f77020694bf019de88c7808d4c { d_9643a9fe5f1673d2a10826b365e5584c60556fb1c35d52dd406294507af24d62(v318) }
pub fn f_b8d10823504c1a9d1d6a7a3085aa04215315594a3c4bd51f753ad8f52529538b(v319: &D_71fa76d563f831b1e42072b10a315e93c21693af121ed0d5b601448747a601c0) -> D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121 { d_b8d10823504c1a9d1d6a7a3085aa04215315594a3c4bd51f753ad8f52529538b(v319) }
pub fn f_c8aa5b10352105cf54e32a38942cfeb661aa86980b3e3731974bc31709a3df65(v320: &D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121) -> D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133 { d_c8aa5b10352105cf54e32a38942cfeb661aa86980b3e3731974bc31709a3df65(v320) }
pub fn f_d7a349b6f1968b4b56072047b99ee35c7ebf2c4e871a0dce46c246231b2012ad(v321: &D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121,v322: u64,v323: u64) -> D_47bf6b1c0fca360454f3ee60d2dbdf7bc1af7ca79379a2fe955bdb56727952e5 { d_d7a349b6f1968b4b56072047b99ee35c7ebf2c4e871a0dce46c246231b2012ad(v321,v322,v323) }
pub fn f_d8811bd72f08cf17c247297531eeba4c02e0fa0cc92bdbffee91bbc35bd46f0f(v324: &D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121,v325: u64,v326: u64,v327: u64,v328: bool,v329: bool,v330: bool,v331: bool) -> D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477 { d_d8811bd72f08cf17c247297531eeba4c02e0fa0cc92bdbffee91bbc35bd46f0f(v324,v325,v326,v327,v328,v329,v330,v331) }
pub fn f_fe90a77d26e711f5f86414bc4b380b9fd87b339a005f7c6e89c1574bbc17fc69(v332: &D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121,v333: u64) -> D_71fa76d563f831b1e42072b10a315e93c21693af121ed0d5b601448747a601c0 { d_fe90a77d26e711f5f86414bc4b380b9fd87b339a005f7c6e89c1574bbc17fc69(v332,v333) }
fn q_d7a349b6f1968b4b56072047b99ee35c7ebf2c4e871a0dce46c246231b2012ad(v0:&D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121,v1:u64,v2:u64)->D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d{match v0 { D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(v3) => { match v3.as_ref() { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(v4,v5,v6,v7,v8) => { d_5c60cc928c7eef579a12aa93ab631d40adf8e36bf6187fdb6a0ff030b5f57e01((v4.as_ref()).as_view(),(v5.as_ref()).as_view(),(v6.as_ref()).as_view(),(v7.as_ref()).as_view(),(v8.as_ref()).as_view(),v2) } } } }}
fn q_fe90a77d26e711f5f86414bc4b380b9fd87b339a005f7c6e89c1574bbc17fc69(v0:&D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121,v1:u64)->D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f{match v0 { D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(v2) => { d_f8c4822bc088dcc6a93b8ea4294a9de7164c41efb3bcd36687050f57635970c5(&(match v2.as_ref() { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(v3,v4,v5,v6,v7) => { d_37cdd86a2a09901cbe6075e2877953d33fd4b30a9d5b5a97e4886f779913fda9((v3.as_ref()).as_view(),(v4.as_ref()).as_view(),(v5.as_ref()).as_view(),(v6.as_ref()).as_view(),(v7.as_ref()).as_view()) } })) } }}
fn t_2f78e31f966f3e212176746ed5811b56d3a180ef9dfa49a600e9877fb3d093c7(v0:&D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121,v1:u64,v2:u64,v3:bool)->D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477{match v0 { D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(v4) => { if v3 { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v4))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::clone({static v6:std::sync::OnceLock<std::sync::Arc<D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>>=std::sync::OnceLock::new();v6.get_or_init(||std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(std::sync::Arc::clone({static v5:std::sync::OnceLock<std::sync::Arc<D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b>>=std::sync::OnceLock::new();v5.get_or_init(||std::sync::Arc::new(D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b::C0))}))))}),false,v1,std::sync::Arc::clone({static v8:std::sync::OnceLock<std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>>=std::sync::OnceLock::new();v8.get_or_init(||std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::clone({static v7:std::sync::OnceLock<std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>>=std::sync::OnceLock::new();v7.get_or_init(||std::sync::Arc::new(D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0))}))))}),std::sync::Arc::clone({static v9:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v9.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})))) } else { if ((v1) == (18446744073709551615u64)) { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v4))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(1u64,v1,std::sync::Arc::clone({static v11:std::sync::OnceLock<std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>>=std::sync::OnceLock::new();v11.get_or_init(||std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::clone({static v10:std::sync::OnceLock<std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>>=std::sync::OnceLock::new();v10.get_or_init(||std::sync::Arc::new(D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0))}))))})))) } else { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::new(match v4.as_ref() { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(v12,v13,v14,v15,v16) => { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(std::sync::Arc::new(d_2423e83bcb3cd46f0d6d303355a32b60e69e80ccc1d71a401d83648dbd4a29fb((v12.as_ref()).as_view(),v2)),std::sync::Arc::new(d_0b7f12fa5b72a7a622e9bd28473b6aaf1b6f3daa365faa2862a1e97a4336a191((v12.as_ref()).as_view(),(v13.as_ref()).as_view(),v2)),std::sync::Arc::new(d_cba1ed46832af3480ceb38aeddc53c38ce23113908ec8758fa9db27f6d396e6f((v12.as_ref()).as_view(),(v14.as_ref()).as_view(),v2)),std::sync::Arc::new(d_cba1ed46832af3480ceb38aeddc53c38ce23113908ec8758fa9db27f6d396e6f((v12.as_ref()).as_view(),(v15.as_ref()).as_view(),v2)),std::sync::Arc::new(d_cba1ed46832af3480ceb38aeddc53c38ce23113908ec8758fa9db27f6d396e6f((v12.as_ref()).as_view(),(v16.as_ref()).as_view(),v2))) } }))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::clone({static v18:std::sync::OnceLock<std::sync::Arc<D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>>=std::sync::OnceLock::new();v18.get_or_init(||std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(std::sync::Arc::clone({static v17:std::sync::OnceLock<std::sync::Arc<D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c>>=std::sync::OnceLock::new();v17.get_or_init(||std::sync::Arc::new(D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c::C0))}))))}),true,(v1).wrapping_add(1u64),std::sync::Arc::clone({static v20:std::sync::OnceLock<std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>>=std::sync::OnceLock::new();v20.get_or_init(||std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::clone({static v19:std::sync::OnceLock<std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>>=std::sync::OnceLock::new();v19.get_or_init(||std::sync::Arc::new(D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0))}))))}),std::sync::Arc::clone({static v21:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v21.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})))) } } } }}
fn t_d7a349b6f1968b4b56072047b99ee35c7ebf2c4e871a0dce46c246231b2012ad(v0:&D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121,v1:u64,v2:u64)->D_47bf6b1c0fca360454f3ee60d2dbdf7bc1af7ca79379a2fe955bdb56727952e5{match v0 { D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(v3) => { D_47bf6b1c0fca360454f3ee60d2dbdf7bc1af7ca79379a2fe955bdb56727952e5::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v3))),std::sync::Arc::new(D_a052624544f6d73ef9de3834cf97708df12875f77020694bf019de88c7808d4c::C0(std::sync::Arc::new(match v3.as_ref() { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(v4,v5,v6,v7,v8) => { d_5c60cc928c7eef579a12aa93ab631d40adf8e36bf6187fdb6a0ff030b5f57e01((v4.as_ref()).as_view(),(v5.as_ref()).as_view(),(v6.as_ref()).as_view(),(v7.as_ref()).as_view(),(v8.as_ref()).as_view(),v2) } }),false,v1,std::sync::Arc::clone({static v10:std::sync::OnceLock<std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>>=std::sync::OnceLock::new();v10.get_or_init(||std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::clone({static v9:std::sync::OnceLock<std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>>=std::sync::OnceLock::new();v9.get_or_init(||std::sync::Arc::new(D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0))}))))}),std::sync::Arc::clone({static v11:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v11.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})))) } }}
fn t_d8811bd72f08cf17c247297531eeba4c02e0fa0cc92bdbffee91bbc35bd46f0f(v0:&D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121,v1:u64,v2:u64,v3:u64,v4:bool,v5:bool,v6:bool,v7:bool)->D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477{match v0 { D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(v8) => { if match &(match v8.as_ref() { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(v9,v10,v11,v12,v13) => { d_5c60cc928c7eef579a12aa93ab631d40adf8e36bf6187fdb6a0ff030b5f57e01((v9.as_ref()).as_view(),(v10.as_ref()).as_view(),(v11.as_ref()).as_view(),(v12.as_ref()).as_view(),(v13.as_ref()).as_view(),v2) } }) { D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C0 => { false },D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C1(v14) => { true } } { if match &(match v8.as_ref() { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(v15,v16,v17,v18,v19) => { d_5c60cc928c7eef579a12aa93ab631d40adf8e36bf6187fdb6a0ff030b5f57e01((v15.as_ref()).as_view(),(v16.as_ref()).as_view(),(v17.as_ref()).as_view(),(v18.as_ref()).as_view(),(v19.as_ref()).as_view(),v2) } }) { D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C0 => { false },D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C1(v20) => { true } } { if v7 { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v8))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::clone({static v22:std::sync::OnceLock<std::sync::Arc<D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>>=std::sync::OnceLock::new();v22.get_or_init(||std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(std::sync::Arc::clone({static v21:std::sync::OnceLock<std::sync::Arc<D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b>>=std::sync::OnceLock::new();v21.get_or_init(||std::sync::Arc::new(D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b::C0))}))))}),false,v1,std::sync::Arc::clone({static v24:std::sync::OnceLock<std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>>=std::sync::OnceLock::new();v24.get_or_init(||std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::clone({static v23:std::sync::OnceLock<std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>>=std::sync::OnceLock::new();v23.get_or_init(||std::sync::Arc::new(D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0))}))))}),std::sync::Arc::clone({static v25:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v25.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})))) } else { if ((v1) == (18446744073709551615u64)) { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v8))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(1u64,v1,std::sync::Arc::clone({static v27:std::sync::OnceLock<std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>>=std::sync::OnceLock::new();v27.get_or_init(||std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::clone({static v26:std::sync::OnceLock<std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>>=std::sync::OnceLock::new();v26.get_or_init(||std::sync::Arc::new(D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0))}))))})))) } else { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::new(match v8.as_ref() { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(v28,v29,v30,v31,v32) => { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(std::sync::Arc::new(d_36dbd7184484454d3dfb846c5f795216a960aacd56efff71562101af88033af9((v28.as_ref()).as_view(),v2,&(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v3,v4,v5,v6)))),std::sync::Arc::new(d_9f0e58906dc44c32c6f8e19c4ddb6fb11e500394deecc57b9f913a1d42f73103((v28.as_ref()).as_view(),(v29.as_ref()).as_view(),v2,&(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v3,v4,v5,v6)))),std::sync::Arc::new(d_7dc7e1bd3f8d6e18cf6936407ca1e04fdf5d32960c28f6cc2c3dec78284739a9((v28.as_ref()).as_view(),(v30.as_ref()).as_view(),v2,&(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v3,v4,v5,v6)))),std::sync::Arc::new(d_0cbe37db53267cd70a093f8f57f21f62e28993a9a42982aceeb03f788c76b120((v28.as_ref()).as_view(),(v31.as_ref()).as_view(),v2,&(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v3,v4,v5,v6)))),std::sync::Arc::new(d_19e9fbeade7bbfb5155160590618a322426ee4548dcb2473a37c06ba7ad608e7((v28.as_ref()).as_view(),(v32.as_ref()).as_view(),v2,&(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v3,v4,v5,v6))))) } }))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::clone({static v34:std::sync::OnceLock<std::sync::Arc<D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>>=std::sync::OnceLock::new();v34.get_or_init(||std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(std::sync::Arc::clone({static v33:std::sync::OnceLock<std::sync::Arc<D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c>>=std::sync::OnceLock::new();v33.get_or_init(||std::sync::Arc::new(D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c::C0))}))))}),true,(v1).wrapping_add(1u64),std::sync::Arc::clone({static v36:std::sync::OnceLock<std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>>=std::sync::OnceLock::new();v36.get_or_init(||std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::clone({static v35:std::sync::OnceLock<std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>>=std::sync::OnceLock::new();v35.get_or_init(||std::sync::Arc::new(D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0))}))))}),std::sync::Arc::new((D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0).prepend(std::sync::Arc::new(D_de11c8a29cbacab71906b2cb8d95465f9945c4af2d8ce313218341c19c119ef1::C0(std::sync::Arc::new(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v3,v4,v5,v6))))))))) } } } else { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v8))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(2u64,v1,std::sync::Arc::clone({static v39:std::sync::OnceLock<std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>>=std::sync::OnceLock::new();v39.get_or_init(||std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::clone({static v38:std::sync::OnceLock<std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>>=std::sync::OnceLock::new();v38.get_or_init(||std::sync::Arc::new(D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0))}))))})))) } } else { if match &(match v8.as_ref() { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(v40,v41,v42,v43,v44) => { d_5c60cc928c7eef579a12aa93ab631d40adf8e36bf6187fdb6a0ff030b5f57e01((v40.as_ref()).as_view(),(v41.as_ref()).as_view(),(v42.as_ref()).as_view(),(v43.as_ref()).as_view(),(v44.as_ref()).as_view(),v2) } }) { D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C0 => { false },D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d::C1(v45) => { true } } { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v8))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(2u64,v1,std::sync::Arc::clone({static v47:std::sync::OnceLock<std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>>=std::sync::OnceLock::new();v47.get_or_init(||std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::clone({static v46:std::sync::OnceLock<std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>>=std::sync::OnceLock::new();v46.get_or_init(||std::sync::Arc::new(D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0))}))))})))) } else { if v7 { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v8))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::clone({static v49:std::sync::OnceLock<std::sync::Arc<D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>>=std::sync::OnceLock::new();v49.get_or_init(||std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C1(std::sync::Arc::clone({static v48:std::sync::OnceLock<std::sync::Arc<D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b>>=std::sync::OnceLock::new();v48.get_or_init(||std::sync::Arc::new(D_c6927b0865f87bb196f15f68b8badb81fa1be85d4df74ec9dc19dc46fb41576b::C0))}))))}),false,v1,std::sync::Arc::clone({static v51:std::sync::OnceLock<std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>>=std::sync::OnceLock::new();v51.get_or_init(||std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::clone({static v50:std::sync::OnceLock<std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>>=std::sync::OnceLock::new();v50.get_or_init(||std::sync::Arc::new(D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0))}))))}),std::sync::Arc::clone({static v52:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v52.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})))) } else { if ((v1) == (18446744073709551615u64)) { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v8))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(1u64,v1,std::sync::Arc::clone({static v54:std::sync::OnceLock<std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>>=std::sync::OnceLock::new();v54.get_or_init(||std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::clone({static v53:std::sync::OnceLock<std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>>=std::sync::OnceLock::new();v53.get_or_init(||std::sync::Arc::new(D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0))}))))})))) } else { D_4c5a11a7b79396a3b22fb5a7b987d860b7db1a78752a7faed00a0b001fadc477::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::new(match v8.as_ref() { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(v55,v56,v57,v58,v59) => { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(std::sync::Arc::new(d_a9666a28fa617521e6ff199bbbe6d993457e4074931a63cd0669646b53b904d1((v55.as_ref()).as_view(),v2,&(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v3,v4,v5,v6)))),std::sync::Arc::new(d_0fb64289d1f6661470be998ca35ec8b541347936bfc9312c2c16a656c7392894((v55.as_ref()).as_view(),(v56.as_ref()).as_view(),v2,&(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v3,v4,v5,v6)))),std::sync::Arc::new(d_c1b10509eb122c9f1c3d8eb97475cdbb648a10c1969026c83e4072f26f006f73((v55.as_ref()).as_view(),(v57.as_ref()).as_view(),v2,&(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v3,v4,v5,v6)))),std::sync::Arc::new(d_a3b20cc892954abbd34ee0d0187d31cbc5df40e49e6a927ac8c5b3049475d00e((v55.as_ref()).as_view(),(v58.as_ref()).as_view(),v2,&(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v3,v4,v5,v6)))),std::sync::Arc::new(d_af604cd7b510ebc222996f4d7c9e3ae273bc0ce8e71aa75ed96d804e149f0709((v55.as_ref()).as_view(),(v59.as_ref()).as_view(),v2,&(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v3,v4,v5,v6))))) } }))),std::sync::Arc::new(D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(std::sync::Arc::clone({static v61:std::sync::OnceLock<std::sync::Arc<D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>>=std::sync::OnceLock::new();v61.get_or_init(||std::sync::Arc::new(D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f::C0(std::sync::Arc::clone({static v60:std::sync::OnceLock<std::sync::Arc<D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c>>=std::sync::OnceLock::new();v60.get_or_init(||std::sync::Arc::new(D_baa9fb170ac2322a5cbf5fab9c84873a889f82bfd5054af51e8177bfc756899c::C0))}))))}),true,(v1).wrapping_add(1u64),std::sync::Arc::clone({static v63:std::sync::OnceLock<std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>>=std::sync::OnceLock::new();v63.get_or_init(||std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::clone({static v62:std::sync::OnceLock<std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>>=std::sync::OnceLock::new();v62.get_or_init(||std::sync::Arc::new(D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0))}))))}),std::sync::Arc::new((D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0).prepend(std::sync::Arc::new(D_de11c8a29cbacab71906b2cb8d95465f9945c4af2d8ce313218341c19c119ef1::C0(std::sync::Arc::new(D_6956679af86369e1d3ab192286be84034763413abfab5540641b61e271963fa9::C0(v3,v4,v5,v6))))))))) } } } } } }}
fn t_fe90a77d26e711f5f86414bc4b380b9fd87b339a005f7c6e89c1574bbc17fc69(v0:&D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121,v1:u64)->D_71fa76d563f831b1e42072b10a315e93c21693af121ed0d5b601448747a601c0{match v0 { D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(v2) => { D_71fa76d563f831b1e42072b10a315e93c21693af121ed0d5b601448747a601c0::C0(std::sync::Arc::new(D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121::C0(std::sync::Arc::clone(v2))),std::sync::Arc::new(D_dc3361ea8b26fea23ed6f5a2d95d5e92b002ca290540d5c1281dc07696f3d106::C0(std::sync::Arc::new(d_f8c4822bc088dcc6a93b8ea4294a9de7164c41efb3bcd36687050f57635970c5(&(match v2.as_ref() { D_07b595b31aee50833b7a808720cd9b182706a4ec69fcd2f46c9635be9420d483::C0(v3,v4,v5,v6,v7) => { d_37cdd86a2a09901cbe6075e2877953d33fd4b30a9d5b5a97e4886f779913fda9((v3.as_ref()).as_view(),(v4.as_ref()).as_view(),(v5.as_ref()).as_view(),(v6.as_ref()).as_view(),(v7.as_ref()).as_view()) } }))),false,v1,std::sync::Arc::clone({static v9:std::sync::OnceLock<std::sync::Arc<D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133>>=std::sync::OnceLock::new();v9.get_or_init(||std::sync::Arc::new(D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::clone({static v8:std::sync::OnceLock<std::sync::Arc<D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333>>=std::sync::OnceLock::new();v8.get_or_init(||std::sync::Arc::new(D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0))}))))}),std::sync::Arc::clone({static v10:std::sync::OnceLock<std::sync::Arc<D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a>>=std::sync::OnceLock::new();v10.get_or_init(||std::sync::Arc::new(D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a::C0))})))) } }}

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
{let xs=v.as_array().unwrap();let mut tail=D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f::C0;for x in xs.iter().rev(){tail=tail.prepend(std::sync::Arc::new(read_6(x,d+1)?));}tail})}
fn write_4(v:&D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f,d:usize)->Result<Json,String>{Ok(
{let mut xs=vec![];for x in v.cells(){xs.push(write_6(&x,d+1)?);}Json::Array(xs)})}
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
fn logical_events(events:&D_c649eda3c7736945fd44aca67ac1bceaa018369dd4a1d12a2c8367033b52ce1a)->Result<Vec<(usize,Json)>,String>{let mut out=vec![];for event in events.cells(){let value=match event.as_ref(){
D_de11c8a29cbacab71906b2cb8d95465f9945c4af2d8ce313218341c19c119ef1::C0(value)=>(0,write_6(value,0)?),
};out.push(value);}Ok(out)}
pub use portable::Event;
pub struct Outcome<T>{pub result:T,pub committed:bool,pub version:u64,pub events:Vec<Event>}
pub struct OutcomeView<'a,T>{pub result:T,pub committed:bool,pub version:u64,pub events:&'a[Event]}
impl<T> OutcomeView<'_,T>{pub fn into_owned(self)->Outcome<T>{Outcome{result:self.result,committed:self.committed,version:self.version,events:self.events.to_vec()}}}
pub struct State{physical:D_c882912ce5c9e1bcd6137ead2fe311b34782fd381ed6656f5e7e239536381121,version:u64,outbox:Vec<portable::Event>,layout:portable::Layout}
impl State{
// CALLER CONTRACT: arguments must have the declared types and canonical values.
// No runtime type validation. Malformed input may panic, trap or corrupt state.
pub fn new()->Result<Self,String>{let logical=D_c8021db6802fed0ac48f097b2069623888cb8dc39a20cf76ec3afbec1097c133::C0(std::sync::Arc::new(D_cec6d793e123f758eeff634b3c9eb2ebefe74e1c19ba1c50d0f4b089f8a2f333::C0));Ok(Self{physical:f_4228a0d8adcabdc1dd98caf6489802b4a0d26b37f56c20cf7b6ebe460516b8d5(&logical),version:0,outbox:vec![],layout:snapshot_layout()})}
pub fn restore(bytes:&[u8])->Result<Self,String>{let layout=snapshot_layout();let saved=portable::decode(&layout,bytes,SnapshotLimits::default())?;let logical=logical_from_tables(&saved.tables)?;Ok(Self{physical:f_4228a0d8adcabdc1dd98caf6489802b4a0d26b37f56c20cf7b6ebe460516b8d5(&logical),version:saved.version,outbox:saved.outbox,layout})}
pub fn checkpoint(&self)->Result<Vec<u8>,String>{let logical=f_c8aa5b10352105cf54e32a38942cfeb661aa86980b3e3731974bc31709a3df65(&(self.physical));portable::encode(&self.layout,&portable::Logical{version:self.version,tables:logical_tables(&logical)?,outbox:self.outbox.clone()},SnapshotLimits::default())}
pub fn version(&self)->u64{self.version}
pub fn outbox_json(&self)->Json{Json::Array(self.outbox.iter().map(|e|json!({"commit":e.commit,"position":e.position,"channel":self.layout.events[e.channel].0,"value":e.value})).collect())}
pub fn acknowledge_through(&mut self,commit:u64,position:u64){self.outbox.retain(|e|(e.commit,e.position)>(commit,position));}
pub fn query_get(&self,a0:u64)->D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d{q_d7a349b6f1968b4b56072047b99ee35c7ebf2c4e871a0dce46c246231b2012ad(&(self.physical),self.version,a0)}
pub fn query_rows(&self,)->D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f{q_fe90a77d26e711f5f86414bc4b380b9fd87b339a005f7c6e89c1574bbc17fc69(&(self.physical),self.version)}
pub fn invoke_view_put(&mut self,a0:u64,a1:u64,a2:bool,a3:bool,a4:bool,a5:bool)->Result<OutcomeView<'_,D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>,String>{
let executed=t_d8811bd72f08cf17c247297531eeba4c02e0fa0cc92bdbffee91bbc35bd46f0f(&(self.physical),self.version,a0,a1,a2,a3,a4,a5);let observed=f_159483f57ba13d17b7b0c1575f3f23aa71405fe7dd285e980ee4d8a88e93a0f4(&(executed));let next=f_0363ae53f2a88d1cec1c8435c8eb96359e1a81dd2a611bd3447da3d33c1a4ad6(&(executed));
let(result,committed,version,events)=match &observed{D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(reply,committed,version,_,events)=>(reply.as_ref().clone(),*committed,*version,events),D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(..)=>return Err("commit sequence exhausted".into())};let start=self.outbox.len();let staged=logical_events(events)?;if committed{self.outbox.try_reserve(staged.len()).map_err(|_|"outbox allocation failure")?;for(position,(channel,value))in staged.into_iter().enumerate(){self.outbox.push(Event{commit:version,position:position as u64,channel,value});}}self.physical=next;self.version=version;Ok(OutcomeView{result,committed,version,events:&self.outbox[start..]})}
pub fn invoke_view_erase(&mut self,a0:u64,a1:bool)->Result<OutcomeView<'_,D_92368800572ebbcfe203c07e2d7e7e00d60743f84b2b815a526d470566792f7f>,String>{
let executed=t_2f78e31f966f3e212176746ed5811b56d3a180ef9dfa49a600e9877fb3d093c7(&(self.physical),self.version,a0,a1);let observed=f_159483f57ba13d17b7b0c1575f3f23aa71405fe7dd285e980ee4d8a88e93a0f4(&(executed));let next=f_0363ae53f2a88d1cec1c8435c8eb96359e1a81dd2a611bd3447da3d33c1a4ad6(&(executed));
let(result,committed,version,events)=match &observed{D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(reply,committed,version,_,events)=>(reply.as_ref().clone(),*committed,*version,events),D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(..)=>return Err("commit sequence exhausted".into())};let start=self.outbox.len();let staged=logical_events(events)?;if committed{self.outbox.try_reserve(staged.len()).map_err(|_|"outbox allocation failure")?;for(position,(channel,value))in staged.into_iter().enumerate(){self.outbox.push(Event{commit:version,position:position as u64,channel,value});}}self.physical=next;self.version=version;Ok(OutcomeView{result,committed,version,events:&self.outbox[start..]})}
pub fn invoke_view_get(&mut self,a0:u64)->Result<OutcomeView<'_,D_9884fb112e5daf0769ce310132db6ae281f0f9f3d3740cfb90bc120a0df9b13d>,String>{
let result=q_d7a349b6f1968b4b56072047b99ee35c7ebf2c4e871a0dce46c246231b2012ad(&(self.physical),self.version,a0);Ok(OutcomeView{result,committed:false,version:self.version,events:&self.outbox[self.outbox.len()..]})}
pub fn invoke_view_rows(&mut self,)->Result<OutcomeView<'_,D_452eeb7a68807182ead5b0802bb0125f721b29b6542737ac607a41d9e874807f>,String>{
let result=q_fe90a77d26e711f5f86414bc4b380b9fd87b339a005f7c6e89c1574bbc17fc69(&(self.physical),self.version);Ok(OutcomeView{result,committed:false,version:self.version,events:&self.outbox[self.outbox.len()..]})}
pub fn invoke_json(&mut self,name:&str,args:&Json)->Result<Json,String>{match name{
"put"=>{let xs=args.as_array().unwrap();
let a0=read_1(&xs[0],0)?;
let a1=read_2(&xs[1],0)?;
let a2=read_0(&xs[2],0)?;
let a3=read_0(&xs[3],0)?;
let a4=read_0(&xs[4],0)?;
let a5=read_0(&xs[5],0)?;
let executed=t_d8811bd72f08cf17c247297531eeba4c02e0fa0cc92bdbffee91bbc35bd46f0f(&(self.physical),self.version,a0,a1,a2,a3,a4,a5);
let observed=f_159483f57ba13d17b7b0c1575f3f23aa71405fe7dd285e980ee4d8a88e93a0f4(&(executed));let next=f_0363ae53f2a88d1cec1c8435c8eb96359e1a81dd2a611bd3447da3d33c1a4ad6(&(executed));let(reply,committed,version,events)=match &observed{D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(reply,committed,version,_,events)=>(reply,*committed,*version,events),D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(..)=>return Err("commit sequence exhausted".into())};let result=write_8(reply,0)?;let staged=logical_events(events)?;let mut published=vec![];
if committed{let channels:&[&str]=&["seen"];for(position,(channel,value))in staged.into_iter().enumerate(){published.push(json!({"commit":version,"position":position as u64,"channel":channels[channel],"value":value}));self.outbox.push(portable::Event{commit:version,position:position as u64,channel,value});}}self.physical=next;self.version=version;Ok(json!({"result":result,"committed":committed,"version":version,"events":published}))},
"erase"=>{let xs=args.as_array().unwrap();
let a0=read_1(&xs[0],0)?;
let a1=read_0(&xs[1],0)?;
let executed=t_2f78e31f966f3e212176746ed5811b56d3a180ef9dfa49a600e9877fb3d093c7(&(self.physical),self.version,a0,a1);
let observed=f_159483f57ba13d17b7b0c1575f3f23aa71405fe7dd285e980ee4d8a88e93a0f4(&(executed));let next=f_0363ae53f2a88d1cec1c8435c8eb96359e1a81dd2a611bd3447da3d33c1a4ad6(&(executed));let(reply,committed,version,events)=match &observed{D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C0(reply,committed,version,_,events)=>(reply,*committed,*version,events),D_65d699ed50617f8de0a46e3ceb535765660ef421b2f966adeeccfcbe4481e31e::C1(..)=>return Err("commit sequence exhausted".into())};let result=write_8(reply,0)?;let staged=logical_events(events)?;let mut published=vec![];
if committed{let channels:&[&str]=&["seen"];for(position,(channel,value))in staged.into_iter().enumerate(){published.push(json!({"commit":version,"position":position as u64,"channel":channels[channel],"value":value}));self.outbox.push(portable::Event{commit:version,position:position as u64,channel,value});}}self.physical=next;self.version=version;Ok(json!({"result":result,"committed":committed,"version":version,"events":published}))},
"get"=>{let xs=args.as_array().unwrap();
let a0=read_1(&xs[0],0)?;
let reply=q_d7a349b6f1968b4b56072047b99ee35c7ebf2c4e871a0dce46c246231b2012ad(&(self.physical),self.version,a0);let result=write_7(&reply,0)?;Ok(json!({"result":result,"committed":false,"version":self.version,"events":[]}))},
"rows"=>{let xs=args.as_array().unwrap();
let reply=q_fe90a77d26e711f5f86414bc4b380b9fd87b339a005f7c6e89c1574bbc17fc69(&(self.physical),self.version);let result=write_4(&reply,0)?;Ok(json!({"result":result,"committed":false,"version":self.version,"events":[]}))},
_=>Err(format!("unknown action {name}"))}}}
