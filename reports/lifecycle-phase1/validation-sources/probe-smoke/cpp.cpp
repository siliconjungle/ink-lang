
#include "allocation_probe.h"
int main(){
 st_probe_reset();auto*p=new unsigned char[12];auto*q=new unsigned char[20]{};
 assert((uintptr_t)p%alignof(max_align_t)==0);assert((uintptr_t)q%alignof(max_align_t)==0);
 ProbeStats s;st_probe_stats(&s);assert(s.calls==2&&s.resizes==0&&s.requested==32&&s.live==32&&s.peak==32);
 delete[]p;auto*r=new unsigned char[40];delete[]q;
 st_probe_stats(&s);assert(s.calls==3&&s.resizes==0&&s.requested==72&&s.live==40&&s.peak==60);
 delete[]r;st_probe_stats(&s);assert(s.live==0&&s.requested==72&&s.peak==60);
 st_probe_reset();st_probe_stats(&s);assert(s.calls==0&&s.live==0&&s.peak==0);return 0;
}
