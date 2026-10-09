#include <stdint.h>
#include <stdbool.h>
#include <assert.h>
#include <stdio.h>
bool lang_fn_decision(bool, bool);
bool lang_fn_repeated(uint64_t, uint64_t);
int main(void) {
    unsigned checks=0;
    for (unsigned a=0;a<2;++a) for (unsigned b=0;b<2;++b) {
        assert(lang_fn_decision(a,b)==(bool)a); ++checks;
    }
    uint64_t values[]={0,1,UINT64_C(9223372036854775808),UINT64_MAX};
    for (unsigned a=0;a<4;++a) for (unsigned b=0;b<4;++b) {
        assert(lang_fn_repeated(values[a],values[b])==(values[a]<values[b])); ++checks;
    }
    printf("%u\n",checks);
}
