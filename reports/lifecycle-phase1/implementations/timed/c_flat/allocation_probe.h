/* Separate instrumented binaries only. Header overhead is excluded from counts.
   Current C/C++ states use ordinary allocation, with no over-aligned objects. */
#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
typedef struct { uint64_t calls,resizes,requested,live,peak; } ProbeStats;
static ProbeStats probe_stats;
typedef union { max_align_t alignment; struct { size_t bytes; } info; } ProbeHeader;
static void probe_add(size_t bytes){probe_stats.calls++;probe_stats.requested+=bytes;probe_stats.live+=bytes;if(probe_stats.live>probe_stats.peak)probe_stats.peak=probe_stats.live;}
static void *probe_malloc(size_t bytes){if(bytes>SIZE_MAX-sizeof(ProbeHeader))abort();ProbeHeader*p=(ProbeHeader*)malloc(sizeof(*p)+bytes);if(!p)abort();p->info.bytes=bytes;probe_add(bytes);return p+1;}
static void probe_free(void *p){if(p){ProbeHeader*h=(ProbeHeader*)p-1;probe_stats.live-=h->info.bytes;free(h);}}
#ifndef __cplusplus
static void *probe_calloc(size_t n,size_t width){if(width&&n>SIZE_MAX/width)abort();size_t bytes=n*width;void*p=probe_malloc(bytes);memset(p,0,bytes);return p;}
static void *probe_realloc(void*p,size_t bytes){if(!p)return probe_malloc(bytes);if(!bytes){probe_free(p);return NULL;}if(bytes>SIZE_MAX-sizeof(ProbeHeader))abort();ProbeHeader*h=(ProbeHeader*)p-1;size_t old=h->info.bytes;h=(ProbeHeader*)realloc(h,sizeof(*h)+bytes);if(!h)abort();h->info.bytes=bytes;probe_stats.live-=old;probe_stats.resizes++;probe_add(bytes);return h+1;}
#define malloc probe_malloc
#define calloc probe_calloc
#define realloc probe_realloc
#define free probe_free
#else
#include <new>
void *operator new(size_t n){return probe_malloc(n);}
void *operator new[](size_t n){return probe_malloc(n);}
void operator delete(void*p)noexcept{probe_free(p);}
void operator delete[](void*p)noexcept{probe_free(p);}
void operator delete(void*p,size_t)noexcept{probe_free(p);}
void operator delete[](void*p,size_t)noexcept{probe_free(p);}
#endif
#ifdef __cplusplus
extern "C" {
#endif
void st_probe_reset(void){assert(probe_stats.live==0);memset(&probe_stats,0,sizeof(probe_stats));}
void st_probe_stats(ProbeStats*out){*out=probe_stats;}
#ifdef __cplusplus
}
#endif
