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
ink_l_uint32 lang_fn_pipeline35_nested_observed_heldout_u32(ink_l_uint32 a0,ink_l_uint32 a1,uint32_t a2,uint32_t a3);
size_t lang_fn_pipeline35_nested_observed_heldout_u32_into(ink_l_uint32 a0,ink_l_uint32 a1,uint32_t a2,uint32_t a3,uint32_t *destination);
uint32_t lang_fn_left_word(uint32_t a0,uint32_t a1,uint32_t a2);
uint32_t lang_fn_normalize_left(uint32_t a0,uint32_t a1);
uint32_t lang_fn_right_word(uint32_t a0,uint32_t a1,uint32_t a2);
uint32_t lang_fn_normalize_right(uint32_t a0,uint32_t a1);
uint32_t lang_fn_combine_words(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3);
uint32_t lang_fn_mix_words(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3);
uint32_t lang_fn_post_word(uint32_t a0,uint32_t a1,uint32_t a2);
uint32_t lang_fn_shift_word(uint32_t a0,uint32_t a1,uint32_t a2);
ink_l_uint32 lang_fn_pipeline35_nested_observed_heldout_u32(ink_l_uint32 a0,ink_l_uint32 a1,uint32_t a2,uint32_t a3){
(void)a0;
(void)a1;
(void)a2;
(void)a3;
ink_l_uint32 t0=a0;
(void)t0;
ink_l_uint32 t1={ink_alloc(t0.len,sizeof(uint32_t)),t0.len};
for(size_t t2=0;t2<t0.len;t2++){
uint32_t t3=t0.data[t2];
(void)t3;
uint32_t t4=a2;
(void)t4;
uint32_t t5=a3;
(void)t5;
/* inline left_word */
uint32_t t6=t3;
(void)t6;
uint32_t t7=t5;
(void)t7;
/* inline normalize_left */
uint32_t t8=t6;
(void)t8;
uint32_t t9=t7;
(void)t9;
uint32_t t10;
if (t9==0) {
t10=0u;
} else { t10=t8 / t9; }
uint32_t t11=t10;
(void)t11;
uint32_t t12=(t11 + t6);
(void)t12;
t1.data[t2]=(t12 + t4);
}
ink_l_uint32 t13=t1;
(void)t13;
ink_l_uint32 t14={ink_alloc(t13.len,sizeof(uint32_t)),t13.len};
for(size_t t15=0;t15<t13.len;t15++){
uint32_t t16=t13.data[t15];
(void)t16;
uint32_t t17=a2;
(void)t17;
uint32_t t18=a3;
(void)t18;
/* inline post_word */
uint32_t t19=t16;
(void)t19;
uint32_t t20=t17;
(void)t20;
uint32_t t21=t18;
(void)t21;
/* inline shift_word */
uint32_t t22=t19;
(void)t22;
uint32_t t23;
if ((t22 < t20)) {
uint32_t t24=t19;
(void)t24;
t23=(t24 + t21);
} else {
uint32_t t25=t19;
(void)t25;
t23=(t25 - t21);
}
t14.data[t15]=t23;
}
ink_l_uint32 t26=t14;
(void)t26;
ink_l_uint32 t27=a1;
(void)t27;
ink_l_uint32 t28={ink_alloc(t27.len,sizeof(uint32_t)),t27.len};
for(size_t t29=0;t29<t27.len;t29++){
uint32_t t30=t27.data[t29];
(void)t30;
uint32_t t31=a2;
(void)t31;
uint32_t t32=a3;
(void)t32;
/* inline right_word */
uint32_t t33=t30;
(void)t33;
uint32_t t34=t32;
(void)t34;
/* inline normalize_right */
uint32_t t35=t33;
(void)t35;
uint32_t t36=t34;
(void)t36;
uint32_t t37;
if (t36==0) {
t37=0u;
} else { t37=t35 % t36; }
uint32_t t38=t37;
(void)t38;
uint32_t t39=(t38 + t33);
(void)t39;
t28.data[t29]=(t39 + t32);
}
ink_l_uint32 t40=t28;
(void)t40;
ink_l_uint32 t41={ink_alloc((t26.len < t40.len ? t26.len : t40.len),sizeof(uint32_t)),(t26.len < t40.len ? t26.len : t40.len)};
for(size_t t42=0;t42<(t26.len < t40.len ? t26.len : t40.len);t42++){
uint32_t t43=t26.data[t42];
(void)t43;
uint32_t t44=t40.data[t42];
(void)t44;
uint32_t t45=a2;
(void)t45;
uint32_t t46=a3;
(void)t46;
/* inline combine_words */
uint32_t t47=t43;
(void)t47;
uint32_t t48=t44;
(void)t48;
uint32_t t49=t45;
(void)t49;
uint32_t t50=t46;
(void)t50;
/* inline mix_words */
uint32_t t51=t47;
(void)t51;
uint32_t t52;
if ((t51 < t49)) {
uint32_t t53=t47;
(void)t53;
uint32_t t54=(t53 + t48);
(void)t54;
t52=(t54 * t50);
} else {
uint32_t t55=t47;
(void)t55;
uint32_t t56=(t55 - t48);
(void)t56;
t52=(t56 + t49);
}
t41.data[t42]=t52;
}
return t41;
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
if ((t4 < t2)) {
uint32_t t6=t0;
(void)t6;
uint32_t t7=(t6 + t1);
(void)t7;
t5=(t7 * t3);
} else {
uint32_t t8=t0;
(void)t8;
uint32_t t9=(t8 - t1);
(void)t9;
t5=(t9 + t2);
}
return t5;
}
uint32_t lang_fn_mix_words(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3){
(void)a0;
(void)a1;
(void)a2;
(void)a3;
uint32_t t0=a0;
(void)t0;
uint32_t t1;
if ((t0 < a2)) {
uint32_t t2=a0;
(void)t2;
uint32_t t3=(t2 + a1);
(void)t3;
t1=(t3 * a3);
} else {
uint32_t t4=a0;
(void)t4;
uint32_t t5=(t4 - a1);
(void)t5;
t1=(t5 + a2);
}
return t1;
}
uint32_t lang_fn_post_word(uint32_t a0,uint32_t a1,uint32_t a2){
(void)a0;
(void)a1;
(void)a2;
uint32_t t0=a0;
(void)t0;
uint32_t t1=a1;
(void)t1;
uint32_t t2=a2;
(void)t2;
/* inline shift_word */
uint32_t t3=t0;
(void)t3;
uint32_t t4;
if ((t3 < t1)) {
uint32_t t5=t0;
(void)t5;
t4=(t5 + t2);
} else {
uint32_t t6=t0;
(void)t6;
t4=(t6 - t2);
}
return t4;
}
uint32_t lang_fn_shift_word(uint32_t a0,uint32_t a1,uint32_t a2){
(void)a0;
(void)a1;
(void)a2;
uint32_t t0=a0;
(void)t0;
uint32_t t1;
if ((t0 < a1)) {
uint32_t t2=a0;
(void)t2;
t1=(t2 + a2);
} else {
uint32_t t3=a0;
(void)t3;
t1=(t3 - a2);
}
return t1;
}
size_t lang_fn_pipeline35_nested_observed_heldout_u32_into(ink_l_uint32 a0,ink_l_uint32 a1,uint32_t a2,uint32_t a3,uint32_t *destination){
(void)a0;
(void)a1;
(void)a2;
(void)a3;
ink_l_uint32 t0=a0;
(void)t0;
ink_l_uint32 t1={ink_alloc(t0.len,sizeof(uint32_t)),t0.len};
for(size_t t2=0;t2<t0.len;t2++){
uint32_t t3=t0.data[t2];
(void)t3;
uint32_t t4=a2;
(void)t4;
uint32_t t5=a3;
(void)t5;
/* inline left_word */
uint32_t t6=t3;
(void)t6;
uint32_t t7=t5;
(void)t7;
/* inline normalize_left */
uint32_t t8=t6;
(void)t8;
uint32_t t9=t7;
(void)t9;
uint32_t t10;
if (t9==0) {
t10=0u;
} else { t10=t8 / t9; }
uint32_t t11=t10;
(void)t11;
uint32_t t12=(t11 + t6);
(void)t12;
t1.data[t2]=(t12 + t4);
}
ink_l_uint32 t13=t1;
(void)t13;
ink_l_uint32 t14={ink_alloc(t13.len,sizeof(uint32_t)),t13.len};
for(size_t t15=0;t15<t13.len;t15++){
uint32_t t16=t13.data[t15];
(void)t16;
uint32_t t17=a2;
(void)t17;
uint32_t t18=a3;
(void)t18;
/* inline post_word */
uint32_t t19=t16;
(void)t19;
uint32_t t20=t17;
(void)t20;
uint32_t t21=t18;
(void)t21;
/* inline shift_word */
uint32_t t22=t19;
(void)t22;
uint32_t t23;
if ((t22 < t20)) {
uint32_t t24=t19;
(void)t24;
t23=(t24 + t21);
} else {
uint32_t t25=t19;
(void)t25;
t23=(t25 - t21);
}
t14.data[t15]=t23;
}
ink_l_uint32 t26=t14;
(void)t26;
ink_l_uint32 t27=a1;
(void)t27;
ink_l_uint32 t28={ink_alloc(t27.len,sizeof(uint32_t)),t27.len};
for(size_t t29=0;t29<t27.len;t29++){
uint32_t t30=t27.data[t29];
(void)t30;
uint32_t t31=a2;
(void)t31;
uint32_t t32=a3;
(void)t32;
/* inline right_word */
uint32_t t33=t30;
(void)t33;
uint32_t t34=t32;
(void)t34;
/* inline normalize_right */
uint32_t t35=t33;
(void)t35;
uint32_t t36=t34;
(void)t36;
uint32_t t37;
if (t36==0) {
t37=0u;
} else { t37=t35 % t36; }
uint32_t t38=t37;
(void)t38;
uint32_t t39=(t38 + t33);
(void)t39;
t28.data[t29]=(t39 + t32);
}
ink_l_uint32 t40=t28;
(void)t40;
ink_l_uint32 t41={destination,(t26.len < t40.len ? t26.len : t40.len)};
for(size_t t42=0;t42<(t26.len < t40.len ? t26.len : t40.len);t42++){
uint32_t t43=t26.data[t42];
(void)t43;
uint32_t t44=t40.data[t42];
(void)t44;
uint32_t t45=a2;
(void)t45;
uint32_t t46=a3;
(void)t46;
/* inline combine_words */
uint32_t t47=t43;
(void)t47;
uint32_t t48=t44;
(void)t48;
uint32_t t49=t45;
(void)t49;
uint32_t t50=t46;
(void)t50;
/* inline mix_words */
uint32_t t51=t47;
(void)t51;
uint32_t t52;
if ((t51 < t49)) {
uint32_t t53=t47;
(void)t53;
uint32_t t54=(t53 + t48);
(void)t54;
t52=(t54 * t50);
} else {
uint32_t t55=t47;
(void)t55;
uint32_t t56=(t55 - t48);
(void)t56;
t52=(t56 + t49);
}
t41.data[t42]=t52;
}
return t41.len;
}
size_t ink_compute_into(uint32_t function,const void *const *data,const size_t *lengths,void *destination){(void)data;(void)lengths;(void)destination;switch(function){
case 0:{uint32_t *a0=(uint32_t *)data[0];uint32_t *a1=(uint32_t *)data[1];uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));return lang_fn_pipeline35_nested_observed_heldout_u32_into((ink_l_uint32){a0,lengths[0]},(ink_l_uint32){a1,lengths[1]},a2,a3,(uint32_t *)destination)*1;}
default:ink_fail();}return 0;}
void ink_compute_call(uint32_t function,const void *const *data,const size_t *lengths,void **output,size_t *count){ (void)data;(void)lengths;switch(function){
case 0:{uint32_t *a0=(uint32_t *)data[0];uint32_t *a1=(uint32_t *)data[1];uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));ink_l_uint32 result=lang_fn_pipeline35_nested_observed_heldout_u32((ink_l_uint32){a0,lengths[0]},(ink_l_uint32){a1,lengths[1]},a2,a3);*output=result.data;*count=result.len*1;break;}
case 1:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t result=lang_fn_left_word(a0,a1,a2);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
case 2:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t result=lang_fn_normalize_left(a0,a1);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
case 3:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t result=lang_fn_right_word(a0,a1,a2);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
case 4:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t result=lang_fn_normalize_right(a0,a1);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
case 5:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_combine_words(a0,a1,a2,a3);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
case 6:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_mix_words(a0,a1,a2,a3);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
case 7:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t result=lang_fn_post_word(a0,a1,a2);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
case 8:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t result=lang_fn_shift_word(a0,a1,a2);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
default:ink_fail();}}
uint32_t ink_compute_scalar32(uint32_t function,const void *const *data,const size_t *lengths){ (void)data;(void)lengths;switch(function){
case 1:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t result=lang_fn_left_word(a0,a1,a2);return (uint32_t)result;}
case 2:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t result=lang_fn_normalize_left(a0,a1);return (uint32_t)result;}
case 3:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t result=lang_fn_right_word(a0,a1,a2);return (uint32_t)result;}
case 4:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t result=lang_fn_normalize_right(a0,a1);return (uint32_t)result;}
case 5:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_combine_words(a0,a1,a2,a3);return (uint32_t)result;}
case 6:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_mix_words(a0,a1,a2,a3);return (uint32_t)result;}
case 7:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t result=lang_fn_post_word(a0,a1,a2);return (uint32_t)result;}
case 8:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t result=lang_fn_shift_word(a0,a1,a2);return (uint32_t)result;}
default:ink_fail();}return 0;}
uint64_t ink_compute_scalar64(uint32_t function,const void *const *data,const size_t *lengths){ (void)data;(void)lengths;switch(function){
default:ink_fail();}return 0;}
