
#include "allocation_probe.h"
int main(void){
 st_probe_reset();
 unsigned char*p=(unsigned char*)malloc(12),*q=(unsigned char*)calloc(20,1);
 assert((uintptr_t)p%_Alignof(max_align_t)==0);assert((uintptr_t)q%_Alignof(max_align_t)==0);
 ProbeStats s;st_probe_stats(&s);assert(s.calls==2&&s.resizes==0&&s.requested==32&&s.live==32&&s.peak==32);
 free(p);q=(unsigned char*)realloc(q,40);for(int i=0;i<20;i++)assert(q[i]==0);
 st_probe_stats(&s);assert(s.calls==3&&s.resizes==1&&s.requested==72&&s.live==40&&s.peak==40);
 free(q);st_probe_stats(&s);assert(s.live==0&&s.requested==72&&s.peak==40);
 st_probe_reset();st_probe_stats(&s);assert(s.calls==0&&s.live==0&&s.peak==0);return 0;
}
