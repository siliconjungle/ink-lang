"""Generated guards must prove exact configuration identity and keep fallback."""
import copy
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.guarded_specialization import (
    author_guarded_substitution, author_list_identity, configuration_literal, guardable,
    guarded_substitution, propose_source,
)
from producers.checked_core_image import write_checked_image

ROOT = Path(__file__).resolve().parents[2]
COMPILER = Path(os.environ.get('INK_COMPILER', ROOT/'target/debug/ink')).resolve()
PROGRAM = dict(enums={'Kind': ['Add', 'Multiply']}, ids=['Key'], records={
    'Node': [['next', {'Option': {'Named': 'Node'}}], ['value', 'F32']],
    'Owned': [['values', {'Buffer': 'F32'}]],
})


class Configuration(unittest.TestCase):
    def test_exact_types_and_ranges(self):
        for ty, values in [('U32', [0, 2**32-1]), ('U64', [0, 2**64-1]),
                           ('I32', [-2**31, 2**31-1])]:
            for value in values:
                with self.subTest(ty=ty, value=value):
                    self.assertIsInstance(configuration_literal(ty, value, PROGRAM), dict)
        for ty, value in [('U32', -1), ('U32', 2**32), ('U64', 2**64),
                          ('I32', -2**31-1), ('I32', 2**31), ('U32', True),
                          ('U64', 0.0), ('Bool', 1), ('F32', True),
                          ('F32', {'F32Bits': -1}), ('F32', {'F32Bits': 2**32}),
                          ('F32', float('nan')), ('Unit', 0), ('String', b'bytes'),
                          ('Int', True), ('Int', 2**1024)]:
            with self.subTest(ty=ty, value=value), self.assertRaises(ValueError):
                configuration_literal(ty, value, PROGRAM)
        self.assertEqual(configuration_literal('String', 'a\U0001f980\x00', PROGRAM),
                         {'String': 'a\U0001f980\x00'})
        with self.assertRaises(UnicodeEncodeError):
            configuration_literal('String', '\ud800', PROGRAM)

    def test_composite_values_and_ownership(self):
        samples = [({'Named': 'Node'}, {'next': {'None': None}, 'value': {'F32Bits': 0x80000000}}),
                   ({'Named': 'Kind'}, 'Kind.Add'), ({'Named': 'Key'}, 2**64-1),
                   ({'List': 'I32'}, [-1, 0, 1]), ({'Vector': ['U32', 2]}, [1, 2]),
                   ({'Option': 'F32'}, {'Some': {'F32Bits': 0x7f800001}}),
                   ({'Result': ['U32', 'String']}, {'Err': 'fallback'})]
        for ty, value in samples:
            with self.subTest(ty=ty):
                self.assertTrue(guardable(ty, PROGRAM))
                self.assertIsNotNone(configuration_literal(ty, value, PROGRAM))
        for ty in ['F64', {'List': 'F64'}, {'Buffer': 'F32'}, {'Named': 'Owned'},
                   {'Named': 'Unknown'}, {'Map': ['U32', 'U32']}]:
            self.assertFalse(guardable(ty, PROGRAM), ty)
        for ty, value in [({'Named': 'Node'}, {'value': 0}),
                          ({'Named': 'Node'}, {'next': {'None': None}, 'value': 0, 'extra': 1}),
                          ({'Named': 'Kind'}, 'Add'), ({'Named': 'Key'}, -1),
                          ({'Vector': ['U32', 2]}, [1]), ({'List': 'U32'}, {}),
                          ({'Option': 'U32'}, {'None': 0}),
                          ({'Result': ['U32', 'String']}, {'Ok': 1, 'Err': 'x'})]:
            with self.subTest(ty=ty, value=value), self.assertRaises(ValueError):
                configuration_literal(ty, value, PROGRAM)


