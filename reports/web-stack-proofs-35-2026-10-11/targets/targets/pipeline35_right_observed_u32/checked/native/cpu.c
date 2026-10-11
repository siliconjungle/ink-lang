#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>
#pragma STDC FP_CONTRACT OFF
#if defined(__clang__)
#pragma clang diagnostic ignored "-Wparentheses-equality"
#pragma clang diagnostic ignored "-Wtautological-compare"
#endif
/* A call-scoped arena. Returned arrays live until ink_compute_reset. */
#if defined(__wasm__)
extern unsigned char __heap_base;
static size_t ink_top;
static void ink_fail(void){__builtin_trap();}
void ink_compute_reset(void){ink_top=(size_t)&__heap_base;}
size_t ink_compute_mark(void){if(!ink_top)ink_compute_reset();return ink_top;}
void ink_compute_rewind(size_t mark){ink_top=mark;}
void *ink_alloc(size_t count,size_t width){
 if(!width||count>SIZE_MAX/width||ink_top>SIZE_MAX-7)ink_fail();
 if(!ink_top)ink_compute_reset();size_t start=(ink_top+7)&~(size_t)7;
 size_t bytes=(count?count:1)*width;if(bytes>SIZE_MAX-start)ink_fail();ink_top=start+bytes;
 size_t pages=(ink_top+65535)/65536,old=__builtin_wasm_memory_size(0);
 if(pages>old&&__builtin_wasm_memory_grow(0,pages-old)==(size_t)-1)ink_fail();return(void*)start;
}
#else
#include <stdlib.h>
typedef struct ink_block {struct ink_block *next; uint64_t align;} ink_block;
static _Thread_local ink_block *ink_blocks;
static void ink_fail(void){abort();}
void ink_compute_reset(void){while(ink_blocks){ink_block *b=ink_blocks;ink_blocks=b->next;free(b);}}
size_t ink_compute_mark(void){return (size_t)ink_blocks;}
void ink_compute_rewind(size_t mark){while(ink_blocks!=(ink_block*)mark){ink_block*b=ink_blocks;ink_blocks=b->next;free(b);}}
void *ink_alloc(size_t count,size_t width){if(!width||count>SIZE_MAX/width)ink_fail();size_t bytes=(count?count:1)*width;if(bytes>SIZE_MAX-sizeof(ink_block))ink_fail();ink_block*b=malloc(sizeof(*b)+bytes);if(!b)ink_fail();b->next=ink_blocks;ink_blocks=b;return b+1;}
#endif
static __attribute__((unused)) float ink_f32(uint32_t bits){union{uint32_t u;float f;}v={.u=bits};return v.f;}
static __attribute__((unused)) int32_t ink_i32(uint32_t bits){union{uint32_t u;int32_t i;}v={.u=bits};return v.i;}

