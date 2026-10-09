#include <stdint.h>
#include <stddef.h>
uint64_t lang_fn_sum_values(const uint64_t *xs,size_t n){uint64_t s=0;for(size_t i=0;i<n;i++)s+=xs[i];return s;}
uint64_t lang_fn_affine(const uint64_t *xs,size_t n,uint64_t a,uint64_t b){uint64_t s=0;for(size_t i=0;i<n;i++)s+=xs[i]*a+b;return s;}
uint64_t lang_fn_squares(const uint64_t *xs,size_t n){uint64_t s=0;for(size_t i=0;i<n;i++)s+=xs[i]*xs[i];return s;}
uint64_t lang_fn_filter_sum(const uint64_t *xs,size_t n,uint64_t t){uint64_t s=0;for(size_t i=0;i<n;i++)if(xs[i]<t)s+=xs[i];return s;}
uint64_t lang_fn_pipeline(const uint64_t *xs,size_t n,uint64_t a,uint64_t b,uint64_t t){uint64_t s=0;for(size_t i=0;i<n;i++){uint64_t y=xs[i]*a+b;if(y<t)s+=y*y+7;}return s;}
uint64_t lang_fn_expanded(const uint64_t *xs,size_t n){uint64_t s=0;for(size_t i=0;i<n;i++){uint64_t y=xs[i]+3;s+=y*y;}return s;}
uint64_t lang_fn_count_under(const uint64_t *xs,size_t n,uint64_t t){uint64_t s=0;for(size_t i=0;i<n;i++)s+=(xs[i]<t);return s;}