class GuardedSpecialization(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def run_command(self, *args, success=True):
        result = subprocess.run(list(map(str, args)), capture_output=True, text=True, timeout=240)
        self.assertEqual(result.returncode == 0, success, result.stderr[-5000:])
        return result

    def source(self, text):
        path, core = self.d/'source.ink', self.d/'core.json'
        path.write_text(text)
        self.run_command(COMPILER, 'emit-core', path, '-o', core)
        return core

    def generate(self, core, function, parameter, value, name='plan'):
        config, packet = self.d/(name+'-value.json'), self.d/(name+'.json')
        config.write_bytes(canonical(value))
        self.run_command('python3', ROOT/'knowledge/producers/guarded_specialization.py', core,
                         '--function', function, '--parameter', parameter, '--value', config,
                         '--ink', COMPILER, '-o', packet)
        self.run_command(COMPILER, 'check-plan', core, packet, '--core')
        return packet

    def test_stored_general_rule_and_rehashed_false_fallback(self):
        self.assertEqual(guarded_substitution(), author_guarded_substitution())
        core = self.source('module guard; pub fn run(x:u32)->u32{return x;}')
        for valid in [True, False]:
            rule = copy.deepcopy(guarded_substitution())
            if not valid:
                rule['payload']['to']['node']['Op'][1][2] = copy.deepcopy(
                    rule['payload']['to']['node']['Op'][1][1])
                payload = rule['payload']
                rule = semantic_entry(dict(schema=1, semantics=rule['semantics'],
                    dependencies=rule['dependencies'], **payload))
            key = identity(rule)
            store = Store.publish(self.d/('valid' if valid else 'invalid'), [rule])
            view = self.d/'view.json'; view.write_bytes(canonical(store.bundle([key])))
            self.run_command(COMPILER, 'knowledge-check', core, view, success=valid)

    def test_stored_list_comparison_and_false_identity_rejects(self):
        store = Store(ROOT/'knowledge/libraries/proofs/guarded-specialization')
        stored = store.object(store.names['guard/list-identity'])
        self.assertEqual(stored, author_list_identity())
        core = self.source('module lists; pub fn run(xs:List<f32>)->List<f32>{return xs;}')
        for valid in [True, False]:
            rule = copy.deepcopy(stored)
            if not valid:
                rule['payload']['to'] = dict(sort={'Value': 'Bool'}, node={'Bool': True})
                rule = semantic_entry(dict(schema=1, semantics=rule['semantics'],
                    dependencies=rule['dependencies'], **rule['payload']))
            key = identity(rule)
            private = Store.publish(self.d/('valid-list' if valid else 'invalid-list'), [rule])
            view = self.d/'view.json'; view.write_bytes(canonical(private.bundle([key])))
            self.run_command(COMPILER, 'knowledge-check', core, view, success=valid)

    def test_scalar_float_guards_preserve_bits_including_nan_payloads(self):
        core = self.source('''module float_guard;
pub fn run(x:f32,y:u32)->u32{return f32_bits(x)+y;}
''')
        original = json.loads(core.read_bytes())
        self.run_command(COMPILER, 'build', core, '--core', '--target', 'javascript',
                         '-o', self.d/'baseline.mjs')
        configurations = [0, 0x80000000, 0x7f800001, 0xffc01234]
        for bits in configurations:
            with self.subTest(bits=bits):
                selected, _, wrapped = propose_source(original, 'run', 'x', {'F32Bits': bits})
                self.assertTrue(wrapped)
                condition = selected['program']['functions'][0]['body']['Call'][1][0]['Binary']
                self.assertEqual(condition[1], {'Call': ['list', [{'Var': 'x'}]]})
                packet = self.generate(core, 'run', 'x', {'F32Bits': bits}, str(bits))
                self.run_command(COMPILER, 'compile', core, '--core', '--plan', packet,
                                 '--target', 'javascript', '-o', self.d/'selected.mjs')
                script = self.d/'check.mjs'
                script.write_text('''import assert from 'node:assert/strict';
import * as a from './baseline.mjs';import * as b from './selected.mjs';
let cases=0;
for(const bits of [0,2147483648,1,2139095040,4286578688,2139095041,2143289345,4290777652])
for(const y of [0,1,4294967295]){
 const args=[{F32Bits:bits},y];
 assert.deepEqual(b.call('run',args),a.call('run',args));cases++;
}
function changingGetter(module){
 const trace=[];let reads=0;
 const x={get F32Bits(){trace.push('x');return reads++?2147483648:2139095041;}};
 const args=[x,0];Object.defineProperty(args,1,{get(){trace.push('y');return 7;}});
 return {result:module.call('run',args),trace};
}
assert.deepEqual(changingGetter(b),changingGetter(a));
function retry(module){
 const trace=[];let reads=0;
 const x={get F32Bits(){trace.push('x');if(!reads++)throw Error('retry');return 2147483648;}};
 assert.throws(()=>module.call('run',[x,0]),/retry/);
 return {result:module.call('run',[x,0]),trace};
}
assert.deepEqual(retry(b),retry(a));
console.log(JSON.stringify({cases}));''')
                self.assertEqual(json.loads(self.run_command('node', script).stdout)['cases'], 24)

    def test_invalid_configuration_preserves_existing_output(self):
        core = self.source('module invalid; pub fn run(x:u32,y:u32)->u32{return x+y;}')
        config, packet = self.d/'value.json', self.d/'plan.json'
        config.write_text('true'); packet.write_bytes(b'previous checked proposal')
        self.run_command('python3', ROOT/'knowledge/producers/guarded_specialization.py', core,
                         '--function', 'run', '--parameter', 'x', '--value', config,
                         '--ink', COMPILER, '-o', packet, success=False)
        self.assertEqual(packet.read_bytes(), b'previous checked proposal')
        self.assertFalse(list(self.d.glob('.ink-guarded-*')))

    def test_checked_prefix_composes_and_missing_prefix_proof_is_atomic(self):
        core = self.source('''module prefix_guard;
fn plus(x:u32,y:u32)->u32{return x+y;}
pub fn run(mode:u32,input:u32)->u32{return plus(2,mode)+input;}
''')
        prefix = self.d/'prefix.json'
        self.run_command('python3', ROOT/'knowledge/producers/function_specialization.py', core,
            '--functions', 'run', '--ink', COMPILER, '-o', prefix)
        before = json.loads(prefix.read_bytes())
        self.assertEqual([s['kind'] for s in before['steps']], ['functions'])
        self.assertEqual(json.loads(core.read_bytes())['semantics'], 'ink-executable-core-v1')
        self.assertNotEqual(before['steps'][-1]['package']['selected']['semantics'],
                            json.loads(core.read_bytes())['semantics'])
        config, packet = self.d/'value.json', self.d/'composed.json'
        config.write_text('3')
        command = ['python3', ROOT/'knowledge/producers/guarded_specialization.py', core,
            '--prefix-plan', prefix, '--function', 'run', '--parameter', 'mode',
            '--value', config, '--ink', COMPILER, '-o', packet]
        self.run_command(*command)
        combined = json.loads(packet.read_bytes())
        self.assertEqual(combined['steps'][:len(before['steps'])], before['steps'])
        self.assertEqual(combined['input_core_sha256'], before['input_core_sha256'])
        self.run_command(COMPILER, 'check-plan', core, packet, '--core')
        self.run_command(COMPILER, 'build', core, '--core', '--target', 'javascript',
            '-o', self.d/'baseline.mjs')
        self.run_command(COMPILER, 'compile', core, '--core', '--plan', packet,
            '--target', 'javascript', '-o', self.d/'selected.mjs')
        script = self.d/'check.mjs'
        script.write_text('''import assert from 'node:assert/strict';
import * as a from './baseline.mjs';import * as b from './selected.mjs';
for(const mode of [0,3,4,4294967295])for(const input of [0,1,4294967295])
 assert.deepEqual(b.call('run',[mode,input]),a.call('run',[mode,input]));
''')
        self.run_command('node', script)
        before['steps'][-1]['package']['proofs'] = {}
        prefix.write_bytes(canonical(before))
        packet.write_bytes(b'previous checked proposal')
        self.run_command(*command, success=False)
        self.assertEqual(packet.read_bytes(), b'previous checked proposal')
        self.assertFalse(list(self.d.glob('.ink-guarded-*')))

    def test_feature_version_rebinding_does_not_accept_ill_typed_code(self):
        core = self.source('module bad_image; pub fn run(x:u32)->u32{return x+1;}')
        invalid = json.loads(core.read_bytes())
        invalid['program']['functions'][0]['body'] = {'String': 'not a word'}
        with self.assertRaises(subprocess.CalledProcessError) as failure:
            write_checked_image(invalid, self.d/'invalid.json', COMPILER)
        self.assertNotIn(b'incorrect executable semantics version', failure.exception.stderr)

    def test_unused_configuration_declines_before_inserting_a_guard(self):
        core = self.source('module unused; pub fn run(x:f32)->u32{return 7;}')
        with self.assertRaisesRegex(ValueError, 'unused'):
            propose_source(json.loads(core.read_bytes()), 'run', 'x', {'F32Bits': 0})


if __name__ == '__main__':
    unittest.main()
