// Thin adapter over the pinned upstream Box2D tree, not a reimplementation.
#include <box2d/collision.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>
#include <math.h>
#include <limits.h>

typedef struct { uint64_t* pairs; size_t length, capacity; uint32_t current; } Collector;
static bool valid(const float* b) {
 return isfinite(b[0])&&isfinite(b[1])&&isfinite(b[2])&&isfinite(b[3])&&b[0]<=b[2]&&b[1]<=b[3];
}
static b2AABB bounds(const float* b) { return (b2AABB){{b[0],b[1]},{b[2],b[3]}}; }
static bool collect(int proxy, uint64_t user, void* context) {
 (void)proxy; Collector* c=context; uint32_t other=(uint32_t)user;
 if(other<=c->current) return true;
 if(c->length==UINT32_MAX) abort();
 if(c->length==c->capacity) {
  size_t capacity=c->capacity ? c->capacity*2 : 16;
  if(capacity>UINT32_MAX) capacity=UINT32_MAX;
  if(capacity>SIZE_MAX/sizeof(uint64_t)) abort();
  uint64_t* p=realloc(c->pairs,capacity*sizeof(uint64_t));if(!p)abort();c->pairs=p;c->capacity=capacity;
 }
 c->pairs[c->length++]=((uint64_t)c->current<<32)|other;return true;
}
static int compare_pair(const void* a,const void* b) {
 uint64_t x=*(const uint64_t*)a,y=*(const uint64_t*)b;return (x>y)-(x<y);
}
// Caller frees native output within timing; oracle-view copies are outside timing.
size_t ink_box2d_pairs(const float* boxes,uint32_t count,uint64_t** result) {
 if(count>INT_MAX)abort();
 b2DynamicTree tree=b2CreateDynamicTree((int)count);
 for(uint32_t i=0;i<count;++i)if(valid(boxes+4*(size_t)i))b2CreateTreeProxy(&tree,bounds(boxes+4*(size_t)i),UINT64_MAX,i);
 Collector c={0};
 for(uint32_t i=0;i<count;++i)if(valid(boxes+4*(size_t)i)) { c.current=i;b2DynamicTree_QueryAll(&tree,bounds(boxes+4*(size_t)i),collect,&c); }
 b2DestroyDynamicTree(&tree);
 if(c.length>1)qsort(c.pairs,c.length,sizeof(uint64_t),compare_pair);
 *result=c.pairs;return c.length;
}
void ink_box2d_free(uint64_t* p){free(p);}
