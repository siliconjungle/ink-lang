#!/usr/bin/env python3
"""Index a captured public Hunchroom corpus; no credentials or network writes."""
import argparse
import collections
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://hunchroom.com'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def family(ids, title):
    # Use the direct pinned module, not every transitive dependency. These are
    # research triage categories, not claims of proved compiler applicability.
    ids = set(ids)
    groups = [
        ('runtime replacement and future equivalence', 'high', {109, 110, 111, 112, 113, 115}),
        ('representation planning and measured operation cost', 'high', {35, 106, 107, 114}),
        ('table, cache and transaction refinement', 'high', {39, 40, 46}),
        ('source, effect and certificate correspondence', 'high', {16, 17, 42, 48, 59, 66, 68, 77, 86, 87}),
        ('bounded arithmetic representation', 'high', {19, 28}),
        ('checked patches, codecs and compression', 'medium', {1, 2, 12, 29, 30, 32, 33, 36, 37, 55, 58, 62, 63, 69, 72, 74, 76, 80, 81, 85, 88, 90, 92, 95, 96, 97, 102, 103, 104}),
        ('replica state admission and identity retention', 'medium', {18, 34, 82, 83, 89, 91, 94, 101, 105}),
    ]
    for name, priority, candidates in groups:
        if ids & candidates:
            return name, priority
    if ids:
        return 'replicated editing, historical identity and reclamation', 'lower'
    if re.search(r'Goldbach|prime|conjecture|divisib|residue|number theory', title, re.I):
        return 'number theory', 'lower'
    if re.search(r'CRDT|Yjs|Fugue|anchor|causal|rich.text|actor|tombstone|formatting', title, re.I):
        return 'replicated editing, historical identity and reclamation', 'lower'
    if re.search(r'patch|chunk|codec|compress|run.length|replay', title, re.I):
        return 'checked patches, codecs and compression', 'medium'
    return 'foundational or unpinned model', 'medium'


