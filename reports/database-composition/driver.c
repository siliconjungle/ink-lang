#include <stdint.h>
#include <stdbool.h>
#include <assert.h>
#include <stdio.h>
bool lang_fn_decision(uint64_t,uint64_t,bool);
int main(void) {
    uint64_t xs[]={0,1,UINT64_C(9223372036854775808),UINT64_MAX};
    unsigned checks=0;
    for(unsigned x=0;x<4;++x) for(unsigned l=0;l<4;++l) for(unsigned f=0;f<2;++f) {
        assert(lang_fn_decision(xs[x],xs[l],f)==(xs[x]<xs[l])); ++checks;
    }
    printf("%u\n",checks);
}
