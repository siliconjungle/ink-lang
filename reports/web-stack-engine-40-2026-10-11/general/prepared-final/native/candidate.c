#include <stdint.h>
#include <stddef.h>
typedef struct{const uint32_t*data;size_t len;uint64_t scalar;}BenchResult;
#define ink_alloc b40_0_ink_alloc
#define ink_block b40_0_ink_block
#define ink_blocks b40_0_ink_blocks
#define ink_compute_call b40_0_ink_compute_call
#define ink_compute_into b40_0_ink_compute_into
#define ink_compute_mark b40_0_ink_compute_mark
#define ink_compute_reset b40_0_ink_compute_reset
#define ink_compute_rewind b40_0_ink_compute_rewind
#define ink_compute_scalar32 b40_0_ink_compute_scalar32
#define ink_compute_scalar64 b40_0_ink_compute_scalar64
#define ink_copy b40_0_ink_copy
#define ink_f32 b40_0_ink_f32
#define ink_fail b40_0_ink_fail
#define ink_i32 b40_0_ink_i32
#define ink_l_float b40_0_ink_l_float
#define ink_l_ink_v2_float b40_0_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b40_0_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b40_0_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b40_0_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b40_0_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b40_0_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b40_0_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b40_0_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b40_0_ink_l_ink_v4_uint32
#define ink_l_int32 b40_0_ink_l_int32
#define ink_l_uint32 b40_0_ink_l_uint32
#define ink_l_uint64 b40_0_ink_l_uint64
#define ink_top b40_0_ink_top
#define ink_v2_float b40_0_ink_v2_float
#define ink_v2_int32 b40_0_ink_v2_int32
#define ink_v2_uint32 b40_0_ink_v2_uint32
#define ink_v3_float b40_0_ink_v3_float
#define ink_v3_int32 b40_0_ink_v3_int32
#define ink_v3_uint32 b40_0_ink_v3_uint32
#define ink_v4_float b40_0_ink_v4_float
#define ink_v4_int32 b40_0_ink_v4_int32
#define ink_v4_uint32 b40_0_ink_v4_uint32
#define lang_fn_general40_affine b40_0_lang_fn_general40_affine
#define lang_fn_general40_affine_into b40_0_lang_fn_general40_affine_into
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/general/prepared-final/targets/general40_affine/candidate/cpu.c"
#undef ink_alloc
#undef ink_block
#undef ink_blocks
#undef ink_compute_call
#undef ink_compute_into
#undef ink_compute_mark
#undef ink_compute_reset
#undef ink_compute_rewind
#undef ink_compute_scalar32
#undef ink_compute_scalar64
#undef ink_copy
#undef ink_f32
#undef ink_fail
#undef ink_i32
#undef ink_l_float
#undef ink_l_ink_v2_float
#undef ink_l_ink_v2_int32
#undef ink_l_ink_v2_uint32
#undef ink_l_ink_v3_float
#undef ink_l_ink_v3_int32
#undef ink_l_ink_v3_uint32
#undef ink_l_ink_v4_float
#undef ink_l_ink_v4_int32
#undef ink_l_ink_v4_uint32
#undef ink_l_int32
#undef ink_l_uint32
#undef ink_l_uint64
#undef ink_top
#undef ink_v2_float
#undef ink_v2_int32
#undef ink_v2_uint32
#undef ink_v3_float
#undef ink_v3_int32
#undef ink_v3_uint32
#undef ink_v4_float
#undef ink_v4_int32
#undef ink_v4_uint32
#undef lang_fn_general40_affine
#undef lang_fn_general40_affine_into
#define ink_alloc b40_1_ink_alloc
#define ink_block b40_1_ink_block
#define ink_blocks b40_1_ink_blocks
#define ink_compute_call b40_1_ink_compute_call
#define ink_compute_into b40_1_ink_compute_into
#define ink_compute_mark b40_1_ink_compute_mark
#define ink_compute_reset b40_1_ink_compute_reset
#define ink_compute_rewind b40_1_ink_compute_rewind
#define ink_compute_scalar32 b40_1_ink_compute_scalar32
#define ink_compute_scalar64 b40_1_ink_compute_scalar64
#define ink_copy b40_1_ink_copy
#define ink_f32 b40_1_ink_f32
#define ink_fail b40_1_ink_fail
#define ink_i32 b40_1_ink_i32
#define ink_l_float b40_1_ink_l_float
#define ink_l_ink_v2_float b40_1_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b40_1_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b40_1_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b40_1_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b40_1_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b40_1_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b40_1_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b40_1_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b40_1_ink_l_ink_v4_uint32
#define ink_l_int32 b40_1_ink_l_int32
#define ink_l_uint32 b40_1_ink_l_uint32
#define ink_l_uint64 b40_1_ink_l_uint64
#define ink_top b40_1_ink_top
#define ink_v2_float b40_1_ink_v2_float
#define ink_v2_int32 b40_1_ink_v2_int32
#define ink_v2_uint32 b40_1_ink_v2_uint32
#define ink_v3_float b40_1_ink_v3_float
#define ink_v3_int32 b40_1_ink_v3_int32
#define ink_v3_uint32 b40_1_ink_v3_uint32
#define ink_v4_float b40_1_ink_v4_float
#define ink_v4_int32 b40_1_ink_v4_int32
#define ink_v4_uint32 b40_1_ink_v4_uint32
#define lang_fn_general40_compaction b40_1_lang_fn_general40_compaction
#define lang_fn_general40_compaction_into b40_1_lang_fn_general40_compaction_into
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/general/prepared-final/targets/general40_compaction/candidate/cpu.c"
#undef ink_alloc
#undef ink_block
#undef ink_blocks
#undef ink_compute_call
#undef ink_compute_into
#undef ink_compute_mark
#undef ink_compute_reset
#undef ink_compute_rewind
#undef ink_compute_scalar32
#undef ink_compute_scalar64
#undef ink_copy
#undef ink_f32
#undef ink_fail
#undef ink_i32
#undef ink_l_float
#undef ink_l_ink_v2_float
#undef ink_l_ink_v2_int32
#undef ink_l_ink_v2_uint32
#undef ink_l_ink_v3_float
#undef ink_l_ink_v3_int32
#undef ink_l_ink_v3_uint32
#undef ink_l_ink_v4_float
#undef ink_l_ink_v4_int32
#undef ink_l_ink_v4_uint32
#undef ink_l_int32
#undef ink_l_uint32
#undef ink_l_uint64
#undef ink_top
#undef ink_v2_float
#undef ink_v2_int32
#undef ink_v2_uint32
#undef ink_v3_float
#undef ink_v3_int32
#undef ink_v3_uint32
#undef ink_v4_float
#undef ink_v4_int32
#undef ink_v4_uint32
#undef lang_fn_general40_compaction
#undef lang_fn_general40_compaction_into
#define ink_alloc b40_2_ink_alloc
#define ink_block b40_2_ink_block
#define ink_blocks b40_2_ink_blocks
#define ink_compute_call b40_2_ink_compute_call
#define ink_compute_into b40_2_ink_compute_into
#define ink_compute_mark b40_2_ink_compute_mark
#define ink_compute_reset b40_2_ink_compute_reset
#define ink_compute_rewind b40_2_ink_compute_rewind
#define ink_compute_scalar32 b40_2_ink_compute_scalar32
#define ink_compute_scalar64 b40_2_ink_compute_scalar64
#define ink_copy b40_2_ink_copy
#define ink_f32 b40_2_ink_f32
#define ink_fail b40_2_ink_fail
#define ink_i32 b40_2_ink_i32
#define ink_l_float b40_2_ink_l_float
#define ink_l_ink_v2_float b40_2_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b40_2_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b40_2_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b40_2_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b40_2_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b40_2_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b40_2_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b40_2_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b40_2_ink_l_ink_v4_uint32
#define ink_l_int32 b40_2_ink_l_int32
#define ink_l_uint32 b40_2_ink_l_uint32
#define ink_l_uint64 b40_2_ink_l_uint64
#define ink_top b40_2_ink_top
#define ink_v2_float b40_2_ink_v2_float
#define ink_v2_int32 b40_2_ink_v2_int32
#define ink_v2_uint32 b40_2_ink_v2_uint32
#define ink_v3_float b40_2_ink_v3_float
#define ink_v3_int32 b40_2_ink_v3_int32
#define ink_v3_uint32 b40_2_ink_v3_uint32
#define ink_v4_float b40_2_ink_v4_float
#define ink_v4_int32 b40_2_ink_v4_int32
#define ink_v4_uint32 b40_2_ink_v4_uint32
#define lang_fn_general40_scan b40_2_lang_fn_general40_scan
#define lang_fn_general40_scan_into b40_2_lang_fn_general40_scan_into
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/general/prepared-final/targets/general40_scan/candidate/cpu.c"
#undef ink_alloc
#undef ink_block
#undef ink_blocks
#undef ink_compute_call
#undef ink_compute_into
#undef ink_compute_mark
#undef ink_compute_reset
#undef ink_compute_rewind
#undef ink_compute_scalar32
#undef ink_compute_scalar64
#undef ink_copy
#undef ink_f32
#undef ink_fail
#undef ink_i32
#undef ink_l_float
#undef ink_l_ink_v2_float
#undef ink_l_ink_v2_int32
#undef ink_l_ink_v2_uint32
#undef ink_l_ink_v3_float
#undef ink_l_ink_v3_int32
#undef ink_l_ink_v3_uint32
#undef ink_l_ink_v4_float
#undef ink_l_ink_v4_int32
#undef ink_l_ink_v4_uint32
#undef ink_l_int32
#undef ink_l_uint32
#undef ink_l_uint64
#undef ink_top
#undef ink_v2_float
#undef ink_v2_int32
#undef ink_v2_uint32
#undef ink_v3_float
#undef ink_v3_int32
#undef ink_v3_uint32
#undef ink_v4_float
#undef ink_v4_int32
#undef ink_v4_uint32
#undef lang_fn_general40_scan
#undef lang_fn_general40_scan_into
#define ink_alloc b40_3_ink_alloc
#define ink_block b40_3_ink_block
#define ink_blocks b40_3_ink_blocks
#define ink_compute_call b40_3_ink_compute_call
#define ink_compute_into b40_3_ink_compute_into
#define ink_compute_mark b40_3_ink_compute_mark
#define ink_compute_reset b40_3_ink_compute_reset
#define ink_compute_rewind b40_3_ink_compute_rewind
#define ink_compute_scalar32 b40_3_ink_compute_scalar32
#define ink_compute_scalar64 b40_3_ink_compute_scalar64
#define ink_copy b40_3_ink_copy
#define ink_f32 b40_3_ink_f32
#define ink_fail b40_3_ink_fail
#define ink_i32 b40_3_ink_i32
#define ink_l_float b40_3_ink_l_float
#define ink_l_ink_v2_float b40_3_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b40_3_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b40_3_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b40_3_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b40_3_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b40_3_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b40_3_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b40_3_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b40_3_ink_l_ink_v4_uint32
#define ink_l_int32 b40_3_ink_l_int32
#define ink_l_uint32 b40_3_ink_l_uint32
#define ink_l_uint64 b40_3_ink_l_uint64
#define ink_top b40_3_ink_top
#define ink_v2_float b40_3_ink_v2_float
#define ink_v2_int32 b40_3_ink_v2_int32
#define ink_v2_uint32 b40_3_ink_v2_uint32
#define ink_v3_float b40_3_ink_v3_float
#define ink_v3_int32 b40_3_ink_v3_int32
#define ink_v3_uint32 b40_3_ink_v3_uint32
#define ink_v4_float b40_3_ink_v4_float
#define ink_v4_int32 b40_3_ink_v4_int32
#define ink_v4_uint32 b40_3_ink_v4_uint32
#define lang_fn_general40_branch b40_3_lang_fn_general40_branch
#define lang_fn_general40_branch_into b40_3_lang_fn_general40_branch_into
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/general/prepared-final/targets/general40_branch/candidate/cpu.c"
#undef ink_alloc
#undef ink_block
#undef ink_blocks
#undef ink_compute_call
#undef ink_compute_into
#undef ink_compute_mark
#undef ink_compute_reset
#undef ink_compute_rewind
#undef ink_compute_scalar32
#undef ink_compute_scalar64
#undef ink_copy
#undef ink_f32
#undef ink_fail
#undef ink_i32
#undef ink_l_float
#undef ink_l_ink_v2_float
#undef ink_l_ink_v2_int32
#undef ink_l_ink_v2_uint32
#undef ink_l_ink_v3_float
#undef ink_l_ink_v3_int32
#undef ink_l_ink_v3_uint32
#undef ink_l_ink_v4_float
#undef ink_l_ink_v4_int32
#undef ink_l_ink_v4_uint32
#undef ink_l_int32
#undef ink_l_uint32
#undef ink_l_uint64
#undef ink_top
#undef ink_v2_float
#undef ink_v2_int32
#undef ink_v2_uint32
#undef ink_v3_float
#undef ink_v3_int32
#undef ink_v3_uint32
#undef ink_v4_float
#undef ink_v4_int32
#undef ink_v4_uint32
#undef lang_fn_general40_branch
#undef lang_fn_general40_branch_into
#define ink_alloc b40_4_ink_alloc
#define ink_block b40_4_ink_block
#define ink_blocks b40_4_ink_blocks
#define ink_compute_call b40_4_ink_compute_call
#define ink_compute_into b40_4_ink_compute_into
#define ink_compute_mark b40_4_ink_compute_mark
#define ink_compute_reset b40_4_ink_compute_reset
#define ink_compute_rewind b40_4_ink_compute_rewind
#define ink_compute_scalar32 b40_4_ink_compute_scalar32
#define ink_compute_scalar64 b40_4_ink_compute_scalar64
#define ink_copy b40_4_ink_copy
#define ink_f32 b40_4_ink_f32
#define ink_fail b40_4_ink_fail
#define ink_i32 b40_4_ink_i32
#define ink_l_float b40_4_ink_l_float
#define ink_l_ink_v2_float b40_4_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b40_4_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b40_4_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b40_4_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b40_4_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b40_4_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b40_4_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b40_4_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b40_4_ink_l_ink_v4_uint32
#define ink_l_int32 b40_4_ink_l_int32
#define ink_l_uint32 b40_4_ink_l_uint32
#define ink_l_uint64 b40_4_ink_l_uint64
#define ink_top b40_4_ink_top
#define ink_v2_float b40_4_ink_v2_float
#define ink_v2_int32 b40_4_ink_v2_int32
#define ink_v2_uint32 b40_4_ink_v2_uint32
#define ink_v3_float b40_4_ink_v3_float
#define ink_v3_int32 b40_4_ink_v3_int32
#define ink_v3_uint32 b40_4_ink_v3_uint32
#define ink_v4_float b40_4_ink_v4_float
#define ink_v4_int32 b40_4_ink_v4_int32
#define ink_v4_uint32 b40_4_ink_v4_uint32
#define lang_fn_general40_ordered b40_4_lang_fn_general40_ordered
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/general/prepared-final/targets/general40_ordered/candidate/cpu.c"
#undef ink_alloc
#undef ink_block
#undef ink_blocks
#undef ink_compute_call
#undef ink_compute_into
#undef ink_compute_mark
#undef ink_compute_reset
#undef ink_compute_rewind
#undef ink_compute_scalar32
#undef ink_compute_scalar64
#undef ink_copy
#undef ink_f32
#undef ink_fail
#undef ink_i32
#undef ink_l_float
#undef ink_l_ink_v2_float
#undef ink_l_ink_v2_int32
#undef ink_l_ink_v2_uint32
#undef ink_l_ink_v3_float
#undef ink_l_ink_v3_int32
#undef ink_l_ink_v3_uint32
#undef ink_l_ink_v4_float
#undef ink_l_ink_v4_int32
#undef ink_l_ink_v4_uint32
#undef ink_l_int32
#undef ink_l_uint32
#undef ink_l_uint64
#undef ink_top
#undef ink_v2_float
#undef ink_v2_int32
#undef ink_v2_uint32
#undef ink_v3_float
#undef ink_v3_int32
#undef ink_v3_uint32
#undef ink_v4_float
#undef ink_v4_int32
#undef ink_v4_uint32
#undef lang_fn_general40_ordered
#define ink_alloc b40_5_ink_alloc
#define ink_block b40_5_ink_block
#define ink_blocks b40_5_ink_blocks
#define ink_compute_call b40_5_ink_compute_call
#define ink_compute_into b40_5_ink_compute_into
#define ink_compute_mark b40_5_ink_compute_mark
#define ink_compute_reset b40_5_ink_compute_reset
#define ink_compute_rewind b40_5_ink_compute_rewind
#define ink_compute_scalar32 b40_5_ink_compute_scalar32
#define ink_compute_scalar64 b40_5_ink_compute_scalar64
#define ink_copy b40_5_ink_copy
#define ink_f32 b40_5_ink_f32
#define ink_fail b40_5_ink_fail
#define ink_i32 b40_5_ink_i32
#define ink_l_float b40_5_ink_l_float
#define ink_l_ink_v2_float b40_5_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b40_5_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b40_5_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b40_5_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b40_5_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b40_5_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b40_5_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b40_5_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b40_5_ink_l_ink_v4_uint32
#define ink_l_int32 b40_5_ink_l_int32
#define ink_l_uint32 b40_5_ink_l_uint32
#define ink_l_uint64 b40_5_ink_l_uint64
#define ink_top b40_5_ink_top
#define ink_v2_float b40_5_ink_v2_float
#define ink_v2_int32 b40_5_ink_v2_int32
#define ink_v2_uint32 b40_5_ink_v2_uint32
#define ink_v3_float b40_5_ink_v3_float
#define ink_v3_int32 b40_5_ink_v3_int32
#define ink_v3_uint32 b40_5_ink_v3_uint32
#define ink_v4_float b40_5_ink_v4_float
#define ink_v4_int32 b40_5_ink_v4_int32
#define ink_v4_uint32 b40_5_ink_v4_uint32
#define lang_fn_general40_stencil b40_5_lang_fn_general40_stencil
#define lang_fn_general40_stencil_into b40_5_lang_fn_general40_stencil_into
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/general/prepared-final/targets/general40_stencil/candidate/cpu.c"
#undef ink_alloc
#undef ink_block
#undef ink_blocks
#undef ink_compute_call
#undef ink_compute_into
#undef ink_compute_mark
#undef ink_compute_reset
#undef ink_compute_rewind
#undef ink_compute_scalar32
#undef ink_compute_scalar64
#undef ink_copy
#undef ink_f32
#undef ink_fail
#undef ink_i32
#undef ink_l_float
#undef ink_l_ink_v2_float
#undef ink_l_ink_v2_int32
#undef ink_l_ink_v2_uint32
#undef ink_l_ink_v3_float
#undef ink_l_ink_v3_int32
#undef ink_l_ink_v3_uint32
#undef ink_l_ink_v4_float
#undef ink_l_ink_v4_int32
#undef ink_l_ink_v4_uint32
#undef ink_l_int32
#undef ink_l_uint32
#undef ink_l_uint64
#undef ink_top
#undef ink_v2_float
#undef ink_v2_int32
#undef ink_v2_uint32
#undef ink_v3_float
#undef ink_v3_int32
#undef ink_v3_uint32
#undef ink_v4_float
#undef ink_v4_int32
#undef ink_v4_uint32
#undef lang_fn_general40_stencil
#undef lang_fn_general40_stencil_into
#define ink_alloc b40_6_ink_alloc
#define ink_block b40_6_ink_block
#define ink_blocks b40_6_ink_blocks
#define ink_compute_call b40_6_ink_compute_call
#define ink_compute_into b40_6_ink_compute_into
#define ink_compute_mark b40_6_ink_compute_mark
#define ink_compute_reset b40_6_ink_compute_reset
#define ink_compute_rewind b40_6_ink_compute_rewind
#define ink_compute_scalar32 b40_6_ink_compute_scalar32
#define ink_compute_scalar64 b40_6_ink_compute_scalar64
#define ink_copy b40_6_ink_copy
#define ink_f32 b40_6_ink_f32
#define ink_fail b40_6_ink_fail
#define ink_i32 b40_6_ink_i32
#define ink_l_float b40_6_ink_l_float
#define ink_l_ink_v2_float b40_6_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b40_6_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b40_6_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b40_6_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b40_6_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b40_6_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b40_6_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b40_6_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b40_6_ink_l_ink_v4_uint32
#define ink_l_int32 b40_6_ink_l_int32
#define ink_l_uint32 b40_6_ink_l_uint32
#define ink_l_uint64 b40_6_ink_l_uint64
#define ink_top b40_6_ink_top
#define ink_v2_float b40_6_ink_v2_float
#define ink_v2_int32 b40_6_ink_v2_int32
#define ink_v2_uint32 b40_6_ink_v2_uint32
#define ink_v3_float b40_6_ink_v3_float
#define ink_v3_int32 b40_6_ink_v3_int32
#define ink_v3_uint32 b40_6_ink_v3_uint32
#define ink_v4_float b40_6_ink_v4_float
#define ink_v4_int32 b40_6_ink_v4_int32
#define ink_v4_uint32 b40_6_ink_v4_uint32
#define lang_fn_general40_update b40_6_lang_fn_general40_update
#define lang_fn_general40_update_into b40_6_lang_fn_general40_update_into
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/general/prepared-final/targets/general40_update/candidate/cpu.c"
#undef ink_alloc
#undef ink_block
#undef ink_blocks
#undef ink_compute_call
#undef ink_compute_into
#undef ink_compute_mark
#undef ink_compute_reset
#undef ink_compute_rewind
#undef ink_compute_scalar32
#undef ink_compute_scalar64
#undef ink_copy
#undef ink_f32
#undef ink_fail
#undef ink_i32
#undef ink_l_float
#undef ink_l_ink_v2_float
#undef ink_l_ink_v2_int32
#undef ink_l_ink_v2_uint32
#undef ink_l_ink_v3_float
#undef ink_l_ink_v3_int32
#undef ink_l_ink_v3_uint32
#undef ink_l_ink_v4_float
#undef ink_l_ink_v4_int32
#undef ink_l_ink_v4_uint32
#undef ink_l_int32
#undef ink_l_uint32
#undef ink_l_uint64
#undef ink_top
#undef ink_v2_float
#undef ink_v2_int32
#undef ink_v2_uint32
#undef ink_v3_float
#undef ink_v3_int32
#undef ink_v3_uint32
#undef ink_v4_float
#undef ink_v4_int32
#undef ink_v4_uint32
#undef lang_fn_general40_update
#undef lang_fn_general40_update_into
#define ink_alloc b40_7_ink_alloc
#define ink_block b40_7_ink_block
#define ink_blocks b40_7_ink_blocks
#define ink_compute_call b40_7_ink_compute_call
#define ink_compute_into b40_7_ink_compute_into
#define ink_compute_mark b40_7_ink_compute_mark
#define ink_compute_reset b40_7_ink_compute_reset
#define ink_compute_rewind b40_7_ink_compute_rewind
#define ink_compute_scalar32 b40_7_ink_compute_scalar32
#define ink_compute_scalar64 b40_7_ink_compute_scalar64
#define ink_copy b40_7_ink_copy
#define ink_f32 b40_7_ink_f32
#define ink_fail b40_7_ink_fail
#define ink_i32 b40_7_ink_i32
#define ink_l_float b40_7_ink_l_float
#define ink_l_ink_v2_float b40_7_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b40_7_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b40_7_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b40_7_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b40_7_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b40_7_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b40_7_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b40_7_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b40_7_ink_l_ink_v4_uint32
#define ink_l_int32 b40_7_ink_l_int32
#define ink_l_uint32 b40_7_ink_l_uint32
#define ink_l_uint64 b40_7_ink_l_uint64
#define ink_top b40_7_ink_top
#define ink_v2_float b40_7_ink_v2_float
#define ink_v2_int32 b40_7_ink_v2_int32
#define ink_v2_uint32 b40_7_ink_v2_uint32
#define ink_v3_float b40_7_ink_v3_float
#define ink_v3_int32 b40_7_ink_v3_int32
#define ink_v3_uint32 b40_7_ink_v3_uint32
#define ink_v4_float b40_7_ink_v4_float
#define ink_v4_int32 b40_7_ink_v4_int32
#define ink_v4_uint32 b40_7_ink_v4_uint32
#define lang_fn_general40_update_recompute b40_7_lang_fn_general40_update_recompute
#define lang_fn_general40_update_recompute_into b40_7_lang_fn_general40_update_recompute_into
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/general/prepared-final/targets/general40_update_recompute/candidate/cpu.c"
#undef ink_alloc
#undef ink_block
#undef ink_blocks
#undef ink_compute_call
#undef ink_compute_into
#undef ink_compute_mark
#undef ink_compute_reset
#undef ink_compute_rewind
#undef ink_compute_scalar32
#undef ink_compute_scalar64
#undef ink_copy
#undef ink_f32
#undef ink_fail
#undef ink_i32
#undef ink_l_float
#undef ink_l_ink_v2_float
#undef ink_l_ink_v2_int32
#undef ink_l_ink_v2_uint32
#undef ink_l_ink_v3_float
#undef ink_l_ink_v3_int32
#undef ink_l_ink_v3_uint32
#undef ink_l_ink_v4_float
#undef ink_l_ink_v4_int32
#undef ink_l_ink_v4_uint32
#undef ink_l_int32
#undef ink_l_uint32
#undef ink_l_uint64
#undef ink_top
#undef ink_v2_float
#undef ink_v2_int32
#undef ink_v2_uint32
#undef ink_v3_float
#undef ink_v3_int32
#undef ink_v3_uint32
#undef ink_v4_float
#undef ink_v4_int32
#undef ink_v4_uint32
#undef lang_fn_general40_update_recompute
#undef lang_fn_general40_update_recompute_into
#define ink_alloc b40_8_ink_alloc
#define ink_block b40_8_ink_block
#define ink_blocks b40_8_ink_blocks
#define ink_compute_call b40_8_ink_compute_call
#define ink_compute_into b40_8_ink_compute_into
#define ink_compute_mark b40_8_ink_compute_mark
#define ink_compute_reset b40_8_ink_compute_reset
#define ink_compute_rewind b40_8_ink_compute_rewind
#define ink_compute_scalar32 b40_8_ink_compute_scalar32
#define ink_compute_scalar64 b40_8_ink_compute_scalar64
#define ink_copy b40_8_ink_copy
#define ink_f32 b40_8_ink_f32
#define ink_fail b40_8_ink_fail
#define ink_i32 b40_8_ink_i32
#define ink_l_float b40_8_ink_l_float
#define ink_l_ink_v2_float b40_8_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b40_8_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b40_8_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b40_8_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b40_8_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b40_8_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b40_8_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b40_8_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b40_8_ink_l_ink_v4_uint32
#define ink_l_int32 b40_8_ink_l_int32
#define ink_l_uint32 b40_8_ink_l_uint32
#define ink_l_uint64 b40_8_ink_l_uint64
#define ink_top b40_8_ink_top
#define ink_v2_float b40_8_ink_v2_float
#define ink_v2_int32 b40_8_ink_v2_int32
#define ink_v2_uint32 b40_8_ink_v2_uint32
#define ink_v3_float b40_8_ink_v3_float
#define ink_v3_int32 b40_8_ink_v3_int32
#define ink_v3_uint32 b40_8_ink_v3_uint32
#define ink_v4_float b40_8_ink_v4_float
#define ink_v4_int32 b40_8_ink_v4_int32
#define ink_v4_uint32 b40_8_ink_v4_uint32
#define lang_fn_general40_compaction_chain b40_8_lang_fn_general40_compaction_chain
#define lang_fn_general40_compaction_chain_into b40_8_lang_fn_general40_compaction_chain_into
#define lang_fn_repair_word b40_8_lang_fn_repair_word
#define lang_fn_stage_word b40_8_lang_fn_stage_word
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/general/prepared-final/targets/general40_compaction_chain/candidate/cpu.c"
#undef ink_alloc
#undef ink_block
#undef ink_blocks
#undef ink_compute_call
#undef ink_compute_into
#undef ink_compute_mark
#undef ink_compute_reset
#undef ink_compute_rewind
#undef ink_compute_scalar32
#undef ink_compute_scalar64
#undef ink_copy
#undef ink_f32
#undef ink_fail
#undef ink_i32
#undef ink_l_float
#undef ink_l_ink_v2_float
#undef ink_l_ink_v2_int32
#undef ink_l_ink_v2_uint32
#undef ink_l_ink_v3_float
#undef ink_l_ink_v3_int32
#undef ink_l_ink_v3_uint32
#undef ink_l_ink_v4_float
#undef ink_l_ink_v4_int32
#undef ink_l_ink_v4_uint32
#undef ink_l_int32
#undef ink_l_uint32
#undef ink_l_uint64
#undef ink_top
#undef ink_v2_float
#undef ink_v2_int32
#undef ink_v2_uint32
#undef ink_v3_float
#undef ink_v3_int32
#undef ink_v3_uint32
#undef ink_v4_float
#undef ink_v4_int32
#undef ink_v4_uint32
#undef lang_fn_general40_compaction_chain
#undef lang_fn_general40_compaction_chain_into
#undef lang_fn_repair_word
#undef lang_fn_stage_word
#define ink_alloc b40_9_ink_alloc
#define ink_block b40_9_ink_block
#define ink_blocks b40_9_ink_blocks
#define ink_compute_call b40_9_ink_compute_call
#define ink_compute_into b40_9_ink_compute_into
#define ink_compute_mark b40_9_ink_compute_mark
#define ink_compute_reset b40_9_ink_compute_reset
#define ink_compute_rewind b40_9_ink_compute_rewind
#define ink_compute_scalar32 b40_9_ink_compute_scalar32
#define ink_compute_scalar64 b40_9_ink_compute_scalar64
#define ink_copy b40_9_ink_copy
#define ink_f32 b40_9_ink_f32
#define ink_fail b40_9_ink_fail
#define ink_i32 b40_9_ink_i32
#define ink_l_float b40_9_ink_l_float
#define ink_l_ink_v2_float b40_9_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b40_9_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b40_9_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b40_9_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b40_9_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b40_9_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b40_9_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b40_9_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b40_9_ink_l_ink_v4_uint32
#define ink_l_int32 b40_9_ink_l_int32
#define ink_l_uint32 b40_9_ink_l_uint32
#define ink_l_uint64 b40_9_ink_l_uint64
#define ink_top b40_9_ink_top
#define ink_v2_float b40_9_ink_v2_float
#define ink_v2_int32 b40_9_ink_v2_int32
#define ink_v2_uint32 b40_9_ink_v2_uint32
#define ink_v3_float b40_9_ink_v3_float
#define ink_v3_int32 b40_9_ink_v3_int32
#define ink_v3_uint32 b40_9_ink_v3_uint32
#define ink_v4_float b40_9_ink_v4_float
#define ink_v4_int32 b40_9_ink_v4_int32
#define ink_v4_uint32 b40_9_ink_v4_uint32
#define lang_fn_calibrate_word b40_9_lang_fn_calibrate_word
#define lang_fn_general40_scan_chain b40_9_lang_fn_general40_scan_chain
#define lang_fn_general40_scan_chain_into b40_9_lang_fn_general40_scan_chain_into
#define lang_fn_scan_word b40_9_lang_fn_scan_word
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/general/prepared-final/targets/general40_scan_chain/candidate/cpu.c"
#undef ink_alloc
#undef ink_block
#undef ink_blocks
#undef ink_compute_call
#undef ink_compute_into
#undef ink_compute_mark
#undef ink_compute_reset
#undef ink_compute_rewind
#undef ink_compute_scalar32
#undef ink_compute_scalar64
#undef ink_copy
#undef ink_f32
#undef ink_fail
#undef ink_i32
#undef ink_l_float
#undef ink_l_ink_v2_float
#undef ink_l_ink_v2_int32
#undef ink_l_ink_v2_uint32
#undef ink_l_ink_v3_float
#undef ink_l_ink_v3_int32
#undef ink_l_ink_v3_uint32
#undef ink_l_ink_v4_float
#undef ink_l_ink_v4_int32
#undef ink_l_ink_v4_uint32
#undef ink_l_int32
#undef ink_l_uint32
#undef ink_l_uint64
#undef ink_top
#undef ink_v2_float
#undef ink_v2_int32
#undef ink_v2_uint32
#undef ink_v3_float
#undef ink_v3_int32
#undef ink_v3_uint32
#undef ink_v4_float
#undef ink_v4_int32
#undef ink_v4_uint32
#undef lang_fn_calibrate_word
#undef lang_fn_general40_scan_chain
#undef lang_fn_general40_scan_chain_into
#undef lang_fn_scan_word
#define ink_alloc b40_10_ink_alloc
#define ink_block b40_10_ink_block
#define ink_blocks b40_10_ink_blocks
#define ink_compute_call b40_10_ink_compute_call
#define ink_compute_into b40_10_ink_compute_into
#define ink_compute_mark b40_10_ink_compute_mark
#define ink_compute_reset b40_10_ink_compute_reset
#define ink_compute_rewind b40_10_ink_compute_rewind
#define ink_compute_scalar32 b40_10_ink_compute_scalar32
#define ink_compute_scalar64 b40_10_ink_compute_scalar64
#define ink_copy b40_10_ink_copy
#define ink_f32 b40_10_ink_f32
#define ink_fail b40_10_ink_fail
#define ink_i32 b40_10_ink_i32
#define ink_l_float b40_10_ink_l_float
#define ink_l_ink_v2_float b40_10_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b40_10_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b40_10_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b40_10_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b40_10_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b40_10_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b40_10_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b40_10_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b40_10_ink_l_ink_v4_uint32
#define ink_l_int32 b40_10_ink_l_int32
#define ink_l_uint32 b40_10_ink_l_uint32
#define ink_l_uint64 b40_10_ink_l_uint64
#define ink_top b40_10_ink_top
#define ink_v2_float b40_10_ink_v2_float
#define ink_v2_int32 b40_10_ink_v2_int32
#define ink_v2_uint32 b40_10_ink_v2_uint32
#define ink_v3_float b40_10_ink_v3_float
#define ink_v3_int32 b40_10_ink_v3_int32
#define ink_v3_uint32 b40_10_ink_v3_uint32
#define ink_v4_float b40_10_ink_v4_float
#define ink_v4_int32 b40_10_ink_v4_int32
#define ink_v4_uint32 b40_10_ink_v4_uint32
#define lang_fn_general40_dot_ordered b40_10_lang_fn_general40_dot_ordered
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/general/prepared-final/targets/general40_dot_ordered/candidate/cpu.c"
#undef ink_alloc
#undef ink_block
#undef ink_blocks
#undef ink_compute_call
#undef ink_compute_into
#undef ink_compute_mark
#undef ink_compute_reset
#undef ink_compute_rewind
#undef ink_compute_scalar32
#undef ink_compute_scalar64
#undef ink_copy
#undef ink_f32
#undef ink_fail
#undef ink_i32
#undef ink_l_float
#undef ink_l_ink_v2_float
#undef ink_l_ink_v2_int32
#undef ink_l_ink_v2_uint32
#undef ink_l_ink_v3_float
#undef ink_l_ink_v3_int32
#undef ink_l_ink_v3_uint32
#undef ink_l_ink_v4_float
#undef ink_l_ink_v4_int32
#undef ink_l_ink_v4_uint32
#undef ink_l_int32
#undef ink_l_uint32
#undef ink_l_uint64
#undef ink_top
#undef ink_v2_float
#undef ink_v2_int32
#undef ink_v2_uint32
#undef ink_v3_float
#undef ink_v3_int32
#undef ink_v3_uint32
#undef ink_v4_float
#undef ink_v4_int32
#undef ink_v4_uint32
#undef lang_fn_general40_dot_ordered
#define ink_alloc b40_11_ink_alloc
#define ink_block b40_11_ink_block
#define ink_blocks b40_11_ink_blocks
#define ink_compute_call b40_11_ink_compute_call
#define ink_compute_into b40_11_ink_compute_into
#define ink_compute_mark b40_11_ink_compute_mark
#define ink_compute_reset b40_11_ink_compute_reset
#define ink_compute_rewind b40_11_ink_compute_rewind
#define ink_compute_scalar32 b40_11_ink_compute_scalar32
#define ink_compute_scalar64 b40_11_ink_compute_scalar64
#define ink_copy b40_11_ink_copy
#define ink_f32 b40_11_ink_f32
#define ink_fail b40_11_ink_fail
#define ink_i32 b40_11_ink_i32
#define ink_l_float b40_11_ink_l_float
#define ink_l_ink_v2_float b40_11_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b40_11_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b40_11_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b40_11_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b40_11_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b40_11_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b40_11_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b40_11_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b40_11_ink_l_ink_v4_uint32
#define ink_l_int32 b40_11_ink_l_int32
#define ink_l_uint32 b40_11_ink_l_uint32
#define ink_l_uint64 b40_11_ink_l_uint64
#define ink_top b40_11_ink_top
#define ink_v2_float b40_11_ink_v2_float
#define ink_v2_int32 b40_11_ink_v2_int32
#define ink_v2_uint32 b40_11_ink_v2_uint32
#define ink_v3_float b40_11_ink_v3_float
#define ink_v3_int32 b40_11_ink_v3_int32
#define ink_v3_uint32 b40_11_ink_v3_uint32
#define ink_v4_float b40_11_ink_v4_float
#define ink_v4_int32 b40_11_ink_v4_int32
#define ink_v4_uint32 b40_11_ink_v4_uint32
#define lang_fn_general40_gather_reverse b40_11_lang_fn_general40_gather_reverse
#define lang_fn_general40_gather_reverse_into b40_11_lang_fn_general40_gather_reverse_into
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/general/prepared-final/targets/general40_gather_reverse/candidate/cpu.c"
#undef ink_alloc
#undef ink_block
#undef ink_blocks
#undef ink_compute_call
#undef ink_compute_into
#undef ink_compute_mark
#undef ink_compute_reset
#undef ink_compute_rewind
#undef ink_compute_scalar32
#undef ink_compute_scalar64
#undef ink_copy
#undef ink_f32
#undef ink_fail
#undef ink_i32
#undef ink_l_float
#undef ink_l_ink_v2_float
#undef ink_l_ink_v2_int32
#undef ink_l_ink_v2_uint32
#undef ink_l_ink_v3_float
#undef ink_l_ink_v3_int32
#undef ink_l_ink_v3_uint32
#undef ink_l_ink_v4_float
#undef ink_l_ink_v4_int32
#undef ink_l_ink_v4_uint32
#undef ink_l_int32
#undef ink_l_uint32
#undef ink_l_uint64
#undef ink_top
#undef ink_v2_float
#undef ink_v2_int32
#undef ink_v2_uint32
#undef ink_v3_float
#undef ink_v3_int32
#undef ink_v3_uint32
#undef ink_v4_float
#undef ink_v4_int32
#undef ink_v4_uint32
#undef lang_fn_general40_gather_reverse
#undef lang_fn_general40_gather_reverse_into
static uint32_t active;
BenchResult bench_call(uint32_t task,const uint32_t*x,size_t nx,const uint32_t*y,size_t ny,uint32_t seed,uint32_t k,uint32_t*out){active=task;switch(task){case 0:{size_t count=b40_0_lang_fn_general40_affine_into((b40_0_ink_l_uint32){x,nx},(b40_0_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 1:{size_t count=b40_1_lang_fn_general40_compaction_into((b40_1_ink_l_uint32){x,nx},(b40_1_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 2:{size_t count=b40_2_lang_fn_general40_scan_into((b40_2_ink_l_uint32){x,nx},(b40_2_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 3:{size_t count=b40_3_lang_fn_general40_branch_into((b40_3_ink_l_uint32){x,nx},(b40_3_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 4:return(BenchResult){0,0,(uint64_t)b40_4_lang_fn_general40_ordered((b40_4_ink_l_uint32){x,nx},(b40_4_ink_l_uint32){y,ny},seed,k)};case 5:{size_t count=b40_5_lang_fn_general40_stencil_into((b40_5_ink_l_uint32){x,nx},(b40_5_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 6:{size_t count=b40_6_lang_fn_general40_update_into((b40_6_ink_l_uint32){x,nx},(b40_6_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 7:{size_t count=b40_7_lang_fn_general40_update_recompute_into((b40_7_ink_l_uint32){x,nx},(b40_7_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 8:{size_t count=b40_8_lang_fn_general40_compaction_chain_into((b40_8_ink_l_uint32){x,nx},(b40_8_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 9:{size_t count=b40_9_lang_fn_general40_scan_chain_into((b40_9_ink_l_uint32){x,nx},(b40_9_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 10:return(BenchResult){0,0,(uint64_t)b40_10_lang_fn_general40_dot_ordered((b40_10_ink_l_uint32){x,nx},(b40_10_ink_l_uint32){y,ny},seed,k)};case 11:{size_t count=b40_11_lang_fn_general40_gather_reverse_into((b40_11_ink_l_uint32){x,nx},(b40_11_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}default:__builtin_unreachable();}}
void bench_reset(void){switch(active){case 0:b40_0_ink_compute_reset();break;case 1:b40_1_ink_compute_reset();break;case 2:b40_2_ink_compute_reset();break;case 3:b40_3_ink_compute_reset();break;case 4:b40_4_ink_compute_reset();break;case 5:b40_5_ink_compute_reset();break;case 6:b40_6_ink_compute_reset();break;case 7:b40_7_ink_compute_reset();break;case 8:b40_8_ink_compute_reset();break;case 9:b40_9_ink_compute_reset();break;case 10:b40_10_ink_compute_reset();break;case 11:b40_11_ink_compute_reset();break;default:break;}}
