#include <stdint.h>
#include <stddef.h>
typedef struct{const uint32_t*data;size_t len;uint64_t scalar;}BenchResult;
#define ink_alloc b36_0_ink_alloc
#define ink_block b36_0_ink_block
#define ink_blocks b36_0_ink_blocks
#define ink_compute_call b36_0_ink_compute_call
#define ink_compute_into b36_0_ink_compute_into
#define ink_compute_mark b36_0_ink_compute_mark
#define ink_compute_reset b36_0_ink_compute_reset
#define ink_compute_rewind b36_0_ink_compute_rewind
#define ink_compute_scalar32 b36_0_ink_compute_scalar32
#define ink_compute_scalar64 b36_0_ink_compute_scalar64
#define ink_copy b36_0_ink_copy
#define ink_f32 b36_0_ink_f32
#define ink_fail b36_0_ink_fail
#define ink_i32 b36_0_ink_i32
#define ink_l_float b36_0_ink_l_float
#define ink_l_ink_v2_float b36_0_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b36_0_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b36_0_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b36_0_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b36_0_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b36_0_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b36_0_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b36_0_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b36_0_ink_l_ink_v4_uint32
#define ink_l_int32 b36_0_ink_l_int32
#define ink_l_uint32 b36_0_ink_l_uint32
#define ink_l_uint64 b36_0_ink_l_uint64
#define ink_top b36_0_ink_top
#define ink_v2_float b36_0_ink_v2_float
#define ink_v2_int32 b36_0_ink_v2_int32
#define ink_v2_uint32 b36_0_ink_v2_uint32
#define ink_v3_float b36_0_ink_v3_float
#define ink_v3_int32 b36_0_ink_v3_int32
#define ink_v3_uint32 b36_0_ink_v3_uint32
#define ink_v4_float b36_0_ink_v4_float
#define ink_v4_int32 b36_0_ink_v4_int32
#define ink_v4_uint32 b36_0_ink_v4_uint32
#define lang_fn_calibrate_left b36_0_lang_fn_calibrate_left
#define lang_fn_calibrate_right b36_0_lang_fn_calibrate_right
#define lang_fn_left_word b36_0_lang_fn_left_word
#define lang_fn_mix_word b36_0_lang_fn_mix_word
#define lang_fn_pipeline36_plain_ordered_u32 b36_0_lang_fn_pipeline36_plain_ordered_u32
#define lang_fn_reduce_word b36_0_lang_fn_reduce_word
#define lang_fn_right_word b36_0_lang_fn_right_word
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-36-2026-10-11/targets-measured/targets/pipeline36_plain_ordered_u32/prior/cpu.c"
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
#undef lang_fn_calibrate_left
#undef lang_fn_calibrate_right
#undef lang_fn_left_word
#undef lang_fn_mix_word
#undef lang_fn_pipeline36_plain_ordered_u32
#undef lang_fn_reduce_word
#undef lang_fn_right_word
#define ink_alloc b36_1_ink_alloc
#define ink_block b36_1_ink_block
#define ink_blocks b36_1_ink_blocks
#define ink_compute_call b36_1_ink_compute_call
#define ink_compute_into b36_1_ink_compute_into
#define ink_compute_mark b36_1_ink_compute_mark
#define ink_compute_reset b36_1_ink_compute_reset
#define ink_compute_rewind b36_1_ink_compute_rewind
#define ink_compute_scalar32 b36_1_ink_compute_scalar32
#define ink_compute_scalar64 b36_1_ink_compute_scalar64
#define ink_copy b36_1_ink_copy
#define ink_f32 b36_1_ink_f32
#define ink_fail b36_1_ink_fail
#define ink_i32 b36_1_ink_i32
#define ink_l_float b36_1_ink_l_float
#define ink_l_ink_v2_float b36_1_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b36_1_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b36_1_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b36_1_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b36_1_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b36_1_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b36_1_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b36_1_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b36_1_ink_l_ink_v4_uint32
#define ink_l_int32 b36_1_ink_l_int32
#define ink_l_uint32 b36_1_ink_l_uint32
#define ink_l_uint64 b36_1_ink_l_uint64
#define ink_top b36_1_ink_top
#define ink_v2_float b36_1_ink_v2_float
#define ink_v2_int32 b36_1_ink_v2_int32
#define ink_v2_uint32 b36_1_ink_v2_uint32
#define ink_v3_float b36_1_ink_v3_float
#define ink_v3_int32 b36_1_ink_v3_int32
#define ink_v3_uint32 b36_1_ink_v3_uint32
#define ink_v4_float b36_1_ink_v4_float
#define ink_v4_int32 b36_1_ink_v4_int32
#define ink_v4_uint32 b36_1_ink_v4_uint32
#define lang_fn_calibrate_left b36_1_lang_fn_calibrate_left
#define lang_fn_calibrate_right b36_1_lang_fn_calibrate_right
#define lang_fn_left_word b36_1_lang_fn_left_word
#define lang_fn_mix_word b36_1_lang_fn_mix_word
#define lang_fn_pipeline36_nested_ordered_u32 b36_1_lang_fn_pipeline36_nested_ordered_u32
#define lang_fn_post_word b36_1_lang_fn_post_word
#define lang_fn_reduce_word b36_1_lang_fn_reduce_word
#define lang_fn_repair_word b36_1_lang_fn_repair_word
#define lang_fn_right_word b36_1_lang_fn_right_word
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-36-2026-10-11/targets-measured/targets/pipeline36_nested_ordered_u32/prior/cpu.c"
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
#undef lang_fn_calibrate_left
#undef lang_fn_calibrate_right
#undef lang_fn_left_word
#undef lang_fn_mix_word
#undef lang_fn_pipeline36_nested_ordered_u32
#undef lang_fn_post_word
#undef lang_fn_reduce_word
#undef lang_fn_repair_word
#undef lang_fn_right_word
#define ink_alloc b36_2_ink_alloc
#define ink_block b36_2_ink_block
#define ink_blocks b36_2_ink_blocks
#define ink_compute_call b36_2_ink_compute_call
#define ink_compute_into b36_2_ink_compute_into
#define ink_compute_mark b36_2_ink_compute_mark
#define ink_compute_reset b36_2_ink_compute_reset
#define ink_compute_rewind b36_2_ink_compute_rewind
#define ink_compute_scalar32 b36_2_ink_compute_scalar32
#define ink_compute_scalar64 b36_2_ink_compute_scalar64
#define ink_copy b36_2_ink_copy
#define ink_f32 b36_2_ink_f32
#define ink_fail b36_2_ink_fail
#define ink_i32 b36_2_ink_i32
#define ink_l_float b36_2_ink_l_float
#define ink_l_ink_v2_float b36_2_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b36_2_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b36_2_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b36_2_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b36_2_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b36_2_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b36_2_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b36_2_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b36_2_ink_l_ink_v4_uint32
#define ink_l_int32 b36_2_ink_l_int32
#define ink_l_uint32 b36_2_ink_l_uint32
#define ink_l_uint64 b36_2_ink_l_uint64
#define ink_top b36_2_ink_top
#define ink_v2_float b36_2_ink_v2_float
#define ink_v2_int32 b36_2_ink_v2_int32
#define ink_v2_uint32 b36_2_ink_v2_uint32
#define ink_v3_float b36_2_ink_v3_float
#define ink_v3_int32 b36_2_ink_v3_int32
#define ink_v3_uint32 b36_2_ink_v3_uint32
#define ink_v4_float b36_2_ink_v4_float
#define ink_v4_int32 b36_2_ink_v4_int32
#define ink_v4_uint32 b36_2_ink_v4_uint32
#define lang_fn_acceptance_test b36_2_lang_fn_acceptance_test
#define lang_fn_accepts_word b36_2_lang_fn_accepts_word
#define lang_fn_calibrate_left b36_2_lang_fn_calibrate_left
#define lang_fn_calibrate_right b36_2_lang_fn_calibrate_right
#define lang_fn_left_word b36_2_lang_fn_left_word
#define lang_fn_mix_word b36_2_lang_fn_mix_word
#define lang_fn_pipeline36_filtered_ordered_heldout_u32 b36_2_lang_fn_pipeline36_filtered_ordered_heldout_u32
#define lang_fn_reduce_word b36_2_lang_fn_reduce_word
#define lang_fn_right_word b36_2_lang_fn_right_word
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-36-2026-10-11/targets-measured/targets/pipeline36_filtered_ordered_heldout_u32/prior/cpu.c"
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
#undef lang_fn_acceptance_test
#undef lang_fn_accepts_word
#undef lang_fn_calibrate_left
#undef lang_fn_calibrate_right
#undef lang_fn_left_word
#undef lang_fn_mix_word
#undef lang_fn_pipeline36_filtered_ordered_heldout_u32
#undef lang_fn_reduce_word
#undef lang_fn_right_word
#define ink_alloc b36_3_ink_alloc
#define ink_block b36_3_ink_block
#define ink_blocks b36_3_ink_blocks
#define ink_compute_call b36_3_ink_compute_call
#define ink_compute_into b36_3_ink_compute_into
#define ink_compute_mark b36_3_ink_compute_mark
#define ink_compute_reset b36_3_ink_compute_reset
#define ink_compute_rewind b36_3_ink_compute_rewind
#define ink_compute_scalar32 b36_3_ink_compute_scalar32
#define ink_compute_scalar64 b36_3_ink_compute_scalar64
#define ink_copy b36_3_ink_copy
#define ink_f32 b36_3_ink_f32
#define ink_fail b36_3_ink_fail
#define ink_i32 b36_3_ink_i32
#define ink_l_float b36_3_ink_l_float
#define ink_l_ink_v2_float b36_3_ink_l_ink_v2_float
#define ink_l_ink_v2_int32 b36_3_ink_l_ink_v2_int32
#define ink_l_ink_v2_uint32 b36_3_ink_l_ink_v2_uint32
#define ink_l_ink_v3_float b36_3_ink_l_ink_v3_float
#define ink_l_ink_v3_int32 b36_3_ink_l_ink_v3_int32
#define ink_l_ink_v3_uint32 b36_3_ink_l_ink_v3_uint32
#define ink_l_ink_v4_float b36_3_ink_l_ink_v4_float
#define ink_l_ink_v4_int32 b36_3_ink_l_ink_v4_int32
#define ink_l_ink_v4_uint32 b36_3_ink_l_ink_v4_uint32
#define ink_l_int32 b36_3_ink_l_int32
#define ink_l_uint32 b36_3_ink_l_uint32
#define ink_l_uint64 b36_3_ink_l_uint64
#define ink_top b36_3_ink_top
#define ink_v2_float b36_3_ink_v2_float
#define ink_v2_int32 b36_3_ink_v2_int32
#define ink_v2_uint32 b36_3_ink_v2_uint32
#define ink_v3_float b36_3_ink_v3_float
#define ink_v3_int32 b36_3_ink_v3_int32
#define ink_v3_uint32 b36_3_ink_v3_uint32
#define ink_v4_float b36_3_ink_v4_float
#define ink_v4_int32 b36_3_ink_v4_int32
#define ink_v4_uint32 b36_3_ink_v4_uint32
#define lang_fn_calibrate_left b36_3_lang_fn_calibrate_left
#define lang_fn_calibrate_right b36_3_lang_fn_calibrate_right
#define lang_fn_left_word b36_3_lang_fn_left_word
#define lang_fn_mix_word b36_3_lang_fn_mix_word
#define lang_fn_pipeline36_concat_ordered_heldout_u32 b36_3_lang_fn_pipeline36_concat_ordered_heldout_u32
#define lang_fn_reduce_word b36_3_lang_fn_reduce_word
#define lang_fn_right_word b36_3_lang_fn_right_word
#include "/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-proofs-36-2026-10-11/targets-measured/targets/pipeline36_concat_ordered_heldout_u32/prior/cpu.c"
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
#undef lang_fn_calibrate_left
#undef lang_fn_calibrate_right
#undef lang_fn_left_word
#undef lang_fn_mix_word
#undef lang_fn_pipeline36_concat_ordered_heldout_u32
#undef lang_fn_reduce_word
#undef lang_fn_right_word
static uint32_t active;
BenchResult bench_call(uint32_t task,const uint32_t*x,size_t nx,const uint32_t*y,size_t ny,uint32_t seed,uint32_t k,uint32_t*out){active=task;switch(task){case 0:return(BenchResult){0,0,(uint64_t)b36_0_lang_fn_pipeline36_plain_ordered_u32((b36_0_ink_l_uint32){x,nx},(b36_0_ink_l_uint32){y,ny},seed,k)};case 1:return(BenchResult){0,0,(uint64_t)b36_1_lang_fn_pipeline36_nested_ordered_u32((b36_1_ink_l_uint32){x,nx},(b36_1_ink_l_uint32){y,ny},seed,k)};case 2:return(BenchResult){0,0,(uint64_t)b36_2_lang_fn_pipeline36_filtered_ordered_heldout_u32((b36_2_ink_l_uint32){x,nx},(b36_2_ink_l_uint32){y,ny},seed,k)};case 3:return(BenchResult){0,0,(uint64_t)b36_3_lang_fn_pipeline36_concat_ordered_heldout_u32((b36_3_ink_l_uint32){x,nx},(b36_3_ink_l_uint32){y,ny},seed,k)};default:__builtin_unreachable();}}
void bench_reset(void){switch(active){case 0:b36_0_ink_compute_reset();break;case 1:b36_1_ink_compute_reset();break;case 2:b36_2_ink_compute_reset();break;case 3:b36_3_ink_compute_reset();break;default:break;}}
