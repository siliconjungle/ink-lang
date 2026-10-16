#!/usr/bin/env python3
"""Extend the frozen-program fixture with independently evaluated GPU prefix calls.

This benchmark fixture targets examples/frozen-program.ink. It does not authorize
an equality, infer a general algorithm or establish GPU profitability.
"""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ink', required=True, type=Path)
    parser.add_argument('--artifact', required=True, type=Path)
    parser.add_argument('--history', required=True, type=Path)
    parser.add_argument('--prefix-operations', required=True, type=int)
    parser.add_argument('--helper', help='default: the balanced eight-op fixture helper at the requested prefix size')
    parser.add_argument('-o', required=True, type=Path)
    args = parser.parse_args()
    if not 1 <= args.prefix_operations <= 512:
        parser.error('prefix operation count must be 1..512')
    compiler = args.ink.resolve(); artifact = args.artifact.resolve()
    manifest = json.loads((artifact/'program/manifest.json').read_bytes())
    candidates = [f['name'] for f in manifest['functions']
                  if f['name'].startswith('__frozen_proposal_') and f['gpu']]
    source = json.loads((artifact/'compiled.core.json').read_bytes())
    code = source['program']['frozen']['Structure'][0][1][:args.prefix_operations]
    if args.helper:
        helper = args.helper
    else:
        # This benchmark fixture has repeated eight-op leaves and a balanced
        # doubling tree. Eligibility no longer identifies the requested size:
        # larger roots can now also run on the GPU. Check the fixture shape and
        # select its declared level, then independently evaluate every case.
        if len(code) < 8 or len(code) % 8 or len(code)//8 & (len(code)//8-1):
            raise ValueError('provide --helper for a non-power-of-two eight-op prefix')
        if code != code[:8]*(len(code)//8):
            raise ValueError('default helper selection requires the repeated eight-op fixture')
        selected = json.loads((artifact/'selected.core.json').read_bytes())
        helpers = [f for f in selected['program']['functions'] if f['name'].startswith('__frozen_proposal_')]
        helper = helpers[(len(code)//8).bit_length()-1]['name']
    if helper not in candidates:
        raise ValueError('prefix helper must have a declared GPU capability')
    if len(code) != args.prefix_operations:
        raise ValueError('fixture has fewer operations than the requested prefix')
    steps = json.loads((args.history/'script.json').read_bytes())
    expected = json.loads((args.history/'expected.json').read_bytes())
    words = [0,0x80000000,1,0x80000001,0x3dcccccd,0xbf000001,0x7f7fffff,
             0x7f800000,0xff800000,0x7fa01234,0xffc05678]
    with tempfile.TemporaryDirectory(prefix='ink-prefix-reference-') as temporary:
        path = Path(temporary)/'args.json'
        def reference(module, function, values):
            path.write_text(json.dumps(values))
            result = subprocess.run([str(compiler),'run',str(module),function,str(path),'--core'],
                                    capture_output=True,text=True,check=True)
            return json.loads(result.stdout)
        for index, word in enumerate(words):
            weights = {'scale':{'F32Bits':words[(index+3)%len(words)]},
                       'bias':{'F32Bits':words[(index+5)%len(words)]}}
            values = [weights,{'F32Bits':word}]
            value = reference(artifact/'compiled.core.json','evaluate',[code,*values])
            assert value == reference(artifact/'selected.core.json',helper,values)
            steps.append(dict(pure=helper,args=values,expect_gpu=True))
            expected.append(dict(reply=dict(value=value),snapshot=expected[-1]['snapshot']))
    # Publish only after all independent reference executions agree.
    args.o.mkdir(parents=True,exist_ok=False)
    (args.o/'script.json').write_text(json.dumps(steps))
    (args.o/'expected.json').write_text(json.dumps(expected))
    (args.o/'state-wasm.mjs').write_bytes((args.history/'state-wasm.mjs').read_bytes())
    (args.o/'scope.json').write_text(json.dumps(dict(helper=helper,prefixOperations=len(code),
        rawFloatClasses=len(words),root=manifest['functions'][-1]),indent=2)+'\n')


if __name__ == '__main__':
    main()
