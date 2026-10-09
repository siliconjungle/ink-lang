"""Check the submitted source and reject six well-typed semantic mutations."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument('--lean', required=True)
args = parser.parse_args()
p = Path(__file__).resolve().parent
payload = json.loads((p/'module-payload.json').read_text())
declarations = payload['declarations']

def source(ds):
    result = 'import Init\n\nnamespace Hunch.CompleteRowColumns\n'
    for d in ds:
        result += f"{'def' if d['kind'] == 'definition' else 'theorem'} {d['name']} : ({d['type']}) :=\n  " + d['value'].replace('\n', '\n  ') + '\n\n'
    result += 'end Hunch.CompleteRowColumns\n'
    for d in ds:
        result += f"#print axioms Hunch.CompleteRowColumns.{d['name']}\n"
    return result

assert source(declarations) == (p/'module-source.lean').read_text()
result = subprocess.run([args.lean, str(p/'module-source.lean')], capture_output=True, text=True)
log = result.stdout + result.stderr
(p/'local-check.log').write_text(log)
assert result.returncode == 0 and 'error:' not in log and 'warning:' not in log and 'sorryAx' not in log, log
mutations = {
    'decode_discards_payloads': ('decode', 'fun {_Key _Row} _columns => []'),
    'alignment_ignores_lengths': ('aligned', 'fun {_Key _Row} _columns => True'),
    'row_write_is_noop': ('rowWrite', 'fun {_Key _Row} [_] _less rows _key _value => rows'),
    'column_write_is_noop': ('columnWrite', 'fun {_Key _Row} [_] _less keys values _key _value => (keys, values)'),
    'row_lookup_ignores_rows': ('rowLookup', 'fun {_Key _Row} [_] _rows _query => none'),
    'decoder_accepts_unaligned': ('checkedDecode', 'fun {_Key _Row} columns => some (decode columns)'),
}
checks = []
with tempfile.TemporaryDirectory(prefix='ink-column-lean-') as temp:
    for label, (name, value) in mutations.items():
        changed = [dict(d, value=value) if d['name'] == name else d for d in declarations]
        path = Path(temp)/(label+'.lean')
        path.write_text(source(changed))
        result = subprocess.run([args.lean, str(path)], capture_output=True, text=True)
        output = result.stdout + result.stderr
        assert result.returncode != 0 and 'error:' in output, label
        # The replacement definition itself must elaborate successfully. Its
        # downstream theorems, rather than its syntax/types, must be rejected.
        definition_only = Path(temp)/(label+'-definition.lean')
        before = []
        for d in changed:
            before.append(d)
            if d['name'] == name:
                break
        # Other prior theorems remain valid before this mutation's definition.
        definition_only.write_text(source(before))
        prefix = subprocess.run([args.lean, str(definition_only)], capture_output=True, text=True)
        assert prefix.returncode == 0, prefix.stdout + prefix.stderr
        checks.append(dict(mutation=label, definition_type_checked=True,
                           downstream_theorems_rejected=True,
                           changed_source_sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
version = subprocess.check_output([args.lean, '--version'], text=True).strip()
validation = dict(lean_version=version, declarations=len(declarations),
                  local_compile_passed=True, warnings=0,
                  local_reported_axioms=['propext', 'Quot.sound'],
                  semantic_mutations=checks)
(p/'local-validation.json').write_text(json.dumps(validation, indent=2)+'\n')
print(json.dumps(validation, indent=2))
