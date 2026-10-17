#!/usr/bin/env python3
"""Prepare and check complete resident training histories (no timing claim).

source-training.py prepare OUTPUT
source-training.py verify OUTPUT [--browser PATH]
The emitted native CLI runs native-{cpu,gpu}-script.json with --script, writing
native-{cpu,gpu}-history.jsonl. CPU supplies the exact source execution control;
an independent reverse calculation checks every initial gradient coordinate.
"""
import argparse
import copy
import hashlib
import json
import math
from pathlib import Path
import struct


def write(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


def initial():
    parameters = [dict(value=(i % 11 - 3) / 64, first=0.0, second=0.0,
                       first_power=1.0, second_power=1.0, steps=0) for i in range(244)]
    for base, fan, count in [(0, 10, 12), (132, 6, 12), (216, 6, 4)]:
        for i in range(count):
            parameters[base + i * (fan + 1) + fan]['value'] = 0.25 if base < 216 else 0.0
    features = [(i % 7 + 1) / 16 for i in range(20)]
    targets = [(i % 4 + 1) / 8 for i in range(8)]
    config = dict(rate=0.001, first_decay=0.9, second_decay=0.999, epsilon=1e-8)
    return dict(parameters=parameters, features=features, targets=targets, rows=[0, 1], config=config)


def prepare(root):
    root.mkdir(parents=True, exist_ok=True)
    inputs = initial()
    ref = lambda name: {'input': name}
    result = lambda name: {'step': name}
    plan = dict(inputs=inputs, steps=[
        dict(id='shape', call='shape', args=[ref(n) for n in ['parameters', 'features', 'targets', 'rows']]),
        dict(id='gradient', call='gradients', args=[ref(n) for n in ['parameters', 'features', 'targets', 'rows']]),
        dict(id='updated', call='update', args=[ref('parameters'), result('gradient'), result('shape'), ref('config')]),
        dict(id='loss', call='losses', args=[result('updated'), ref('features'), ref('targets'), ref('rows')]),
    ], feedback={'parameters': 'updated'}, outputs=['shape', 'gradient', 'updated', 'loss'])
    operations = []

    def step(label, count=1):
        operations.extend([dict(label=label + '-step', session='training', step=count, wait=True),
                           dict(label=label, session='training', read={'outputs': plan['outputs']})])

    def replace(name, value):
        operations.append(dict(label='write-' + name, session='training', write={'input': name, 'value': value}))

    step('first')
    step('third', 2)
    for name in ['rows', 'features', 'targets']:
        replace(name, [])
    step('empty')
    for name in ['rows', 'features', 'targets']:
        replace(name, inputs[name])
    replace('config', dict(inputs['config'], rate=0.0))
    step('invalid-config')
    replace('config', inputs['config'])
    poisoned = copy.deepcopy(inputs['targets'])
    poisoned[0] = {'F32Bits': 2143289345}
    replace('targets', poisoned)
    step('nonfinite-gradient')
    replace('targets', inputs['targets'])
    exhausted = copy.deepcopy(inputs['parameters'])
    for p in exhausted:
        p['steps'] = 4294967294
    replace('parameters', exhausted)
    step('exhausted')
    invalid = copy.deepcopy(inputs['parameters'])
    invalid[0]['value'] = {'F32Bits': 2143289345}
    invalid[1]['value'] = -0.0
    replace('parameters', invalid)
    step('nonfinite-state')
    replace('parameters', inputs['parameters'])
    replace('rows', [0])
    replace('features', inputs['features'][:10])
    replace('targets', inputs['targets'][:4])
    step('shorter-batch')
    replace('features', [])
    step('invalid-shape')
    for name in ['parameters', 'rows', 'features', 'targets']:
        replace(name, inputs[name])
    step('restarted')
    write(root / 'training-plan.json', plan)
    for backend in ['cpu', 'gpu-required']:
        label = 'gpu' if backend == 'gpu-required' else 'cpu'
        write(root / f'native-{label}-script.json',
              [dict(label='open', open=plan, **{'as': 'training'}, backend=backend)] + operations +
              [dict(label='close', session='training', close=True)])
    write(root / 'storage-retention.json', {'schema': 1, 'keep': [
        {'path': 'training-plan.json', 'reason': 'Exact training inputs and resident feedback plan'},
        *[{'path': f'native-{b}-script.json', 'reason': 'Exact complete validation history'} for b in ['cpu', 'gpu']],
        *[{'path': f'native-{b}-history.jsonl', 'reason': 'Selected complete execution evidence'} for b in ['cpu', 'gpu']],
        {'path': 'receipt.json', 'reason': 'Independent gradient and complete-history validation'},
        {'path': 'storage-retention.json', 'reason': 'Retention contract'},
    ], 'safe_to_remove': []})


def canonical(value):
    # JSON equality alone identifies +0 and -0. Keep their exact binary64 JSON
    # transport values distinct; all finite source F32 values embed exactly.
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return ('number', struct.pack('>d', float(value)).hex())
    if isinstance(value, list):
        return [canonical(v) for v in value]
    if isinstance(value, dict):
        if value == {'F32Bits': 2147483648}:
            return canonical(-0.0)
        return {k: canonical(v) for k, v in sorted(value.items())}
    return value


def histories(root, backend):
    script = json.loads((root / f'native-{backend}-script.json').read_text())
    replies = [json.loads(line) for line in (root / f'native-{backend}-history.jsonl').read_text().splitlines()]
    assert len(script) == len(replies), (backend, len(script), len(replies))
    values, steps = {}, []
    for operation, reply in zip(script, replies):
        assert 'error' not in reply, (operation['label'], reply)
        if 'open' in operation:
            assert reply['backend'] == ('gpu' if backend == 'gpu' else 'cpu'), reply
        if 'step' in operation:
            steps.append(reply)
            if backend == 'gpu':
                assert reply['backend'] == 'gpu' and reply['counters']['dispatches'] > 0, reply
                assert reply['counters'].get('upload_bytes', 0) == 0, reply
                assert reply['counters'].get('readback_bytes', 0) == 0, reply
        if 'read' in operation:
            values[operation['label']] = reply['values']
    return values, steps


def independent_reverse(inputs):
    """Ordinary real-valued backprop, independent of Ink's coordinate forward AD.

    This numerical oracle has a declared tolerance; exact backend correspondence
    is checked separately against complete compiled source execution.
    """
    weights = [p['value'] for p in inputs['parameters']]
    gradient = [0.0] * len(weights)
    losses = []
    for row in inputs['rows']:
        layers = [inputs['features'][row * 10:(row + 1) * 10]]
        tapes = []
        for base, fan in [(0, 10), (132, 6)]:
            previous = layers[-1]
            outputs, tape = [], []
            for neuron in range(6):
                first = base + neuron * 2 * (fan + 1)
                gate = first + fan + 1
                value = weights[first + fan] + sum(weights[first + i] * x for i, x in enumerate(previous))
                gating = weights[gate + fan] + sum(weights[gate + i] * x for i, x in enumerate(previous))
                outputs.append(value * gating if gating > 0 else 0.0)
                tape.append((first, gate, value, gating))
            layers.append(outputs)
            tapes.append(tape)
        adjoint = [0.0] * 6
        loss = 0.0
        for neuron in range(4):
            base = 216 + neuron * 7
            value = weights[base + 6] + sum(weights[base + i] * x for i, x in enumerate(layers[2]))
            error = value - inputs['targets'][row * 4 + neuron]
            loss += error * error / 4
            derivative = error / (2 * len(inputs['rows']))
            gradient[base + 6] += derivative
            for i, x in enumerate(layers[2]):
                gradient[base + i] += derivative * x
                adjoint[i] += derivative * weights[base + i]
        losses.append(loss)
        for layer in [1, 0]:
            previous = layers[layer]
            propagated = [0.0] * len(previous)
            for derivative, (first, gate, value, gating) in zip(adjoint, tapes[layer]):
                d_value = derivative * gating if gating > 0 else 0.0
                d_gate = derivative * value if gating > 0 else 0.0
                gradient[first + len(previous)] += d_value
                gradient[gate + len(previous)] += d_gate
                for i, x in enumerate(previous):
                    gradient[first + i] += d_value * x
                    gradient[gate + i] += d_gate * x
                    propagated[i] += d_value * weights[first + i] + d_gate * weights[gate + i]
            adjoint = propagated
    return gradient, losses


def verify(root, browser=None):
    cpu, _ = histories(root, 'cpu')
    gpu, steps = histories(root, 'gpu')
    assert canonical(cpu) == canonical(gpu), 'native CPU/GPU complete history mismatch'
    assert len(cpu) == 10
    for name in ['empty', 'invalid-config', 'nonfinite-gradient']:
        assert canonical(cpu[name]['updated']) == canonical(cpu['third']['updated']), name
    assert cpu['empty']['shape'] is False and cpu['empty']['loss'] == []
    assert all(g == 0 for g in cpu['empty']['gradient'])
    assert all(p['steps'] == 4294967294 for p in cpu['exhausted']['updated'])
    assert cpu['nonfinite-state']['updated'][0]['value'] == {'F32Bits': 2143289345}
    assert math.copysign(1.0, cpu['nonfinite-state']['updated'][1]['value']) < 0
    assert len(cpu['shorter-batch']['loss']) == 1 and cpu['shorter-batch']['shape'] is True
    assert cpu['invalid-shape']['shape'] is False
    assert canonical(cpu['invalid-shape']['updated']) == canonical(cpu['shorter-batch']['updated'])
    assert canonical(cpu['restarted']) == canonical(cpu['first'])
    inputs = json.loads((root / 'training-plan.json').read_text())['inputs']
    gradient, losses = independent_reverse(inputs)
    actual = cpu['first']['gradient']
    assert len(actual) == len(gradient) == 244
    errors = [abs(x - y) for x, y in zip(actual, gradient)]
    assert all(error <= 1e-6 + 3e-5 * abs(want) for error, want in zip(errors, gradient)), max(errors)
    assert sum(cpu['third']['loss']) < sum(cpu['first']['loss']) < sum(losses)
    browser_receipt = None
    if browser:
        browser_receipt = json.loads(Path(browser).read_text())
        for backend, values in browser_receipt['histories'].items():
            assert canonical(values) == canonical(cpu), f'browser {backend} complete history mismatch'
        assert browser_receipt['javascript_initial_gradient_exact'] is True
    paths = ['training-plan.json'] + [f'native-{b}-{kind}.{ext}' for b in ['cpu', 'gpu']
                                    for kind, ext in [('script', 'json'), ('history', 'jsonl')]]
    receipt = dict(source='244-coordinate forward AD vs independent reverse calculation',
                   complete_reads=len(cpu), training_coordinates=len(gradient),
                   maximum_gradient_absolute_error=max(errors), gradient_tolerance='1e-6 + 3e-5 * abs(expected)',
                   native_gpu_dispatches=sum(s['counters']['dispatches'] for s in steps),
                   native_step_upload_bytes=0, native_step_readback_bytes=0,
                   browser_backends=list(browser_receipt['histories']) if browser_receipt else [],
                   files={p: hashlib.sha256((root / p).read_bytes()).hexdigest() for p in paths})
    write(root / 'receipt.json', receipt)
    print(json.dumps(receipt, sort_keys=True))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'verify'])
    parser.add_argument('output', type=Path)
    parser.add_argument('--browser', type=Path)
    args = parser.parse_args()
    if args.action == 'prepare':
        prepare(args.output)
    else:
        verify(args.output, args.browser)
