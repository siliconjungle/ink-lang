#define _POSIX_C_SOURCE 200809L
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <inttypes.h>

uint64_t lang_fn_sum_values(const uint64_t*,size_t);
uint64_t lang_fn_affine(const uint64_t*,size_t,uint64_t,uint64_t);
uint64_t lang_fn_squares(const uint64_t*,size_t);
uint64_t lang_fn_filter_sum(const uint64_t*,size_t,uint64_t);
uint64_t lang_fn_pipeline(const uint64_t*,size_t,uint64_t,uint64_t,uint64_t);
uint64_t lang_fn_expanded(const uint64_t*,size_t);
uint64_t lang_fn_count_under(const uint64_t*,size_t,uint64_t);

static uint64_t rng(uint64_t *s){*s^=*s<<13;*s^=*s>>7;*s^=*s<<17;return *s;}
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return (double)t.tv_sec+(double)t.tv_nsec*1e-9;}
static uint64_t invoke(int k,const uint64_t *x,size_t n,uint64_t a,uint64_t b,uint64_t t){
    switch(k){case 0:return lang_fn_sum_values(x,n);case 1:return lang_fn_affine(x,n,a,b);case 2:return lang_fn_squares(x,n);case 3:return lang_fn_filter_sum(x,n,t);case 4:return lang_fn_pipeline(x,n,a,b,t);case 5:return lang_fn_expanded(x,n);case 6:return lang_fn_count_under(x,n,t);default:abort();}
}
int main(int argc,char **argv){
    if(argc!=7){fprintf(stderr,"usage: bench CASE SIZE ITERATIONS SEED DISTRIBUTION THRESHOLD\n");return 2;}
    int k=atoi(argv[1]);size_t n=(size_t)strtoull(argv[2],0,10);uint64_t it=strtoull(argv[3],0,10),seed=strtoull(argv[4],0,10),t=strtoull(argv[6],0,10);
    if(k<0||k>6||n>100000000||it==0||seed==0){fprintf(stderr,"invalid arguments\n");return 2;}
    uint64_t *x=malloc((n?n:1)*sizeof(*x));if(!x)return 3;
    for(size_t i=0;i<n;i++){uint64_t v=rng(&seed);x[i]=strcmp(argv[5],"full")==0?v:(v&1023);}
    uint64_t a=3,b=11,check=invoke(k,x,n,a,b,t),acc=0;
    // Calls cross an object boundary without LTO. Every result is consumed.
    for(int warm=0;warm<3;warm++)acc+=invoke(k,x,n,a,b,t);
    double start=now();
    for(uint64_t i=0;i<it;i++)acc+=invoke(k,x,n,a,b,t);
    double seconds=now()-start;
    printf("{\"seconds\":%.12f,\"checksum\":\"%" PRIu64 "\",\"single\":\"%" PRIu64 "\",\"iterations\":%" PRIu64 "}\n",seconds,acc,check,it);
    free(x);return 0;
}
