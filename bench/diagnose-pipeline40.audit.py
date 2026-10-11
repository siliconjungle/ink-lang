"""Bind exact source, validation coverage and function-scoped static compiler evidence."""
from pathlib import Path
import argparse, collections, copy, hashlib, json, re

B = Path(__file__).resolve().parents[1]
R = B / 'reports/web-stack-engine-40-2026-10-11/fusion'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
rd = lambda p: json.loads(p.read_text())

def ir_function(text, name):
    m = re.search(r'^define [^\n]*@' + re.escape(name) + r'\([^\n]*\{\n', text, re.M)
    assert m, name
    return text[m.start():text.index('\n}', m.end()) + 2]

def c_range(text, name):
    m = re.search(r'\b' + re.escape(name) + r'\([^;\n]*\)\s*\{', text)
    assert m, name
    i, depth = m.end(), 1
    while depth:
        depth += (text[i] == '{') - (text[i] == '}'); i += 1
    return text[:m.start()].count('\n') + 1, text[:i].count('\n') + 1

def audit_validation(raw, manifest, evidence):
    assert raw['status'] == 'passed' and raw['mode'] == 'validate'
    assert raw['bindings']['manifest'] == sha(R / 'manifest-final.json')
    assert raw['bindings']['harness'] == sha(B / 'bench/diagnose-pipeline40.mjs')
    assert raw['bindings']['compiler_evidence'] == sha(R / 'compiler-evidence.json')
    fixtures = rd(B / manifest['fixture_path'])['frames']
    names = sorted({row['variant'] for row in manifest['rows']}) + ['prior_wasm_ordinary', 'prior_wasm_no_vectorizers', 'checked_wasm_ordinary', 'checked_wasm_no_vectorizers']
    expected = {(f['id'], name) for f in fixtures for name in names}
    actual = [(row['frame'], row['variant']) for row in raw['validation']]
    assert len(actual) == len(expected) and set(actual) == expected, 'missing/duplicate validation'
    for row in raw['validation']:
        assert all(row[key] is True for key in ['full_output', 'changed_input', 'zero_divisor', 'nonmutation'])
        if '_wasm_' not in row['variant']:
            assert row['owned_changed_input_lifetime'] is True
    assert not raw['samples'] and not raw['calibration'] and not raw['warmups'] and not raw['profile_calls']
    return len(actual)

def main():
    manifest = rd(R / 'manifest-final.json'); evidence = rd(R / 'compiler-evidence.json')
    assert sha(B / manifest['fixture_path']) == manifest['fixtures_sha256']
    assert sha(B / manifest['expert_path']) == manifest['expert_sha256']
    assert sha(B / manifest['metadata_path']) == manifest['metadata_sha256']
    previous = manifest['previous_manifest']
    assert sha(B / previous['path']) == previous['sha256'] == evidence['manifest_sha256']
    for row in manifest['rows']:
        assert sha(B / row['path']) == row['sha256']
        assert sha(B / row['original_path']) == row['original_sha256']
        original = (B / row['original_path']).read_text()
        transformed = (B / row['path']).read_text()
        assert original.split('function __fn1', 1)[1] == transformed.split('function __fn1', 1)[1]
        if row['variant'].endswith('_clone'):
            assert row['sha256'] == row['original_sha256']
    raw = rd(R / 'validate-final.json')
    count = audit_validation(raw, manifest, evidence)
    smokes = []
    for name, mutate in [('missing-frame', lambda x: x['validation'].pop()),
                         ('duplicate-frame', lambda x: x['validation'].append(copy.deepcopy(x['validation'][0]))),
                         ('false-nonmutation', lambda x: x['validation'][0].update(nonmutation=False)),
                         ('stale-manifest-binding', lambda x: x['bindings'].update(manifest='0' * 64))]:
        bad = copy.deepcopy(raw); mutate(bad)
        try:
            audit_validation(bad, manifest, evidence)
        except AssertionError:
            smokes.append({'case': name, 'rejected': True})
        else:
            raise AssertionError('tamper not rejected: ' + name)
    summary = []
    for record in evidence['records']:
        assert sha(B / record['ir_path']) == record['ir_sha256']
        assert sha(B / record['remarks_path']) == record['remarks_sha256']
        source = B / 'reports/web-stack-proofs-38-2026-10-11/targets/targets' / record['task'] / record['version'] / 'cpu.c'
        assert sha(source) == record['source_sha256']
        if 'wasm_path' in record:
            assert sha(B / record['wasm_path']) == record['wasm_sha256']
        ll = (B / record['ir_path']).read_text(); text = source.read_text()
        remarks = (B / record['remarks_path']).read_text()
        functions = []
        for suffix in ['', '_into']:
            name = 'lang_fn_' + record['task'] + suffix
            body = ir_function(ll, name); start, end = c_range(text, name)
            scoped = []
            for line in remarks.splitlines():
                match = re.search(r'cpu\.c:(\d+):\d+: remark:', line)
                if match and start <= int(match[1]) <= end:
                    scoped.append(line)
            functions.append({'name': name, 'c_line_range': [start, end], 'ir_sha256': hashlib.sha256(body.encode()).hexdigest(),
                              'vector_i32_type_occurrences': len(re.findall(r'<[0-9]+ x i32>', body)),
                              'scalar_or_vector_udiv_instructions': len(re.findall(r' = udiv\b', body)),
                              'scalar_or_vector_urem_instructions': len(re.findall(r' = urem\b', body)),
                              'vectorization_remarks_in_source_range': scoped})
        summary.append({key: record[key] for key in ['task', 'version', 'target', 'mode']} | {'functions': functions})
    output = {'status': 'passed', 'complete_untimed_validation': count, 'tamper_smokes': smokes,
              'module_variants': len(manifest['rows']), 'static_builds': len(summary), 'function_scoped_static': summary,
              'bindings': {'manifest': sha(R / 'manifest-final.json'), 'validation': sha(R / 'validate-final.json'),
                           'compiler_evidence': sha(R / 'compiler-evidence.json'), 'audit_tool': sha(Path(__file__))},
              'limits': ['IR counts and compiler remarks are static facts; neither timing nor dynamic cause.',
                         'C source line mapping excludes allocator/ABI loops outside named source functions, but optimized inline mappings may be incomplete.',
                         'No pooling native/Wasm/JS boundaries and no claims of admitted rewrites or broad performance improvement.']}
    with (R / 'untimed-audit.json').open('x') as f:
        json.dump(output, f, indent=2); f.write('\n')
    print(json.dumps({'status': 'passed', 'validation': count, 'tamper_smokes': len(smokes), 'static_builds': len(summary)}))

if __name__ == '__main__':
    main()