static __attribute__((unused)) void ink_copy(void *to,const void *from,size_t bytes){unsigned char *dst=to;const unsigned char *src=from;for(size_t i=0;i<bytes;i++)dst[i]=src[i];}
#if defined(__wasm__)
void *memcpy(void *to,const void *from,size_t bytes){ink_copy(to,from,bytes);return to;}
void *memset(void *to,int value,size_t bytes){unsigned char *dst=to;for(size_t i=0;i<bytes;i++)dst[i]=(unsigned char)value;return to;}
#endif
_Static_assert(sizeof(float)==4,"packed compute layout");
typedef struct { float *data; size_t len; } ink_l_float;
typedef struct {float x;float y;} ink_v2_float;
_Static_assert(sizeof(ink_v2_float)==8,"packed compute layout");
typedef struct { ink_v2_float *data; size_t len; } ink_l_ink_v2_float;
typedef struct {float x;float y;float z;} ink_v3_float;
_Static_assert(sizeof(ink_v3_float)==12,"packed compute layout");
typedef struct { ink_v3_float *data; size_t len; } ink_l_ink_v3_float;
typedef struct {float x;float y;float z;float w;} ink_v4_float;
_Static_assert(sizeof(ink_v4_float)==16,"packed compute layout");
typedef struct { ink_v4_float *data; size_t len; } ink_l_ink_v4_float;
_Static_assert(sizeof(int32_t)==4,"packed compute layout");
typedef struct { int32_t *data; size_t len; } ink_l_int32;
typedef struct {int32_t x;int32_t y;} ink_v2_int32;
_Static_assert(sizeof(ink_v2_int32)==8,"packed compute layout");
typedef struct { ink_v2_int32 *data; size_t len; } ink_l_ink_v2_int32;
typedef struct {int32_t x;int32_t y;int32_t z;} ink_v3_int32;
_Static_assert(sizeof(ink_v3_int32)==12,"packed compute layout");
typedef struct { ink_v3_int32 *data; size_t len; } ink_l_ink_v3_int32;
typedef struct {int32_t x;int32_t y;int32_t z;int32_t w;} ink_v4_int32;
_Static_assert(sizeof(ink_v4_int32)==16,"packed compute layout");
typedef struct { ink_v4_int32 *data; size_t len; } ink_l_ink_v4_int32;
_Static_assert(sizeof(uint32_t)==4,"packed compute layout");
typedef struct { uint32_t *data; size_t len; } ink_l_uint32;
typedef struct {uint32_t x;uint32_t y;} ink_v2_uint32;
_Static_assert(sizeof(ink_v2_uint32)==8,"packed compute layout");
typedef struct { ink_v2_uint32 *data; size_t len; } ink_l_ink_v2_uint32;
typedef struct {uint32_t x;uint32_t y;uint32_t z;} ink_v3_uint32;
_Static_assert(sizeof(ink_v3_uint32)==12,"packed compute layout");
typedef struct { ink_v3_uint32 *data; size_t len; } ink_l_ink_v3_uint32;
typedef struct {uint32_t x;uint32_t y;uint32_t z;uint32_t w;} ink_v4_uint32;
_Static_assert(sizeof(ink_v4_uint32)==16,"packed compute layout");
typedef struct { ink_v4_uint32 *data; size_t len; } ink_l_ink_v4_uint32;
_Static_assert(sizeof(uint64_t)==8,"packed compute layout");
typedef struct { uint64_t *data; size_t len; } ink_l_uint64;
ink_l_uint32 lang_fn_pipeline35_right_observed_u32(ink_l_uint32 a0,ink_l_uint32 a1,uint32_t a2,uint32_t a3);
size_t lang_fn_pipeline35_right_observed_u32_into(ink_l_uint32 a0,ink_l_uint32 a1,uint32_t a2,uint32_t a3,uint32_t *destination);
uint32_t lang_fn_left_word(uint32_t a0,uint32_t a1,uint32_t a2);
uint32_t lang_fn_normalize_left(uint32_t a0,uint32_t a1);
uint32_t lang_fn_right_word(uint32_t a0,uint32_t a1,uint32_t a2);
uint32_t lang_fn_normalize_right(uint32_t a0,uint32_t a1);
uint32_t lang_fn_combine_words(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3);
uint32_t lang_fn_mix_words(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3);
ink_l_uint32 lang_fn_pipeline35_right_observed_u32(ink_l_uint32 a0,ink_l_uint32 a1,uint32_t a2,uint32_t a3){
(void)a0;
(void)a1;
(void)a2;
(void)a3;
ink_l_uint32 t0=a0;
(void)t0;
ink_l_uint32 t1=a1;
(void)t1;
ink_l_uint32 t2={ink_alloc((t0.len < t1.len ? t0.len : t1.len),sizeof(uint32_t)),(t0.len < t1.len ? t0.len : t1.len)};
for(size_t t3=0;t3<(t0.len < t1.len ? t0.len : t1.len);t3++){
uint32_t t4=t0.data[t3];
(void)t4;
uint32_t t5=t1.data[t3];
(void)t5;
uint32_t t6=a2;
(void)t6;
uint32_t t7=a3;
(void)t7;
/* inline right_word */
uint32_t t8=t5;
(void)t8;
uint32_t t9=t7;
(void)t9;
/* inline normalize_right */
uint32_t t10=t8;
(void)t10;
uint32_t t11=t9;
(void)t11;
uint32_t t12;
if (t11==0) {
t12=0u;
} else { t12=t10 % t11; }
uint32_t t13=t12;
(void)t13;
uint32_t t14=(t13 + t8);
(void)t14;
uint32_t t15=(t14 + t7);
(void)t15;
uint32_t t16=a2;
(void)t16;
uint32_t t17=a3;
(void)t17;
/* inline combine_words */
uint32_t t18=t4;
(void)t18;
uint32_t t19=t15;
(void)t19;
uint32_t t20=t16;
(void)t20;
uint32_t t21=t17;
(void)t21;
/* inline mix_words */
uint32_t t22=t18;
(void)t22;
uint32_t t23;
if ((t22 < t19)) {
uint32_t t24=t18;
(void)t24;
uint32_t t25=t19;
(void)t25;
t23=(t24 + (t25 * t21));
} else {
uint32_t t26=t18;
(void)t26;
uint32_t t27=t19;
(void)t27;
t23=(t26 - (t27 * t21));
}
uint32_t t28=t23;
(void)t28;
t2.data[t3]=(t28 + t20);
}
return t2;
}
uint32_t lang_fn_left_word(uint32_t a0,uint32_t a1,uint32_t a2){
(void)a0;
(void)a1;
(void)a2;
uint32_t t0=a0;
(void)t0;
uint32_t t1=a2;
(void)t1;
/* inline normalize_left */
uint32_t t2=t0;
(void)t2;
uint32_t t3=t1;
(void)t3;
uint32_t t4;
if (t3==0) {
t4=0u;
} else { t4=t2 / t3; }
uint32_t t5=t4;
(void)t5;
uint32_t t6=(t5 + t0);
(void)t6;
return (t6 + a1);
}
uint32_t lang_fn_normalize_left(uint32_t a0,uint32_t a1){
(void)a0;
(void)a1;
uint32_t t0=a0;
(void)t0;
uint32_t t1=a1;
(void)t1;
uint32_t t2;
if (t1==0) {
t2=0u;
} else { t2=t0 / t1; }
uint32_t t3=t2;
(void)t3;
return (t3 + a0);
}
uint32_t lang_fn_right_word(uint32_t a0,uint32_t a1,uint32_t a2){
(void)a0;
(void)a1;
(void)a2;
uint32_t t0=a0;
(void)t0;
uint32_t t1=a2;
(void)t1;
/* inline normalize_right */
uint32_t t2=t0;
(void)t2;
uint32_t t3=t1;
(void)t3;
uint32_t t4;
if (t3==0) {
t4=0u;
} else { t4=t2 % t3; }
uint32_t t5=t4;
(void)t5;
uint32_t t6=(t5 + t0);
(void)t6;
return (t6 + a2);
}
uint32_t lang_fn_normalize_right(uint32_t a0,uint32_t a1){
(void)a0;
(void)a1;
uint32_t t0=a0;
(void)t0;
uint32_t t1=a1;
(void)t1;
uint32_t t2;
if (t1==0) {
t2=0u;
} else { t2=t0 % t1; }
uint32_t t3=t2;
(void)t3;
return (t3 + a0);
}
uint32_t lang_fn_combine_words(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3){
(void)a0;
(void)a1;
(void)a2;
(void)a3;
uint32_t t0=a0;
(void)t0;
uint32_t t1=a1;
(void)t1;
uint32_t t2=a2;
(void)t2;
uint32_t t3=a3;
(void)t3;
/* inline mix_words */
uint32_t t4=t0;
(void)t4;
uint32_t t5;
if ((t4 < t1)) {
uint32_t t6=t0;
(void)t6;
uint32_t t7=t1;
(void)t7;
t5=(t6 + (t7 * t3));
} else {
uint32_t t8=t0;
(void)t8;
uint32_t t9=t1;
(void)t9;
t5=(t8 - (t9 * t3));
}
uint32_t t10=t5;
(void)t10;
return (t10 + t2);
}
uint32_t lang_fn_mix_words(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3){
(void)a0;
(void)a1;
(void)a2;
(void)a3;
uint32_t t0=a0;
(void)t0;
uint32_t t1;
if ((t0 < a1)) {
uint32_t t2=a0;
(void)t2;
uint32_t t3=a1;
(void)t3;
t1=(t2 + (t3 * a3));
} else {
uint32_t t4=a0;
(void)t4;
uint32_t t5=a1;
(void)t5;
t1=(t4 - (t5 * a3));
}
uint32_t t6=t1;
(void)t6;
return (t6 + a2);
}
size_t lang_fn_pipeline35_right_observed_u32_into(ink_l_uint32 a0,ink_l_uint32 a1,uint32_t a2,uint32_t a3,uint32_t *destination){
(void)a0;
(void)a1;
(void)a2;
(void)a3;
ink_l_uint32 t0=a0;
(void)t0;
ink_l_uint32 t1=a1;
(void)t1;
ink_l_uint32 t2={destination,(t0.len < t1.len ? t0.len : t1.len)};
for(size_t t3=0;t3<(t0.len < t1.len ? t0.len : t1.len);t3++){
uint32_t t4=t0.data[t3];
(void)t4;
uint32_t t5=t1.data[t3];
(void)t5;
uint32_t t6=a2;
(void)t6;
uint32_t t7=a3;
(void)t7;
/* inline right_word */
uint32_t t8=t5;
(void)t8;
uint32_t t9=t7;
(void)t9;
/* inline normalize_right */
uint32_t t10=t8;
(void)t10;
uint32_t t11=t9;
(void)t11;
uint32_t t12;
if (t11==0) {
t12=0u;
} else { t12=t10 % t11; }
uint32_t t13=t12;
(void)t13;
uint32_t t14=(t13 + t8);
(void)t14;
uint32_t t15=(t14 + t7);
(void)t15;
uint32_t t16=a2;
(void)t16;
uint32_t t17=a3;
(void)t17;
/* inline combine_words */
uint32_t t18=t4;
(void)t18;
uint32_t t19=t15;
(void)t19;
uint32_t t20=t16;
(void)t20;
uint32_t t21=t17;
(void)t21;
/* inline mix_words */
uint32_t t22=t18;
(void)t22;
uint32_t t23;
if ((t22 < t19)) {
uint32_t t24=t18;
(void)t24;
uint32_t t25=t19;
(void)t25;
t23=(t24 + (t25 * t21));
} else {
uint32_t t26=t18;
(void)t26;
uint32_t t27=t19;
(void)t27;
t23=(t26 - (t27 * t21));
}
uint32_t t28=t23;
(void)t28;
t2.data[t3]=(t28 + t20);
}
return t2.len;
}
size_t ink_compute_into(uint32_t function,const void *const *data,const size_t *lengths,void *destination){(void)data;(void)lengths;(void)destination;switch(function){
case 0:{uint32_t *a0=(uint32_t *)data[0];uint32_t *a1=(uint32_t *)data[1];uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));return lang_fn_pipeline35_right_observed_u32_into((ink_l_uint32){a0,lengths[0]},(ink_l_uint32){a1,lengths[1]},a2,a3,(uint32_t *)destination)*1;}
default:ink_fail();}return 0;}
void ink_compute_call(uint32_t function,const void *const *data,const size_t *lengths,void **output,size_t *count){ (void)data;(void)lengths;switch(function){
case 0:{uint32_t *a0=(uint32_t *)data[0];uint32_t *a1=(uint32_t *)data[1];uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));ink_l_uint32 result=lang_fn_pipeline35_right_observed_u32((ink_l_uint32){a0,lengths[0]},(ink_l_uint32){a1,lengths[1]},a2,a3);*output=result.data;*count=result.len*1;break;}
case 1:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t result=lang_fn_left_word(a0,a1,a2);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
case 2:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t result=lang_fn_normalize_left(a0,a1);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
case 3:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t result=lang_fn_right_word(a0,a1,a2);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
case 4:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t result=lang_fn_normalize_right(a0,a1);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
case 5:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_combine_words(a0,a1,a2,a3);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
case 6:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_mix_words(a0,a1,a2,a3);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
default:ink_fail();}}
uint32_t ink_compute_scalar32(uint32_t function,const void *const *data,const size_t *lengths){ (void)data;(void)lengths;switch(function){
case 1:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t result=lang_fn_left_word(a0,a1,a2);return (uint32_t)result;}
case 2:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t result=lang_fn_normalize_left(a0,a1);return (uint32_t)result;}
case 3:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t result=lang_fn_right_word(a0,a1,a2);return (uint32_t)result;}
case 4:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t result=lang_fn_normalize_right(a0,a1);return (uint32_t)result;}
case 5:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_combine_words(a0,a1,a2,a3);return (uint32_t)result;}
case 6:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_mix_words(a0,a1,a2,a3);return (uint32_t)result;}
default:ink_fail();}return 0;}
uint64_t ink_compute_scalar64(uint32_t function,const void *const *data,const size_t *lengths){ (void)data;(void)lengths;switch(function){
default:ink_fail();}return 0;}
