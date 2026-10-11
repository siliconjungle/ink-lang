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
ink_l_uint32 lang_fn_pipeline38_right_padded_zip_heldout_u32(ink_l_uint32 a0,ink_l_uint32 a1,uint32_t a2,uint32_t a3);
size_t lang_fn_pipeline38_right_padded_zip_heldout_u32_into(ink_l_uint32 a0,ink_l_uint32 a1,uint32_t a2,uint32_t a3,uint32_t *destination);
uint32_t lang_fn_left_word(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3);
uint32_t lang_fn_left_signal(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3);
uint32_t lang_fn_right_word(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3);
uint32_t lang_fn_right_signal(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3);
uint32_t lang_fn_pair_word(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3);
uint32_t lang_fn_pair_signal(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3);
ink_l_uint32 lang_fn_pipeline38_right_padded_zip_heldout_u32(ink_l_uint32 a0,ink_l_uint32 a1,uint32_t a2,uint32_t a3){
(void)a0;
(void)a1;
(void)a2;
(void)a3;
ink_l_uint32 t0=a0;
(void)t0;
ink_l_uint32 t1={ink_alloc(t0.len,sizeof(uint32_t)),t0.len};
for(size_t t2=0;t2<t0.len;t2++){
uint32_t t3=(uint32_t)t2;
(void)t3;
uint32_t t4=t0.data[t2];
(void)t4;
uint32_t t5=a2;
(void)t5;
uint32_t t6=a3;
(void)t6;
/* inline left_word */
uint32_t t7=t3;
(void)t7;
uint32_t t8=t4;
(void)t8;
uint32_t t9=t5;
(void)t9;
uint32_t t10=t6;
(void)t10;
/* inline left_signal */
uint32_t t11=t8;
(void)t11;
uint32_t t12=t10;
(void)t12;
uint32_t t13;
if (t12==0) {
t13=0u;
} else { t13=t11 / t12; }
uint32_t t14=t13;
(void)t14;
uint32_t t15=t7;
(void)t15;
uint32_t t16=t10;
(void)t16;
uint32_t t17;
if (t16==0) {
t17=0u;
} else { t17=t15 % t16; }
uint32_t t18=(t14 + t17);
(void)t18;
t1.data[t2]=(t18 + t9);
}
ink_l_uint32 t19=t1;
(void)t19;
ink_l_uint32 t20=a0;
(void)t20;
ink_l_uint32 t21={ink_alloc(t20.len,sizeof(uint32_t)),t20.len};
for(size_t t22=0;t22<t20.len;t22++){
uint32_t t23=(uint32_t)t22;
(void)t23;
uint32_t t24=t20.data[t22];
(void)t24;
uint32_t t25=a2;
(void)t25;
uint32_t t26=a3;
(void)t26;
/* inline right_word */
uint32_t t27=t23;
(void)t27;
uint32_t t28=t24;
(void)t28;
uint32_t t29=t25;
(void)t29;
uint32_t t30=t26;
(void)t30;
/* inline right_signal */
uint32_t t31=t27;
(void)t31;
uint32_t t32;
if ((t31 < t29)) {
uint32_t t33=t28;
(void)t33;
t32=(t33 + t30);
} else {
uint32_t t34=t28;
(void)t34;
t32=(t34 * 3u);
}
t21.data[t22]=t32;
}
ink_l_uint32 t35=t21;
(void)t35;
ink_l_uint32 t36=a1;
(void)t36;
if(t35.len>SIZE_MAX-t36.len) ink_fail();
size_t t37=t35.len+t36.len;
ink_l_uint32 t38={ink_alloc(t37,sizeof(uint32_t)),t37};
ink_copy(t38.data,t35.data,t35.len*sizeof(uint32_t));
ink_copy(t38.data+t35.len,t36.data,t36.len*sizeof(uint32_t));
ink_l_uint32 t39=t38;
(void)t39;
ink_l_uint32 t40={ink_alloc((t19.len < t39.len ? t19.len : t39.len),sizeof(uint32_t)),(t19.len < t39.len ? t19.len : t39.len)};
for(size_t t41=0;t41<(t19.len < t39.len ? t19.len : t39.len);t41++){
uint32_t t42=t19.data[t41];
(void)t42;
uint32_t t43=t39.data[t41];
(void)t43;
uint32_t t44=a2;
(void)t44;
uint32_t t45=a3;
(void)t45;
/* inline pair_word */
uint32_t t46=t42;
(void)t46;
uint32_t t47=t43;
(void)t47;
uint32_t t48=t44;
(void)t48;
uint32_t t49=t45;
(void)t49;
/* inline pair_signal */
uint32_t t50=t46;
(void)t50;
uint32_t t51;
if ((t50 < t47)) {
uint32_t t52=t46;
(void)t52;
uint32_t t53=t49;
(void)t53;
uint32_t t54;
if (t53==0) {
t54=0u;
} else { t54=t52 / t53; }
uint32_t t55=t54;
(void)t55;
t51=(t55 + t47);
} else {
uint32_t t56=t47;
(void)t56;
uint32_t t57=t49;
(void)t57;
uint32_t t58;
if (t57==0) {
t58=0u;
} else { t58=t56 % t57; }
uint32_t t59=t58;
(void)t59;
t51=(t59 + t46);
}
t40.data[t41]=t51;
}
return t40;
}
uint32_t lang_fn_left_word(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3){
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
/* inline left_signal */
uint32_t t4=t1;
(void)t4;
uint32_t t5=t3;
(void)t5;
uint32_t t6;
if (t5==0) {
t6=0u;
} else { t6=t4 / t5; }
uint32_t t7=t6;
(void)t7;
uint32_t t8=t0;
(void)t8;
uint32_t t9=t3;
(void)t9;
uint32_t t10;
if (t9==0) {
t10=0u;
} else { t10=t8 % t9; }
uint32_t t11=(t7 + t10);
(void)t11;
return (t11 + t2);
}
uint32_t lang_fn_left_signal(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3){
(void)a0;
(void)a1;
(void)a2;
(void)a3;
uint32_t t0=a1;
(void)t0;
uint32_t t1=a3;
(void)t1;
uint32_t t2;
if (t1==0) {
t2=0u;
} else { t2=t0 / t1; }
uint32_t t3=t2;
(void)t3;
uint32_t t4=a0;
(void)t4;
uint32_t t5=a3;
(void)t5;
uint32_t t6;
if (t5==0) {
t6=0u;
} else { t6=t4 % t5; }
uint32_t t7=(t3 + t6);
(void)t7;
return (t7 + a2);
}
uint32_t lang_fn_right_word(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3){
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
/* inline right_signal */
uint32_t t4=t0;
(void)t4;
uint32_t t5;
if ((t4 < t2)) {
uint32_t t6=t1;
(void)t6;
t5=(t6 + t3);
} else {
uint32_t t7=t1;
(void)t7;
t5=(t7 * 3u);
}
return t5;
}
uint32_t lang_fn_right_signal(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3){
(void)a0;
(void)a1;
(void)a2;
(void)a3;
uint32_t t0=a0;
(void)t0;
uint32_t t1;
if ((t0 < a2)) {
uint32_t t2=a1;
(void)t2;
t1=(t2 + a3);
} else {
uint32_t t3=a1;
(void)t3;
t1=(t3 * 3u);
}
return t1;
}
uint32_t lang_fn_pair_word(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3){
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
/* inline pair_signal */
uint32_t t4=t0;
(void)t4;
uint32_t t5;
if ((t4 < t1)) {
uint32_t t6=t0;
(void)t6;
uint32_t t7=t3;
(void)t7;
uint32_t t8;
if (t7==0) {
t8=0u;
} else { t8=t6 / t7; }
uint32_t t9=t8;
(void)t9;
t5=(t9 + t1);
} else {
uint32_t t10=t1;
(void)t10;
uint32_t t11=t3;
(void)t11;
uint32_t t12;
if (t11==0) {
t12=0u;
} else { t12=t10 % t11; }
uint32_t t13=t12;
(void)t13;
t5=(t13 + t0);
}
return t5;
}
uint32_t lang_fn_pair_signal(uint32_t a0,uint32_t a1,uint32_t a2,uint32_t a3){
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
uint32_t t3=a3;
(void)t3;
uint32_t t4;
if (t3==0) {
t4=0u;
} else { t4=t2 / t3; }
uint32_t t5=t4;
(void)t5;
t1=(t5 + a1);
} else {
uint32_t t6=a1;
(void)t6;
uint32_t t7=a3;
(void)t7;
uint32_t t8;
if (t7==0) {
t8=0u;
} else { t8=t6 % t7; }
uint32_t t9=t8;
(void)t9;
t1=(t9 + a0);
}
return t1;
}
size_t lang_fn_pipeline38_right_padded_zip_heldout_u32_into(ink_l_uint32 a0,ink_l_uint32 a1,uint32_t a2,uint32_t a3,uint32_t *destination){
(void)a0;
(void)a1;
(void)a2;
(void)a3;
ink_l_uint32 t0=a0;
(void)t0;
ink_l_uint32 t1={ink_alloc(t0.len,sizeof(uint32_t)),t0.len};
for(size_t t2=0;t2<t0.len;t2++){
uint32_t t3=(uint32_t)t2;
(void)t3;
uint32_t t4=t0.data[t2];
(void)t4;
uint32_t t5=a2;
(void)t5;
uint32_t t6=a3;
(void)t6;
/* inline left_word */
uint32_t t7=t3;
(void)t7;
uint32_t t8=t4;
(void)t8;
uint32_t t9=t5;
(void)t9;
uint32_t t10=t6;
(void)t10;
/* inline left_signal */
uint32_t t11=t8;
(void)t11;
uint32_t t12=t10;
(void)t12;
uint32_t t13;
if (t12==0) {
t13=0u;
} else { t13=t11 / t12; }
uint32_t t14=t13;
(void)t14;
uint32_t t15=t7;
(void)t15;
uint32_t t16=t10;
(void)t16;
uint32_t t17;
if (t16==0) {
t17=0u;
} else { t17=t15 % t16; }
uint32_t t18=(t14 + t17);
(void)t18;
t1.data[t2]=(t18 + t9);
}
ink_l_uint32 t19=t1;
(void)t19;
ink_l_uint32 t20=a0;
(void)t20;
ink_l_uint32 t21={ink_alloc(t20.len,sizeof(uint32_t)),t20.len};
for(size_t t22=0;t22<t20.len;t22++){
uint32_t t23=(uint32_t)t22;
(void)t23;
uint32_t t24=t20.data[t22];
(void)t24;
uint32_t t25=a2;
(void)t25;
uint32_t t26=a3;
(void)t26;
/* inline right_word */
uint32_t t27=t23;
(void)t27;
uint32_t t28=t24;
(void)t28;
uint32_t t29=t25;
(void)t29;
uint32_t t30=t26;
(void)t30;
/* inline right_signal */
uint32_t t31=t27;
(void)t31;
uint32_t t32;
if ((t31 < t29)) {
uint32_t t33=t28;
(void)t33;
t32=(t33 + t30);
} else {
uint32_t t34=t28;
(void)t34;
t32=(t34 * 3u);
}
t21.data[t22]=t32;
}
ink_l_uint32 t35=t21;
(void)t35;
ink_l_uint32 t36=a1;
(void)t36;
if(t35.len>SIZE_MAX-t36.len) ink_fail();
size_t t37=t35.len+t36.len;
ink_l_uint32 t38={ink_alloc(t37,sizeof(uint32_t)),t37};
ink_copy(t38.data,t35.data,t35.len*sizeof(uint32_t));
ink_copy(t38.data+t35.len,t36.data,t36.len*sizeof(uint32_t));
ink_l_uint32 t39=t38;
(void)t39;
ink_l_uint32 t40={destination,(t19.len < t39.len ? t19.len : t39.len)};
for(size_t t41=0;t41<(t19.len < t39.len ? t19.len : t39.len);t41++){
uint32_t t42=t19.data[t41];
(void)t42;
uint32_t t43=t39.data[t41];
(void)t43;
uint32_t t44=a2;
(void)t44;
uint32_t t45=a3;
(void)t45;
/* inline pair_word */
uint32_t t46=t42;
(void)t46;
uint32_t t47=t43;
(void)t47;
uint32_t t48=t44;
(void)t48;
uint32_t t49=t45;
(void)t49;
/* inline pair_signal */
uint32_t t50=t46;
(void)t50;
uint32_t t51;
if ((t50 < t47)) {
uint32_t t52=t46;
(void)t52;
uint32_t t53=t49;
(void)t53;
uint32_t t54;
if (t53==0) {
t54=0u;
} else { t54=t52 / t53; }
uint32_t t55=t54;
(void)t55;
t51=(t55 + t47);
} else {
uint32_t t56=t47;
(void)t56;
uint32_t t57=t49;
(void)t57;
uint32_t t58;
if (t57==0) {
t58=0u;
} else { t58=t56 % t57; }
uint32_t t59=t58;
(void)t59;
t51=(t59 + t46);
}
t40.data[t41]=t51;
}
return t40.len;
}
size_t ink_compute_into(uint32_t function,const void *const *data,const size_t *lengths,void *destination){(void)data;(void)lengths;(void)destination;switch(function){
case 0:{uint32_t *a0=(uint32_t *)data[0];uint32_t *a1=(uint32_t *)data[1];uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));return lang_fn_pipeline38_right_padded_zip_heldout_u32_into((ink_l_uint32){a0,lengths[0]},(ink_l_uint32){a1,lengths[1]},a2,a3,(uint32_t *)destination)*1;}
default:ink_fail();}return 0;}
void ink_compute_call(uint32_t function,const void *const *data,const size_t *lengths,void **output,size_t *count){ (void)data;(void)lengths;switch(function){
case 0:{uint32_t *a0=(uint32_t *)data[0];uint32_t *a1=(uint32_t *)data[1];uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));ink_l_uint32 result=lang_fn_pipeline38_right_padded_zip_heldout_u32((ink_l_uint32){a0,lengths[0]},(ink_l_uint32){a1,lengths[1]},a2,a3);*output=result.data;*count=result.len*1;break;}
case 1:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_left_word(a0,a1,a2,a3);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
case 2:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_left_signal(a0,a1,a2,a3);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
case 3:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_right_word(a0,a1,a2,a3);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
case 4:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_right_signal(a0,a1,a2,a3);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
case 5:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_pair_word(a0,a1,a2,a3);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
case 6:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_pair_signal(a0,a1,a2,a3);uint32_t *copy=ink_alloc(1,sizeof(result));*copy=result;*output=copy;*count=1;break;}
default:ink_fail();}}
uint32_t ink_compute_scalar32(uint32_t function,const void *const *data,const size_t *lengths){ (void)data;(void)lengths;switch(function){
case 1:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_left_word(a0,a1,a2,a3);return (uint32_t)result;}
case 2:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_left_signal(a0,a1,a2,a3);return (uint32_t)result;}
case 3:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_right_word(a0,a1,a2,a3);return (uint32_t)result;}
case 4:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_right_signal(a0,a1,a2,a3);return (uint32_t)result;}
case 5:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_pair_word(a0,a1,a2,a3);return (uint32_t)result;}
case 6:{uint32_t a0;ink_copy(&a0,data[0],sizeof(a0));uint32_t a1;ink_copy(&a1,data[1],sizeof(a1));uint32_t a2;ink_copy(&a2,data[2],sizeof(a2));uint32_t a3;ink_copy(&a3,data[3],sizeof(a3));uint32_t result=lang_fn_pair_signal(a0,a1,a2,a3);return (uint32_t)result;}
default:ink_fail();}return 0;}
uint64_t ink_compute_scalar64(uint32_t function,const void *const *data,const size_t *lengths){ (void)data;(void)lengths;switch(function){
default:ink_fail();}return 0;}
