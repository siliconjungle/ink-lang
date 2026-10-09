/* Ordered flat table. This baseline has the same observations as the program,
   but specialises total storage to u128: at most 2^64 rows of u32 need <2^96.
   Validated failures make no externally visible writes; fail() can be reduced
   to a presence check. Those optimisations are intentional baseline strengths. */
#include "api.h"
#include <stdlib.h>
#include <string.h>
#include <assert.h>
typedef struct {uint64_t key;uint32_t stock;} Row;
typedef struct {uint64_t commit,position,key;uint32_t before,after;} Event;
typedef struct {Row *rows;size_t n,cap;Event *events;size_t en,ecap;uint64_t version;__uint128_t total;} State;
static void *grow(void *p,size_t count,size_t width){if(count>SIZE_MAX/width)abort();void *q=realloc(p,count*width);if(!q)abort();return q;}
static size_t lower(State*s,uint64_t key){size_t a=0,b=s->n;while(a<b){size_t m=a+(b-a)/2;if(s->rows[m].key<key)a=m+1;else b=m;}return a;}
void *st_new(uint64_t rows){State*s=calloc(1,sizeof(*s));if(!s)abort();s->cap=rows?rows:1;s->rows=grow(0,s->cap,sizeof(Row));for(uint64_t i=0;i<rows;i++){s->rows[i]=(Row){i,i%10};s->total+=i%10;}s->n=rows;s->version=rows;return s;}
void st_free(void *p){State*s=p;free(s->rows);free(s->events);free(s);}
uint32_t st_apply(void *p,uint32_t op,uint64_t key,uint32_t value){
 State*s=p;size_t i=lower(s,key);int found=i<s->n&&s->rows[i].key==key;
 if(op==3)return found?3:1;
 if(op==0){if(found)return 2;if(s->n==s->cap){if(s->cap>SIZE_MAX/2)abort();s->cap*=2;s->rows=grow(s->rows,s->cap,sizeof(Row));}memmove(s->rows+i+1,s->rows+i,(s->n-i)*sizeof(Row));s->rows[i]=(Row){key,value};s->n++;s->total+=value;}
 else if(op==1){if(!found)return 1;uint32_t old=s->rows[i].stock;if(value>UINT32_MAX-old)return 3;uint32_t next=old+value;s->rows[i].stock=next;s->total+=value;
  if(s->en==s->ecap){s->ecap=s->ecap?s->ecap*2:16;s->events=grow(s->events,s->ecap,sizeof(Event));}s->events[s->en++]=(Event){s->version+1,0,key,old,next};}
 else if(op==2){if(found){s->total-=s->rows[i].stock;memmove(s->rows+i,s->rows+i+1,(s->n-i-1)*sizeof(Row));s->n--;}}
 else abort();s->version++;return 0;
}
uint32_t st_stock(void*p,uint64_t key,uint32_t*found){State*s=p;size_t i=lower(s,key);*found=i<s->n&&s->rows[i].key==key;return *found?s->rows[i].stock:0;}
void st_total(void*p,uint64_t*lo,uint64_t*hi){__uint128_t t=((State*)p)->total;*lo=(uint64_t)t;*hi=t>>64;}
uint64_t st_version(void*p){return ((State*)p)->version;}
uint64_t st_event_count(void*p){return ((State*)p)->en;}
uint64_t st_event_hash(void*p){State*s=p;uint64_t h=0;for(size_t i=0;i<s->en;i++){Event*e=&s->events[i];uint64_t fields[]={e->commit,e->position,e->key,e->before,e->after};for(int j=0;j<5;j++)h=h*1099511628211ULL^fields[j];}return h;}
