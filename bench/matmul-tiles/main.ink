module matmul_tiles;
import "../../knowledge/libraries/workload_kernels.ink" as kernels;
import "../../knowledge/libraries/matrix_tiles.ink" as matrices;
fn baseline(a:List<u32>,b:List<u32>,side:u32)->List<u32>{return kernels.matmul(a,b,side);}
fn tiled(a:List<u32>,b:List<u32>,side:u32)->List<u32>{return matrices.tiled(a,b,side);}
