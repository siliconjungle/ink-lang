#!/usr/bin/env python3
"""Validate pinned source-read receipts and render the complete review backlog.

A source read is not an applicability assessment, implementation, or speedup.
This report never promotes a family or marks an optimization complete.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def report(source, inventory, audit):
    if inventory['revision'] != audit['upstream_revision']:
        raise ValueError('audit/inventory revision mismatch')
    files = {row['path']: row for row in inventory['files']}
    if len(files) != len(inventory['files']):
        raise ValueError('duplicate inventory paths')
    reads = {}
    for row in audit['reads']:
        path = row['path']
        if path not in files or path in reads:
            raise ValueError('unknown/duplicate source-read path: ' + path)
        if row['sha256'] != files[path]['sha256']:
            raise ValueError('source-read hash differs from inventory: ' + path)
        reads[path] = row
    rows = []
    for path, expected in sorted(files.items()):
        relative = Path(path)
        if relative.is_absolute() or '..' in relative.parts:
            raise ValueError('unsafe source path')
        data = (source / relative).read_bytes()
        if len(data) != expected['bytes'] or hashlib.sha256(data).hexdigest() != expected['sha256']:
            raise ValueError('cached source differs from inventory: ' + path)
        lines = len(data.splitlines())
        intervals = reads.get(path, {}).get('inclusive_lines', [])
        covered = set()
        last = 0
        for interval in intervals:
            if (len(interval) != 2 or any(type(n) is not int for n in interval)
                    or not 1 <= interval[0] <= interval[1] <= lines or interval[0] <= last):
                raise ValueError('invalid/overlapping read interval: ' + path)
            covered.update(range(interval[0], interval[1] + 1))
            last = interval[1]
        status = 'read' if len(covered) == lines else 'partial' if covered else 'unread'
        # Directory groups are navigation aids, not semantic classifications.
        parts = relative.parts
        group = '/'.join(parts[:3]) if path.startswith('src/compiler/') and len(parts) > 3 else '/'.join(parts[:2])
        rows.append(dict(path=path, group=group, lines=lines, read_lines=len(covered),
                         status=status, read_receipt=reads.get(path)))
    for family in audit['families']:
        if family['entry_point'] not in files:
            raise ValueError('family entry point outside inventory: ' + family['name'])
    return dict(revision=inventory['revision'], files=len(rows),
                source_read_status=dict(Counter(r['status'] for r in rows)),
                total_lines=sum(r['lines'] for r in rows),
                recorded_read_lines=sum(r['read_lines'] for r in rows),
                family_status=dict(Counter(f['status'] for f in audit['families'])), rows=rows)


def markdown(result, audit):
    counts = result['source_read_status']
    text = ['# V8 optimizer review coverage', '',
            'Pinned revision: `' + result['revision'] + '`.', '',
            f"Source receipts: {counts.get('read', 0)} full files, {counts.get('partial', 0)} partial files, "
            f"{counts.get('unread', 0)} unread files; {result['files']} inventoried files total.", '',
            'A checked box means every source line has a recorded read receipt. It does **not** mean every optimization '
            'has been assessed or implemented. All family outcomes below remain separately recorded in `audit.json`. '
            'Directory groups are navigation only. This inventory does not establish that every optimizer-related '
            'support file outside the selected directories has been captured.', '', '## Family assessment', '']
    text += [f"- {f['name']}: **{f['status']}** — {f['note']}" for f in audit['families']]
    text += ['', '## Complete source checklist', '']
    group = None
    for row in result['rows']:
        if row['group'] != group:
            group = row['group']
            text += ['', '### ' + group, '']
        text.append(f"- [{'x' if row['status'] == 'read' else ' '}] `{row['path']}` — "
                    f"{row['status']}; {row['read_lines']}/{row['lines']} lines recorded")
    return '\n'.join(text) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT/'build/v8-source')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    inventory = json.loads((ROOT/'bench/v8-learning/upstream-inventory.json').read_bytes())
    audit = json.loads((ROOT/'bench/v8-learning/audit.json').read_bytes())
    result = report(args.source, inventory, audit)
    if args.output:
        args.output.write_text(markdown(result, audit))
    print(json.dumps({k: v for k, v in result.items() if k != 'rows'}, indent=2))


if __name__ == '__main__':
    main()
