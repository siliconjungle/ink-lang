#include <stdbool.h>
#include <stdint.h>
#include <assert.h>
#include <stdio.h>
bool lang_fn_conjunction(bool,bool,bool);
bool lang_fn_disjunction(bool,bool,bool);
bool lang_fn_unguarded(bool,bool);
bool lang_fn_numeric(uint64_t,uint64_t,bool,bool);
int main(void) {
    unsigned checks=0;
    for(unsigned a=0;a<2;++a) for(unsigned b=0;b<2;++b) for(unsigned c=0;c<2;++c) {
        assert(lang_fn_conjunction(a,b,c)==(bool)(a&&(b||c))); ++checks;
        assert(lang_fn_disjunction(a,b,c)==(bool)(a||(b&&c))); ++checks;
    }
    for(unsigned a=0;a<2;++a) for(unsigned b=0;b<2;++b) {
        assert(lang_fn_unguarded(a,b)==(bool)(a&&b)); ++checks;
    }
    uint64_t xs[]={0,1,UINT64_C(9223372036854775808),UINT64_MAX};
    for(unsigned x=0;x<4;++x) for(unsigned l=0;l<4;++l) for(unsigned b=0;b<2;++b) for(unsigned c=0;c<2;++c) {
        assert(lang_fn_numeric(xs[x],xs[l],b,c)==(bool)((xs[x]<xs[l])&&(b||c))); ++checks;
    }
    printf("%u\n",checks);
}
