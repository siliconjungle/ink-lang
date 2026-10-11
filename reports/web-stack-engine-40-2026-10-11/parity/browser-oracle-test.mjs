import {test} from 'node:test';import assert from 'node:assert/strict';
import {equal,exact,normalize} from '../../../bench/composed-parity40-browser.mjs';
test('structural comparison ignores object insertion order but rejects tampering',()=>{
 const a={events:[],result:{Ok:null},commit:1n},b={commit:1,result:{Ok:null},events:[]};
 assert(equal(normalize(a),normalize(b)));
 assert(!equal(normalize(a),normalize({...b,commit:2})));
 assert(!equal({a:[1,2]}, {a:[2,1]}));
 assert(!equal({Ok:null},{Err:null}));
 assert(!equal({a:1},{a:1,b:2}));
 assert(equal(exact(4294967295n,{kind:'u32'}),4294967295));
 assert(equal(exact(-2147483648n,{kind:'i32'}),-2147483648));
 assert(equal(exact({F32Bits:2143294004n},{kind:'f32'}),2143294004));
 assert(equal(exact([[0n,4294967295n]],{kind:'list',element:{kind:'vector',size:2,element:{kind:'u32'}}}),[[0,4294967295]]));
 const u64={kind:'u64'};assert(!equal(exact(18446744073709551615n,u64),exact(18446744073709551614n,u64)));
 const f32={kind:'f32'};assert(!equal(exact({F32Bits:0x7fc01234},f32),exact({F32Bits:0x7fc01235},f32)));
 assert(!equal(exact(-0,f32),exact(0,f32)));
 const ints={kind:'list',element:{kind:'int'}};assert(equal(exact([{Int:'-123456789012345678901'}],ints),['-123456789012345678901']));
});
