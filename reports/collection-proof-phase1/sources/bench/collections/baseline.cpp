#include <cstdint>
#include <cstddef>
#include <vector>
static uint64_t run(const uint64_t *x,size_t n,uint64_t a,uint64_t b,int k) {
#ifdef COMBINED
    if(k==3)return static_cast<uint64_t>(n);
    uint64_t s=0;for(size_t i=n;i>0;--i){uint64_t v=x[i-1];v=k==2?(v+b)*a:v*a+b;if(k==1)v-=b;s+=v;}return s;
#else
    std::vector<uint64_t> first;first.reserve(n);
    for(size_t i=0;i<n;++i)first.push_back(k==2?x[i]+b:x[i]*a);
    if(k==3)return static_cast<uint64_t>(n);
    std::vector<uint64_t> second;second.reserve(n);
    for(auto v:first)second.push_back(k==2?v*a:v+b);
    std::vector<uint64_t>().swap(first);
    if(k==1){std::vector<uint64_t> third;third.reserve(n);for(auto v:second)third.push_back(v-b);second.swap(third);}
    uint64_t s=0;for(size_t i=n;i>0;--i)s+=second[i-1];return s;
#endif
}
#define WRAP(name,k) extern "C" uint64_t lang_fn_##name(const uint64_t *x,size_t n,uint64_t a,uint64_t b){return run(x,n,a,b,k);}
WRAP(two_maps,0) WRAP(three_maps,1) WRAP(shadow_maps,2) WRAP(mapped_count,3)
