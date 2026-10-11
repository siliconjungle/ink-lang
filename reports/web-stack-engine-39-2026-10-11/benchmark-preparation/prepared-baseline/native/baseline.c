#include <stdint.h>
#include <stddef.h>
typedef struct{const uint32_t*data;size_t len;uint64_t scalar;}BenchResult;
#define ink_alloc b39_0_ink_alloc
#define ink_block b39_0_ink_block
#define ink_blocks b39_0_ink_blocks
#define ink_compute_call b39_0_ink_compute_call
#define ink_compute_into b39_0_ink_compute_into
#define ink_compute_mark b39_0_ink_compute_mark
#define ink_compute_reset b39_0_ink_compute_reset
#define ink_compute_rewind b39_0_ink_compute_rewind
#define ink_compute_scalar32 b39_0_ink_compute_scalar32
#define ink_compute_scalar64 b39_0_ink_compute_scalar64
#define ink_copy b39_0_ink_copy
#define ink_f32 b39_0_ink_f32
#define ink_fail b39_0_ink_fail
#define ink_i32 b39_0_ink_i32
#define ink_l_float b39_0_ink_l_float
#define ink_l_ink_v2_float b39_0_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b39_0_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b39_0_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b39_0_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b39_0_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b39_0_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b39_0_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b39_0_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b39_0_ink_l_ink_v4_uint32
#define ink_l_int32 b39_0_ink_l_int32
#define ink_l_uint32 b39_0_ink_l_uint32
#define ink_l_uint64 b39_0_ink_l_uint64
#define ink_top b39_0_ink_top
#define ink_v2_float b39_0_ink_v2_float
#define ink_v2_int32 b39_0_ink_v2_int32
#define ink_v2_uint32 b39_0_ink_v2_uint32
#define ink_v3_float b39_0_ink_v3_float
#define ink_v3_int32 b39_0_ink_v3_int32
#define ink_v3_uint32 b39_0_ink_v3_uint32
#define ink_v4_float b39_0_ink_v4_float
#define ink_v4_int32 b39_0_ink_v4_int32
#define ink_v4_uint32 b39_0_ink_v4_uint32
#define lang_fn_general39_affine b39_0_lang_fn_general39_affine
#define lang_fn_general39_affine_into b39_0_lang_fn_general39_affine_into
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-39-2026-10-11/benchmark-preparation/prepared-baseline/targets/general39_affine/baseline/cpu.c"
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
#undef lang_fn_general39_affine
#undef lang_fn_general39_affine_into
#define ink_alloc b39_1_ink_alloc
#define ink_block b39_1_ink_block
#define ink_blocks b39_1_ink_blocks
#define ink_compute_call b39_1_ink_compute_call
#define ink_compute_into b39_1_ink_compute_into
#define ink_compute_mark b39_1_ink_compute_mark
#define ink_compute_reset b39_1_ink_compute_reset
#define ink_compute_rewind b39_1_ink_compute_rewind
#define ink_compute_scalar32 b39_1_ink_compute_scalar32
#define ink_compute_scalar64 b39_1_ink_compute_scalar64
#define ink_copy b39_1_ink_copy
#define ink_f32 b39_1_ink_f32
#define ink_fail b39_1_ink_fail
#define ink_i32 b39_1_ink_i32
#define ink_l_float b39_1_ink_l_float
#define ink_l_ink_v2_float b39_1_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b39_1_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b39_1_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b39_1_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b39_1_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b39_1_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b39_1_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b39_1_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b39_1_ink_l_ink_v4_uint32
#define ink_l_int32 b39_1_ink_l_int32
#define ink_l_uint32 b39_1_ink_l_uint32
#define ink_l_uint64 b39_1_ink_l_uint64
#define ink_top b39_1_ink_top
#define ink_v2_float b39_1_ink_v2_float
#define ink_v2_int32 b39_1_ink_v2_int32
#define ink_v2_uint32 b39_1_ink_v2_uint32
#define ink_v3_float b39_1_ink_v3_float
#define ink_v3_int32 b39_1_ink_v3_int32
#define ink_v3_uint32 b39_1_ink_v3_uint32
#define ink_v4_float b39_1_ink_v4_float
#define ink_v4_int32 b39_1_ink_v4_int32
#define ink_v4_uint32 b39_1_ink_v4_uint32
#define lang_fn_general39_compaction b39_1_lang_fn_general39_compaction
#define lang_fn_general39_compaction_into b39_1_lang_fn_general39_compaction_into
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-39-2026-10-11/benchmark-preparation/prepared-baseline/targets/general39_compaction/baseline/cpu.c"
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
#undef lang_fn_general39_compaction
#undef lang_fn_general39_compaction_into
#define ink_alloc b39_2_ink_alloc
#define ink_block b39_2_ink_block
#define ink_blocks b39_2_ink_blocks
#define ink_compute_call b39_2_ink_compute_call
#define ink_compute_into b39_2_ink_compute_into
#define ink_compute_mark b39_2_ink_compute_mark
#define ink_compute_reset b39_2_ink_compute_reset
#define ink_compute_rewind b39_2_ink_compute_rewind
#define ink_compute_scalar32 b39_2_ink_compute_scalar32
#define ink_compute_scalar64 b39_2_ink_compute_scalar64
#define ink_copy b39_2_ink_copy
#define ink_f32 b39_2_ink_f32
#define ink_fail b39_2_ink_fail
#define ink_i32 b39_2_ink_i32
#define ink_l_float b39_2_ink_l_float
#define ink_l_ink_v2_float b39_2_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b39_2_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b39_2_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b39_2_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b39_2_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b39_2_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b39_2_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b39_2_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b39_2_ink_l_ink_v4_uint32
#define ink_l_int32 b39_2_ink_l_int32
#define ink_l_uint32 b39_2_ink_l_uint32
#define ink_l_uint64 b39_2_ink_l_uint64
#define ink_top b39_2_ink_top
#define ink_v2_float b39_2_ink_v2_float
#define ink_v2_int32 b39_2_ink_v2_int32
#define ink_v2_uint32 b39_2_ink_v2_uint32
#define ink_v3_float b39_2_ink_v3_float
#define ink_v3_int32 b39_2_ink_v3_int32
#define ink_v3_uint32 b39_2_ink_v3_uint32
#define ink_v4_float b39_2_ink_v4_float
#define ink_v4_int32 b39_2_ink_v4_int32
#define ink_v4_uint32 b39_2_ink_v4_uint32
#define lang_fn_general39_scan b39_2_lang_fn_general39_scan
#define lang_fn_general39_scan_into b39_2_lang_fn_general39_scan_into
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-39-2026-10-11/benchmark-preparation/prepared-baseline/targets/general39_scan/baseline/cpu.c"
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
#undef lang_fn_general39_scan
#undef lang_fn_general39_scan_into
#define ink_alloc b39_3_ink_alloc
#define ink_block b39_3_ink_block
#define ink_blocks b39_3_ink_blocks
#define ink_compute_call b39_3_ink_compute_call
#define ink_compute_into b39_3_ink_compute_into
#define ink_compute_mark b39_3_ink_compute_mark
#define ink_compute_reset b39_3_ink_compute_reset
#define ink_compute_rewind b39_3_ink_compute_rewind
#define ink_compute_scalar32 b39_3_ink_compute_scalar32
#define ink_compute_scalar64 b39_3_ink_compute_scalar64
#define ink_copy b39_3_ink_copy
#define ink_f32 b39_3_ink_f32
#define ink_fail b39_3_ink_fail
#define ink_i32 b39_3_ink_i32
#define ink_l_float b39_3_ink_l_float
#define ink_l_ink_v2_float b39_3_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b39_3_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b39_3_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b39_3_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b39_3_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b39_3_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b39_3_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b39_3_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b39_3_ink_l_ink_v4_uint32
#define ink_l_int32 b39_3_ink_l_int32
#define ink_l_uint32 b39_3_ink_l_uint32
#define ink_l_uint64 b39_3_ink_l_uint64
#define ink_top b39_3_ink_top
#define ink_v2_float b39_3_ink_v2_float
#define ink_v2_int32 b39_3_ink_v2_int32
#define ink_v2_uint32 b39_3_ink_v2_uint32
#define ink_v3_float b39_3_ink_v3_float
#define ink_v3_int32 b39_3_ink_v3_int32
#define ink_v3_uint32 b39_3_ink_v3_uint32
#define ink_v4_float b39_3_ink_v4_float
#define ink_v4_int32 b39_3_ink_v4_int32
#define ink_v4_uint32 b39_3_ink_v4_uint32
#define lang_fn_general39_branch b39_3_lang_fn_general39_branch
#define lang_fn_general39_branch_into b39_3_lang_fn_general39_branch_into
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-39-2026-10-11/benchmark-preparation/prepared-baseline/targets/general39_branch/baseline/cpu.c"
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
#undef lang_fn_general39_branch
#undef lang_fn_general39_branch_into
#define ink_alloc b39_4_ink_alloc
#define ink_block b39_4_ink_block
#define ink_blocks b39_4_ink_blocks
#define ink_compute_call b39_4_ink_compute_call
#define ink_compute_into b39_4_ink_compute_into
#define ink_compute_mark b39_4_ink_compute_mark
#define ink_compute_reset b39_4_ink_compute_reset
#define ink_compute_rewind b39_4_ink_compute_rewind
#define ink_compute_scalar32 b39_4_ink_compute_scalar32
#define ink_compute_scalar64 b39_4_ink_compute_scalar64
#define ink_copy b39_4_ink_copy
#define ink_f32 b39_4_ink_f32
#define ink_fail b39_4_ink_fail
#define ink_i32 b39_4_ink_i32
#define ink_l_float b39_4_ink_l_float
#define ink_l_ink_v2_float b39_4_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b39_4_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b39_4_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b39_4_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b39_4_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b39_4_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b39_4_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b39_4_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b39_4_ink_l_ink_v4_uint32
#define ink_l_int32 b39_4_ink_l_int32
#define ink_l_uint32 b39_4_ink_l_uint32
#define ink_l_uint64 b39_4_ink_l_uint64
#define ink_top b39_4_ink_top
#define ink_v2_float b39_4_ink_v2_float
#define ink_v2_int32 b39_4_ink_v2_int32
#define ink_v2_uint32 b39_4_ink_v2_uint32
#define ink_v3_float b39_4_ink_v3_float
#define ink_v3_int32 b39_4_ink_v3_int32
#define ink_v3_uint32 b39_4_ink_v3_uint32
#define ink_v4_float b39_4_ink_v4_float
#define ink_v4_int32 b39_4_ink_v4_int32
#define ink_v4_uint32 b39_4_ink_v4_uint32
#define lang_fn_general39_ordered b39_4_lang_fn_general39_ordered
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-39-2026-10-11/benchmark-preparation/prepared-baseline/targets/general39_ordered/baseline/cpu.c"
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
#undef lang_fn_general39_ordered
#define ink_alloc b39_5_ink_alloc
#define ink_block b39_5_ink_block
#define ink_blocks b39_5_ink_blocks
#define ink_compute_call b39_5_ink_compute_call
#define ink_compute_into b39_5_ink_compute_into
#define ink_compute_mark b39_5_ink_compute_mark
#define ink_compute_reset b39_5_ink_compute_reset
#define ink_compute_rewind b39_5_ink_compute_rewind
#define ink_compute_scalar32 b39_5_ink_compute_scalar32
#define ink_compute_scalar64 b39_5_ink_compute_scalar64
#define ink_copy b39_5_ink_copy
#define ink_f32 b39_5_ink_f32
#define ink_fail b39_5_ink_fail
#define ink_i32 b39_5_ink_i32
#define ink_l_float b39_5_ink_l_float
#define ink_l_ink_v2_float b39_5_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b39_5_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b39_5_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b39_5_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b39_5_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b39_5_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b39_5_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b39_5_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b39_5_ink_l_ink_v4_uint32
#define ink_l_int32 b39_5_ink_l_int32
#define ink_l_uint32 b39_5_ink_l_uint32
#define ink_l_uint64 b39_5_ink_l_uint64
#define ink_top b39_5_ink_top
#define ink_v2_float b39_5_ink_v2_float
#define ink_v2_int32 b39_5_ink_v2_int32
#define ink_v2_uint32 b39_5_ink_v2_uint32
#define ink_v3_float b39_5_ink_v3_float
#define ink_v3_int32 b39_5_ink_v3_int32
#define ink_v3_uint32 b39_5_ink_v3_uint32
#define ink_v4_float b39_5_ink_v4_float
#define ink_v4_int32 b39_5_ink_v4_int32
#define ink_v4_uint32 b39_5_ink_v4_uint32
#define lang_fn_general39_stencil b39_5_lang_fn_general39_stencil
#define lang_fn_general39_stencil_into b39_5_lang_fn_general39_stencil_into
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-39-2026-10-11/benchmark-preparation/prepared-baseline/targets/general39_stencil/baseline/cpu.c"
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
#undef lang_fn_general39_stencil
#undef lang_fn_general39_stencil_into
#define ink_alloc b39_6_ink_alloc
#define ink_block b39_6_ink_block
#define ink_blocks b39_6_ink_blocks
#define ink_compute_call b39_6_ink_compute_call
#define ink_compute_into b39_6_ink_compute_into
#define ink_compute_mark b39_6_ink_compute_mark
#define ink_compute_reset b39_6_ink_compute_reset
#define ink_compute_rewind b39_6_ink_compute_rewind
#define ink_compute_scalar32 b39_6_ink_compute_scalar32
#define ink_compute_scalar64 b39_6_ink_compute_scalar64
#define ink_copy b39_6_ink_copy
#define ink_f32 b39_6_ink_f32
#define ink_fail b39_6_ink_fail
#define ink_i32 b39_6_ink_i32
#define ink_l_float b39_6_ink_l_float
#define ink_l_ink_v2_float b39_6_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b39_6_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b39_6_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b39_6_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b39_6_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b39_6_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b39_6_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b39_6_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b39_6_ink_l_ink_v4_uint32
#define ink_l_int32 b39_6_ink_l_int32
#define ink_l_uint32 b39_6_ink_l_uint32
#define ink_l_uint64 b39_6_ink_l_uint64
#define ink_top b39_6_ink_top
#define ink_v2_float b39_6_ink_v2_float
#define ink_v2_int32 b39_6_ink_v2_int32
#define ink_v2_uint32 b39_6_ink_v2_uint32
#define ink_v3_float b39_6_ink_v3_float
#define ink_v3_int32 b39_6_ink_v3_int32
#define ink_v3_uint32 b39_6_ink_v3_uint32
#define ink_v4_float b39_6_ink_v4_float
#define ink_v4_int32 b39_6_ink_v4_int32
#define ink_v4_uint32 b39_6_ink_v4_uint32
#define lang_fn_general39_update b39_6_lang_fn_general39_update
#define lang_fn_general39_update_into b39_6_lang_fn_general39_update_into
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-39-2026-10-11/benchmark-preparation/prepared-baseline/targets/general39_update/baseline/cpu.c"
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
#undef lang_fn_general39_update
#undef lang_fn_general39_update_into
#define ink_alloc b39_7_ink_alloc
#define ink_block b39_7_ink_block
#define ink_blocks b39_7_ink_blocks
#define ink_compute_call b39_7_ink_compute_call
#define ink_compute_into b39_7_ink_compute_into
#define ink_compute_mark b39_7_ink_compute_mark
#define ink_compute_reset b39_7_ink_compute_reset
#define ink_compute_rewind b39_7_ink_compute_rewind
#define ink_compute_scalar32 b39_7_ink_compute_scalar32
#define ink_compute_scalar64 b39_7_ink_compute_scalar64
#define ink_copy b39_7_ink_copy
#define ink_f32 b39_7_ink_f32
#define ink_fail b39_7_ink_fail
#define ink_i32 b39_7_ink_i32
#define ink_l_float b39_7_ink_l_float
#define ink_l_ink_v2_float b39_7_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b39_7_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b39_7_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b39_7_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b39_7_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b39_7_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b39_7_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b39_7_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b39_7_ink_l_ink_v4_uint32
#define ink_l_int32 b39_7_ink_l_int32
#define ink_l_uint32 b39_7_ink_l_uint32
#define ink_l_uint64 b39_7_ink_l_uint64
#define ink_top b39_7_ink_top
#define ink_v2_float b39_7_ink_v2_float
#define ink_v2_int32 b39_7_ink_v2_int32
#define ink_v2_uint32 b39_7_ink_v2_uint32
#define ink_v3_float b39_7_ink_v3_float
#define ink_v3_int32 b39_7_ink_v3_int32
#define ink_v3_uint32 b39_7_ink_v3_uint32
#define ink_v4_float b39_7_ink_v4_float
#define ink_v4_int32 b39_7_ink_v4_int32
#define ink_v4_uint32 b39_7_ink_v4_uint32
#define lang_fn_general39_update_recompute b39_7_lang_fn_general39_update_recompute
#define lang_fn_general39_update_recompute_into b39_7_lang_fn_general39_update_recompute_into
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-39-2026-10-11/benchmark-preparation/prepared-baseline/targets/general39_update_recompute/baseline/cpu.c"
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
#undef lang_fn_general39_update_recompute
#undef lang_fn_general39_update_recompute_into
static uint32_t active;
BenchResult bench_call(uint32_t task,const uint32_t*x,size_t nx,const uint32_t*y,size_t ny,uint32_t seed,uint32_t k,uint32_t*out){active=task;switch(task){case 0:{size_t count=b39_0_lang_fn_general39_affine_into((b39_0_ink_l_uint32){x,nx},(b39_0_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 1:{size_t count=b39_1_lang_fn_general39_compaction_into((b39_1_ink_l_uint32){x,nx},(b39_1_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 2:{size_t count=b39_2_lang_fn_general39_scan_into((b39_2_ink_l_uint32){x,nx},(b39_2_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 3:{size_t count=b39_3_lang_fn_general39_branch_into((b39_3_ink_l_uint32){x,nx},(b39_3_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 4:return(BenchResult){0,0,(uint64_t)b39_4_lang_fn_general39_ordered((b39_4_ink_l_uint32){x,nx},(b39_4_ink_l_uint32){y,ny},seed,k)};case 5:{size_t count=b39_5_lang_fn_general39_stencil_into((b39_5_ink_l_uint32){x,nx},(b39_5_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 6:{size_t count=b39_6_lang_fn_general39_update_into((b39_6_ink_l_uint32){x,nx},(b39_6_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 7:{size_t count=b39_7_lang_fn_general39_update_recompute_into((b39_7_ink_l_uint32){x,nx},(b39_7_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}default:__builtin_unreachable();}}
void bench_reset(void){switch(active){case 0:b39_0_ink_compute_reset();break;case 1:b39_1_ink_compute_reset();break;case 2:b39_2_ink_compute_reset();break;case 3:b39_3_ink_compute_reset();break;case 4:b39_4_ink_compute_reset();break;case 5:b39_5_ink_compute_reset();break;case 6:b39_6_ink_compute_reset();break;case 7:b39_7_ink_compute_reset();break;default:break;}}
