#include <stdint.h>
#include <stddef.h>
typedef struct{const uint32_t*data;size_t len;uint64_t scalar;}BenchResult;
#define ink_alloc b33_0_ink_alloc
#define ink_block b33_0_ink_block
#define ink_blocks b33_0_ink_blocks
#define ink_compute_call b33_0_ink_compute_call
#define ink_compute_into b33_0_ink_compute_into
#define ink_compute_mark b33_0_ink_compute_mark
#define ink_compute_reset b33_0_ink_compute_reset
#define ink_compute_rewind b33_0_ink_compute_rewind
#define ink_compute_scalar32 b33_0_ink_compute_scalar32
#define ink_compute_scalar64 b33_0_ink_compute_scalar64
#define ink_copy b33_0_ink_copy
#define ink_f32 b33_0_ink_f32
#define ink_fail b33_0_ink_fail
#define ink_i32 b33_0_ink_i32
#define ink_l_float b33_0_ink_l_float
#define ink_l_ink_v2_float b33_0_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b33_0_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b33_0_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b33_0_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b33_0_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b33_0_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b33_0_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b33_0_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b33_0_ink_l_ink_v4_uint32
#define ink_l_int32 b33_0_ink_l_int32
#define ink_l_uint32 b33_0_ink_l_uint32
#define ink_l_uint64 b33_0_ink_l_uint64
#define ink_top b33_0_ink_top
#define ink_v2_float b33_0_ink_v2_float
#define ink_v2_int32 b33_0_ink_v2_int32
#define ink_v2_uint32 b33_0_ink_v2_uint32
#define ink_v3_float b33_0_ink_v3_float
#define ink_v3_int32 b33_0_ink_v3_int32
#define ink_v3_uint32 b33_0_ink_v3_uint32
#define ink_v4_float b33_0_ink_v4_float
#define ink_v4_int32 b33_0_ink_v4_int32
#define ink_v4_uint32 b33_0_ink_v4_uint32
#define lang_fn_pipeline33_left_projection_u32 b33_0_lang_fn_pipeline33_left_projection_u32
#define lang_fn_pipeline33_left_projection_u32_into b33_0_lang_fn_pipeline33_left_projection_u32_into
#define lang_fn_selected_word b33_0_lang_fn_selected_word
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-33-2026-10-11/targets-direct/targets/pipeline33_left_projection_u32/prior/cpu.c"
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
#undef lang_fn_pipeline33_left_projection_u32
#undef lang_fn_pipeline33_left_projection_u32_into
#undef lang_fn_selected_word
#define ink_alloc b33_1_ink_alloc
#define ink_block b33_1_ink_block
#define ink_blocks b33_1_ink_blocks
#define ink_compute_call b33_1_ink_compute_call
#define ink_compute_into b33_1_ink_compute_into
#define ink_compute_mark b33_1_ink_compute_mark
#define ink_compute_reset b33_1_ink_compute_reset
#define ink_compute_rewind b33_1_ink_compute_rewind
#define ink_compute_scalar32 b33_1_ink_compute_scalar32
#define ink_compute_scalar64 b33_1_ink_compute_scalar64
#define ink_copy b33_1_ink_copy
#define ink_f32 b33_1_ink_f32
#define ink_fail b33_1_ink_fail
#define ink_i32 b33_1_ink_i32
#define ink_l_float b33_1_ink_l_float
#define ink_l_ink_v2_float b33_1_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b33_1_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b33_1_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b33_1_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b33_1_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b33_1_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b33_1_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b33_1_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b33_1_ink_l_ink_v4_uint32
#define ink_l_int32 b33_1_ink_l_int32
#define ink_l_uint32 b33_1_ink_l_uint32
#define ink_l_uint64 b33_1_ink_l_uint64
#define ink_top b33_1_ink_top
#define ink_v2_float b33_1_ink_v2_float
#define ink_v2_int32 b33_1_ink_v2_int32
#define ink_v2_uint32 b33_1_ink_v2_uint32
#define ink_v3_float b33_1_ink_v3_float
#define ink_v3_int32 b33_1_ink_v3_int32
#define ink_v3_uint32 b33_1_ink_v3_uint32
#define ink_v4_float b33_1_ink_v4_float
#define ink_v4_int32 b33_1_ink_v4_int32
#define ink_v4_uint32 b33_1_ink_v4_uint32
#define lang_fn_pipeline33_right_projection_u32 b33_1_lang_fn_pipeline33_right_projection_u32
#define lang_fn_pipeline33_right_projection_u32_into b33_1_lang_fn_pipeline33_right_projection_u32_into
#define lang_fn_selected_word b33_1_lang_fn_selected_word
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-33-2026-10-11/targets-direct/targets/pipeline33_right_projection_u32/prior/cpu.c"
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
#undef lang_fn_pipeline33_right_projection_u32
#undef lang_fn_pipeline33_right_projection_u32_into
#undef lang_fn_selected_word
#define ink_alloc b33_2_ink_alloc
#define ink_block b33_2_ink_block
#define ink_blocks b33_2_ink_blocks
#define ink_compute_call b33_2_ink_compute_call
#define ink_compute_into b33_2_ink_compute_into
#define ink_compute_mark b33_2_ink_compute_mark
#define ink_compute_reset b33_2_ink_compute_reset
#define ink_compute_rewind b33_2_ink_compute_rewind
#define ink_compute_scalar32 b33_2_ink_compute_scalar32
#define ink_compute_scalar64 b33_2_ink_compute_scalar64
#define ink_copy b33_2_ink_copy
#define ink_f32 b33_2_ink_f32
#define ink_fail b33_2_ink_fail
#define ink_i32 b33_2_ink_i32
#define ink_l_float b33_2_ink_l_float
#define ink_l_ink_v2_float b33_2_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b33_2_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b33_2_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b33_2_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b33_2_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b33_2_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b33_2_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b33_2_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b33_2_ink_l_ink_v4_uint32
#define ink_l_int32 b33_2_ink_l_int32
#define ink_l_uint32 b33_2_ink_l_uint32
#define ink_l_uint64 b33_2_ink_l_uint64
#define ink_top b33_2_ink_top
#define ink_v2_float b33_2_ink_v2_float
#define ink_v2_int32 b33_2_ink_v2_int32
#define ink_v2_uint32 b33_2_ink_v2_uint32
#define ink_v3_float b33_2_ink_v3_float
#define ink_v3_int32 b33_2_ink_v3_int32
#define ink_v3_uint32 b33_2_ink_v3_uint32
#define ink_v4_float b33_2_ink_v4_float
#define ink_v4_int32 b33_2_ink_v4_int32
#define ink_v4_uint32 b33_2_ink_v4_uint32
#define lang_fn_discarded_word b33_2_lang_fn_discarded_word
#define lang_fn_pipeline33_left_projection_heldout_u32 b33_2_lang_fn_pipeline33_left_projection_heldout_u32
#define lang_fn_pipeline33_left_projection_heldout_u32_into b33_2_lang_fn_pipeline33_left_projection_heldout_u32_into
#define lang_fn_selected_word b33_2_lang_fn_selected_word
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-33-2026-10-11/targets-direct/targets/pipeline33_left_projection_heldout_u32/prior/cpu.c"
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
#undef lang_fn_discarded_word
#undef lang_fn_pipeline33_left_projection_heldout_u32
#undef lang_fn_pipeline33_left_projection_heldout_u32_into
#undef lang_fn_selected_word
#define ink_alloc b33_3_ink_alloc
#define ink_block b33_3_ink_block
#define ink_blocks b33_3_ink_blocks
#define ink_compute_call b33_3_ink_compute_call
#define ink_compute_into b33_3_ink_compute_into
#define ink_compute_mark b33_3_ink_compute_mark
#define ink_compute_reset b33_3_ink_compute_reset
#define ink_compute_rewind b33_3_ink_compute_rewind
#define ink_compute_scalar32 b33_3_ink_compute_scalar32
#define ink_compute_scalar64 b33_3_ink_compute_scalar64
#define ink_copy b33_3_ink_copy
#define ink_f32 b33_3_ink_f32
#define ink_fail b33_3_ink_fail
#define ink_i32 b33_3_ink_i32
#define ink_l_float b33_3_ink_l_float
#define ink_l_ink_v2_float b33_3_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b33_3_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b33_3_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b33_3_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b33_3_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b33_3_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b33_3_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b33_3_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b33_3_ink_l_ink_v4_uint32
#define ink_l_int32 b33_3_ink_l_int32
#define ink_l_uint32 b33_3_ink_l_uint32
#define ink_l_uint64 b33_3_ink_l_uint64
#define ink_top b33_3_ink_top
#define ink_v2_float b33_3_ink_v2_float
#define ink_v2_int32 b33_3_ink_v2_int32
#define ink_v2_uint32 b33_3_ink_v2_uint32
#define ink_v3_float b33_3_ink_v3_float
#define ink_v3_int32 b33_3_ink_v3_int32
#define ink_v3_uint32 b33_3_ink_v3_uint32
#define ink_v4_float b33_3_ink_v4_float
#define ink_v4_int32 b33_3_ink_v4_int32
#define ink_v4_uint32 b33_3_ink_v4_uint32
#define lang_fn_discarded_word b33_3_lang_fn_discarded_word
#define lang_fn_pipeline33_right_projection_heldout_u32 b33_3_lang_fn_pipeline33_right_projection_heldout_u32
#define lang_fn_pipeline33_right_projection_heldout_u32_into b33_3_lang_fn_pipeline33_right_projection_heldout_u32_into
#define lang_fn_selected_word b33_3_lang_fn_selected_word
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-33-2026-10-11/targets-direct/targets/pipeline33_right_projection_heldout_u32/prior/cpu.c"
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
#undef lang_fn_discarded_word
#undef lang_fn_pipeline33_right_projection_heldout_u32
#undef lang_fn_pipeline33_right_projection_heldout_u32_into
#undef lang_fn_selected_word
static uint32_t active;
BenchResult bench_call(uint32_t task,const uint32_t*x,size_t nx,const uint32_t*y,size_t ny,uint32_t seed,uint32_t k,uint32_t*out){active=task;switch(task){case 0:{size_t count=b33_0_lang_fn_pipeline33_left_projection_u32_into((b33_0_ink_l_uint32){x,nx},(b33_0_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 1:{size_t count=b33_1_lang_fn_pipeline33_right_projection_u32_into((b33_1_ink_l_uint32){x,nx},(b33_1_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 2:{size_t count=b33_2_lang_fn_pipeline33_left_projection_heldout_u32_into((b33_2_ink_l_uint32){x,nx},(b33_2_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}case 3:{size_t count=b33_3_lang_fn_pipeline33_right_projection_heldout_u32_into((b33_3_ink_l_uint32){x,nx},(b33_3_ink_l_uint32){y,ny},seed,k,out);return(BenchResult){out,count,0};}default:__builtin_unreachable();}}
void bench_reset(void){switch(active){case 0:b33_0_ink_compute_reset();break;case 1:b33_1_ink_compute_reset();break;case 2:b33_2_ink_compute_reset();break;case 3:b33_3_ink_compute_reset();break;default:break;}}
