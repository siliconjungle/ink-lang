#include "state-abi.h"
#include <assert.h>
#include <string.h>
static uint32_t bytes(const void *p,size_t n){uint32_t b=lang_buffer_alloc((uint32_t)n);assert(b);memcpy((void*)lang_buffer_ptr(b),p,n);return b;}
static uint32_t request(uint32_t s,const char *json){uint32_t b=bytes(json,strlen(json)),r=lang_invoke(s,b);assert(r);assert(lang_buffer_free(b));return r;}
int main(void){assert(lang_abi_version()==1);uint32_t s=lang_init();assert(s);uint32_t r=request(s,"{\"call\":\"checked\",\"args\":[18446744073709551615,1]}");char response[4096];assert(lang_buffer_len(r)<sizeof(response));memcpy(response,(void*)lang_buffer_ptr(r),lang_buffer_len(r));response[lang_buffer_len(r)]=0;assert(strstr(response,"Error.Overflow"));assert(lang_buffer_free(r));
 r=request(s,"{\"pure\":\"wide_scan\",\"args\":[[18446744073709551615,1,3]]}");assert(lang_buffer_len(r)<sizeof(response));memcpy(response,(void*)lang_buffer_ptr(r),lang_buffer_len(r));response[lang_buffer_len(r)]=0;assert(strstr(response,"18446744073709551615,0,3"));assert(lang_buffer_free(r));
 uint32_t checkpoint=lang_checkpoint(s);assert(checkpoint);uint32_t restored=lang_restore(checkpoint);assert(restored);uint32_t again=lang_checkpoint(restored);assert(again);assert(lang_buffer_len(checkpoint)==lang_buffer_len(again));assert(!memcmp((void*)lang_buffer_ptr(checkpoint),(void*)lang_buffer_ptr(again),lang_buffer_len(again)));assert(lang_buffer_free(checkpoint));assert(lang_buffer_free(again));assert(lang_state_drop(s));assert(lang_state_drop(restored));assert(!lang_state_drop(restored));return 0;}