def pin_ids(problem):
    return [p['id'] for p in problem.get('module_pins', [])]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=ROOT/'reports/hunchroom-review-20261010')
    args = parser.parse_args()
    snapshot, out = args.snapshot.resolve(), args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    catalog = json.loads((snapshot/'catalog.json').read_text())
    problems = {p['id']: json.loads((snapshot/f'problems/{p["id"]}.json').read_text())['problem'] for p in catalog['problems']}
    modules = {d['module']['id']: d['module'] for d in catalog['module_details']}
    sources = {s['id']: s for s in catalog['source_records']}
    entries = []
    for s in sorted(catalog['submissions'], key=lambda s: s['id']):
        problem = problems[s['problem_id']]
        path = snapshot/f'sources/{s["id"]}.txt'
        source = path.read_text()
        assert sha(path) == sources[s['id']]['sha256']
        assert path.stat().st_size == sources[s['id']]['bytes']
        if s.get('proof_hash'):
            assert sha(path) == s['proof_hash'], s['id']
        scope = problem.get('scope') or {}
        text = json.dumps(scope, ensure_ascii=False)
        pins = problem.get('module_pins', [])
        for pin in pins:
            assert modules[pin['id']]['module_hash'] == pin['hash'], pin
        name, priority = family(pin_ids(problem), problem['title'])
        flags = []
        if s.get('statement_hash') != problem.get('statement_hash'): flags.append('statement_identity_changed')
        if s['status'] != 'verified': flags.append('not_primary_verified')
        if s.get('secondary_status') != 'passed': flags.append('not_secondary_passed')
        if re.search(r'\bsorry\b|\badmit\b', source): flags.append('placeholder_token_in_source')
        if re.search(r'^\s*axiom\s', source, re.M): flags.append('explicit_axiom_declaration_in_source')
        if 'native' in text.lower() or 'compiled' in text.lower(): flags.append('read_declared_native_correspondence_limit')
        if re.search(r'resource|allocat|memory|CPU|timing', text, re.I): flags.append('read_declared_cost_or_resource_limit')
        if re.search(r'counterexample|witness|unsafe|fails|stale|break|insufficient', problem['title'], re.I): flags.append('negative_or_concrete_example_title')
        entries.append(dict(
            submission_id=s['id'], problem_id=problem['id'], title=s['title'], problem_title=problem['title'],
            family=name, ink_priority=priority, status=s['status'], secondary_status=s.get('secondary_status'),
            url=f'{BASE}/p/{problem["id"]}', source_url=f'{BASE}/api/v1/submissions/{s["id"]}/source',
            statement_hash=problem.get('statement_hash'), submission_statement_hash=s.get('statement_hash'),
            source_sha256=sha(path), source_bytes=path.stat().st_size, module_pins=pins,
            reported_axioms=s.get('axioms'), declared_correspondence=scope.get('correspondence'),
            declared_cost_metric=scope.get('cost_metric'), declared_limitations_count=len(scope.get('limitations', [])),
            explicit_universal_quantifier_in_statement='∀' in problem.get('statement', ''),
            review_flags=flags,
            review_scope='Statement, scope, pins, reported checks and canonical source structure triage. Detailed semantic reading only for the selected families listed in REVIEW.md. Not independent recompilation or a line-by-line proof audit.'
        ))
    module_rows = []
    for m in sorted(modules.values(), key=lambda m: m['id']):
        name, priority = family([m['id']], m['title'])
        module_rows.append(dict(id=m['id'], title=m['title'], namespace=m['namespace'], family=name,
                                ink_priority=priority, status=m['status'], secondary_status=m.get('secondary_status'),
                                module_hash=m['module_hash'], module_pins=m.get('module_pins', []),
                                declarations=[dict(kind=d['kind'], name=d['name']) for d in m['declarations']],
                                url=f'{BASE}/modules/{m["id"]}'))
    receipts = catalog['receipts']
    for receipt in receipts:
        assert receipt['status'] == 200
        path = snapshot/receipt['path']
        assert sha(path) == receipt['sha256'] and path.stat().st_size == receipt['bytes']
    coverage = dict(
        started_utc=catalog['started_utc'], completed_utc=catalog['completed_utc'], problem_cutoff=catalog['problem_cutoff'],
        public_problems=len(problems), submissions=len(entries), modules=len(module_rows), canonical_sources=len(entries),
        canonical_source_bytes=sum(e['source_bytes'] for e in entries), public_get_receipts=len(receipts),
        catalog_sha256=sha(snapshot/'catalog.json'),
        submissions_by_status=dict(collections.Counter(e['status'] for e in entries)),
        submissions_by_secondary_status=dict(collections.Counter(e['secondary_status'] for e in entries)),
        modules_by_status=dict(collections.Counter(e['status'] for e in module_rows)),
        modules_by_secondary_status=dict(collections.Counter(e['secondary_status'] for e in module_rows)),
        submissions_by_family=dict(collections.Counter(e['family'] for e in entries)),
        submissions_by_ink_priority=dict(collections.Counter(e['ink_priority'] for e in entries)),
        problems_without_visible_submission=sorted(set(problems)-{e['problem_id'] for e in entries}),
        non_verified_submission_ids=[e['submission_id'] for e in entries if e['status'] != 'verified'],
        statement_identity_mismatches=[e['submission_id'] for e in entries if 'statement_identity_changed' in e['review_flags']],
        source_structure_flags={flag:[e['submission_id'] for e in entries if flag in e['review_flags']]
                                for flag in ['placeholder_token_in_source', 'explicit_axiom_declaration_in_source']},
        scope='Complete public catalog at cutoff 443. Hidden/private entries and subsequent arrivals excluded. Reported verification statuses are site evidence, not an independent local kernel run. The entire corpus is indexed and triaged; selected models receive deeper semantic review.'
    )
    diagnostics = collections.Counter()
    for submission in catalog['submissions']:
        if submission.get('secondary_status') == 'error':
            try:
                details = json.loads(submission.get('secondary_details') or '{}')
                diagnostics[details.get('diagnostic', details.get('error', 'unspecified'))] += 1
            except (TypeError, ValueError):
                diagnostics['unparsed details'] += 1
    coverage['reported_secondary_error_diagnostics'] = dict(diagnostics)
    for name, data in [('coverage.json', coverage), ('submissions.json', entries), ('modules.json', module_rows), ('receipts.json', receipts)]:
        (out/name).write_text(json.dumps(data, indent=2, ensure_ascii=False)+'\n')
    lines = ['# Public submission review index', '',
             'Every public submission in the captured catalog is listed, including failed and partial attempts. Categories are research triage from direct pinned models, statements and scope; they do not establish that a proof authorises an Ink transformation. The detailed findings and review limits are in [REVIEW.md](REVIEW.md).', '',
             '| Submission | Problem | Family | Ink priority | Primary / secondary |',
             '| ---: | --- | --- | --- | --- |']
    for e in entries:
        title = e['problem_title'].replace('|', '\\|').replace('\n', ' ')
        lines.append(f'| [{e["submission_id"]}]({e["source_url"]}) | [{e["problem_id"]}: {title}]({e["url"]}) | {e["family"]} | {e["ink_priority"]} | {e["status"]} / {e["secondary_status"]} |')
    (out/'INDEX.md').write_text('\n'.join(lines)+'\n')
    print(json.dumps(coverage, indent=2))


if __name__ == '__main__':
    main()
