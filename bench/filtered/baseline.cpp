#include <cstdint>
#include <cstddef>
#include <vector>
static uint64_t run(const uint64_t *x,size_t n,uint64_t a,uint64_t b,uint64_t limit,int k){
#ifdef COMBINED
    if(k==3)return b<limit?b*static_cast<uint64_t>(n):0;
    uint64_t sum=0;
    for(size_t i=n;i>0;--i){uint64_t v=x[i-1],y=v*a+b;if((k==1?v:y)<limit)sum+=k==2?1:y;}
    return sum;
#else
    std::vector<uint64_t> first;first.reserve(n);
    if(k==1){for(size_t i=0;i<n;++i)if(x[i]<limit)first.push_back(x[i]);}
    else{for(size_t i=0;i<n;++i)first.push_back(k==3?b:x[i]*a+b);}
    std::vector<uint64_t> second;second.reserve(first.size());
    if(k==1){for(auto v:first)second.push_back(v*a+b);}
    else{for(auto v:first)if(v<limit)second.push_back(v);}
    std::vector<uint64_t>().swap(first);
    if(k==2)return static_cast<uint64_t>(second.size());
    uint64_t sum=0;for(size_t i=second.size();i>0;--i)sum+=second[i-1];return sum;
#endif
}
#define WRAP(name,k) extern "C" uint64_t lang_fn_##name(const uint64_t*x,size_t n,uint64_t a,uint64_t b,uint64_t limit){return run(x,n,a,b,limit,k);}
WRAP(mapped_filter_sum,0) WRAP(filter_map_sum,1) WRAP(mapped_filter_count,2) WRAP(constant_filter_sum,3)
