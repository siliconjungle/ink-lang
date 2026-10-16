"""Frozen traversal proposals replay ordinary complete transition proofs."""
import copy
from contextlib import redirect_stdout
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from producers.frozen_specialization import Partial, specialize
from producers import frozen_specialization

ROOT = Path(__file__).resolve().parents[2]
INK = Path(os.environ.get('INK_COMPILER', ROOT/'target/debug/ink'))


class FrozenTraversal(unittest.TestCase):
    def test_compact_rejection_replays_checked_fallback_and_failure_keeps_prior_output(self):
        with tempfile.TemporaryDirectory() as temp:
            temp = Path(temp)
            source, core, output = temp/'source.ink', temp/'source.core.json', temp/'selection.json'
            source.write_text('module fallback; state Frozen:Table<u64,u64>=Table.empty(); query serve(x:u64)->u64 reads(Frozen){return Frozen.get(0).unwrap_or(0)+x;}')
            subprocess.run([INK, 'emit-core', source, '-o', core], check=True, capture_output=True)
            program = json.loads(core.read_bytes())
            program['semantics'] = 'ink-executable-core-v14'
            program['program']['frozen'] = {'Frozen': [[0, 42]]}
            core.write_text(json.dumps(program))
            argv = ['frozen_specialization', str(core), '--ink', str(INK.resolve()), '-o', str(output)]
            wrong = {'Refl': {'Var': 'missing'}}
            with patch('sys.argv', argv), patch.object(frozen_specialization, 'compact_equality', return_value=wrong), redirect_stdout(io.StringIO()) as stdout:
                frozen_specialization.main()
            self.assertEqual(json.loads(stdout.getvalue())['proof_strategy'], 'normalized')
            subprocess.run([INK, 'check-selection', core, output], check=True, capture_output=True)
            saved = output.read_bytes()
            with patch('sys.argv', argv), patch.object(frozen_specialization, 'compact_equality', return_value=wrong), patch.object(frozen_specialization, 'equality', return_value=wrong):
                with self.assertRaises(subprocess.CalledProcessError):
                    frozen_specialization.main()
            self.assertEqual(output.read_bytes(), saved)

    def test_fold_slots_are_linear_hygienic_and_keep_even_unused_initializers(self):
        p = dict(functions=[], states=[], enums={}, records={})
        for name in ['foldl', 'foldr']:
            partial = Partial(p)
            rows = {'Call': ['list', [{'Num': x} for x in range(24)]]}
            step = {'Lambda': ['x', {'Lambda': ['acc', {'Binary': ['+', {'Var': 'acc'}, {'Var': 'acc'}]}]}]}
            result = partial.expr({'Call': [name, [rows, {'Call': ['initial', []]}, step]]})
            bindings = []
            rest = partial.leading_bindings(result, bindings)
            self.assertEqual(len(bindings), 25)
            self.assertEqual(bindings[0]['Let'][2], {'Call': ['initial', []]})
            self.assertEqual(rest, {'Var': bindings[-1]['Let'][0]})
            self.assertLess(len(json.dumps(result)), 8000)
            names = [b['Let'][0] for b in bindings]
            self.assertEqual(len(set(names)), len(names))
            for before, after in zip(names, bindings[1:]):
                self.assertEqual(after['Let'][2], {'Binary': ['+', {'Var': before}, {'Var': before}]})
            # The inner binder shadows the outer one; substitution must not
            # replace that accumulator with an element of the frozen list.
            shadowed = {'Lambda': ['x', {'Lambda': ['x', {'Var': 'x'}]}]}
            expression = partial.expr({'Call': [name, [rows, {'Num': 7}, shadowed]]})
            local = []
            partial.leading_bindings(expression, local)
            self.assertEqual(local[1]['Let'][2], {'Var': local[0]['Let'][0]})
            for elements in [[], [{'Num': 1}]]:
                unused = {'Lambda': ['x', {'Lambda': ['acc', {'Num': 42}]}]}
                expression = partial.expr({'Call': [name, [{'Call': ['list', elements]}, {'Call': ['initial', []]}, unused]]})
                self.assertIn('"initial"', json.dumps(expression))
        # Ordinary lexical names must retain their expression scope.
        untouched = {'Let': ['user', None, {'Num': 1}, {'Var': 'user'}]}
        statements = []
        self.assertEqual(Partial(p).leading_bindings(untouched, statements), untouched)
        self.assertEqual(statements, [])

    def test_dynamic_lists_remain_dynamic_and_expansion_charges_existing_work_budget(self):
        p = dict(functions=[], states=[], enums={}, records={})
        step = {'Lambda': ['x', {'Lambda': ['acc', {'Var': 'acc'}]}]}
        expression = {'Call': ['foldl', [{'Var': 'live'}, {'Num': 0}, step]]}
        self.assertEqual(Partial(p).expr(expression), expression)
        partial = Partial(p)
        partial.work = 99999
        with self.assertRaisesRegex(ValueError, 'work budget'):
            partial.expr({'Call': ['foldl', [{'Call': ['list', [{'Num': 1}]]}, {'Num': 0}, step]]})

    def test_left_and_right_folds_preserve_order_events_failures_and_all_checkpoints(self):
        source = '''module frozen_traversal;
state Model:Table<u64,List<f32>>=Table.empty();
state Live:Table<u64,u64>=Table.empty();
event Seen:f32;
fn left(weights:List<f32>,initial:f32,x:f32)->f32 {
 return foldl(weights,initial,fn(w)=>fn(acc)=>acc+w*x);
}
fn right(weights:List<f32>,initial:f32,x:f32)->f32 {
 return foldr(weights,initial,fn(w)=>fn(acc)=>acc+w*x);
}
change tick(value:f32,fail:Bool)->Result<f32,u64> reads(Live) writes(Live) emits(Seen) {
 Live.put(0,Live.get(0).unwrap_or(0)+1);emit Seen(value);
 if fail {return Err(99);}return Ok(value);
}
change compute(initial:f32,x:f32,first:Bool,second:Bool)->Result<f32,u64>
 reads(Model,Live) writes(Live) emits(Seen) {
 return Ok(left(Model.get(0).unwrap_or([]),tick(initial,first)?,tick(x,second)?));
}
query reverse(initial:f32,x:f32)->f32 reads(Model) {
 return right(Model.get(0).unwrap_or([]),initial,x);
}
'''
        with tempfile.TemporaryDirectory() as temp:
            temp = Path(temp)
            src, core = temp/'source.ink', temp/'source.core.json'
            src.write_text(source)
            subprocess.run([INK, 'emit-core', src, '-o', core], check=True, capture_output=True)
            base = json.loads(core.read_bytes())
            for count in [0, 1, 8, 24]:
                original = copy.deepcopy(base)
                original['semantics'] = 'ink-executable-core-v14'
                # Nonassociative finite values, subnormals and signed zeros;
                # later steps must not be reassociated with earlier ones.
                coefficients = [0x4b800000, 0x3f800000, 0xcb800000, 0x80000000, 1, 0x3e800001]
                original['program']['frozen'] = {'Model': [[0, [{'F32Bits': coefficients[i % len(coefficients)]} for i in range(count)]]]}
                core.write_text(json.dumps(original))
                candidate = specialize(original)
                for name in ['compute', 'reverse']:
                    action = next(a for a in candidate['program']['actions'] if a['name'] == name)
                    text = json.dumps(action['body'])
                    for removed in ['"Model"', '"left"', '"right"', '"foldl"', '"foldr"']:
                        self.assertNotIn(removed, text)
                packet = temp/'selection.json'
                result = subprocess.run(['python3', ROOT/'knowledge/producers/frozen_specialization.py', core,
                                         '--ink', INK, '-o', packet], capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, (count, result.stderr))
                steps = []
                for bits in [0, 0x80000000, 1, 0x3dcccccd, 0x7f800000, 0x7fa01234]:
                    value = {'F32Bits': bits}
                    steps.extend([dict(call='compute', args=[value, 1.0, False, False]),
                                  dict(call='compute', args=[value, 1.0, True, False]),
                                  dict(call='compute', args=[value, 1.0, False, True]),
                                  dict(call='reverse', args=[value, 1.0])])
                # Prefix execution compares every complete checkpoint, so an
                # intermediate failure/event difference cannot hide at the end.
                for prefix in range(1, len(steps) + 1):
                    script = temp/'script.json'
                    script.write_text(json.dumps(steps[:prefix]))
                    observations = []
                    for selection in [None, packet]:
                        snapshot = temp/f'{selection is not None}.snapshot'
                        command = [INK, 'execute', core, script, '--core', '--portable', '--snapshot-out', snapshot]
                        if selection:
                            command += ['--selection', selection]
                        output = subprocess.run(command, check=True, capture_output=True)
                        observations.append((json.loads(output.stdout), snapshot.read_bytes()))
                    self.assertEqual(observations[0], observations[1], (count, prefix))
                if count:
                    forged = json.loads(packet.read_bytes())
                    action = next(a for a in forged['action_replacement']['selected']['program']['actions'] if a['name'] == 'reverse')
                    def corrupt(value):
                        if isinstance(value, dict):
                            if 'Float' in value:
                                value['Float'] ^= 1
                                return True
                            return any(corrupt(child) for child in value.values())
                        return isinstance(value, list) and any(corrupt(child) for child in value)
                    self.assertTrue(corrupt(action['body']))
                    bad = temp/'wrong-step.json'
                    bad.write_text(json.dumps(forged))
                    rejection = subprocess.run([INK, 'check-selection', core, bad], capture_output=True)
                    self.assertNotEqual(rejection.returncode, 0)


if __name__ == '__main__':
    unittest.main()
