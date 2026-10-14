#!/usr/bin/env python3
"""Exact, pinned, file-by-file audit coverage. Inventory is never review.

All tracked blobs, including tests, data, docs, symlinks and sparse files, enter
the denominator. Gitlinks are recursively inventoried at their pinned revision.
Read ranges and review notes are separate. Updating a snapshot invalidates
coverage for changed content; it never silently removes the previous inventory.
"""
import argparse
from contextlib import closing
import hashlib
import html
import json
import os
import sqlite3
import subprocess
import tempfile
from pathlib import Path


def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args])


def connect(path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.executescript('''
      CREATE TABLE IF NOT EXISTS repos (
        name TEXT PRIMARY KEY, root TEXT NOT NULL, revision TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS files (
        repo TEXT NOT NULL, path TEXT NOT NULL, blob TEXT NOT NULL,
        mode TEXT NOT NULL, bytes INTEGER, sha256 TEXT,
        reviewed INTEGER NOT NULL DEFAULT 0, notes TEXT, evidence TEXT,
        PRIMARY KEY(repo,path));
      CREATE TABLE IF NOT EXISTS reads (
        repo TEXT, path TEXT, blob TEXT, start INTEGER, stop INTEGER,
        PRIMARY KEY(repo,path,blob,start,stop));
      CREATE TABLE IF NOT EXISTS validations (
        repo TEXT, path TEXT, blob TEXT, evidence TEXT, sha256 TEXT,
        PRIMARY KEY(repo,path,blob,evidence));
    ''')
    return db


def inventory(db, name, root, revision='HEAD'):
    root = Path(root).resolve()
    revision = git(root, 'rev-parse', revision + '^{commit}').decode().strip()
    previous = db.execute('SELECT * FROM repos WHERE name=?', (name,)).fetchone()
    if previous and (previous['revision'] != revision or previous['root'] != str(root)):
        raise ValueError('Snapshot is immutable; use a new audit database for a new revision')
    db.execute('INSERT OR IGNORE INTO repos VALUES (?,?,?)', (name, str(root), revision))
    records = git(root, 'ls-tree', '-r', '-z', revision).split(b'\0')
    for record in records:
        if not record:
            continue
        header, path = record.split(b'\t', 1)
        mode, kind, blob = header.decode().split()
        path = path.decode('utf-8', errors='strict')
        if kind == 'commit':
            # A missing submodule is an error, never an exclusion from coverage.
            inventory(db, name + '/' + path, root / path, blob)
        elif kind == 'blob':
            db.execute('INSERT OR IGNORE INTO files(repo,path,blob,mode) VALUES (?,?,?,?)',
                       (name, path, blob, mode))
        else:
            raise ValueError('Unknown tracked object kind: ' + kind)
    db.commit()


def file_row(db, repo, path):
    row = db.execute('SELECT f.*,r.root FROM files f JOIN repos r ON r.name=f.repo '
                     'WHERE f.repo=? AND f.path=?', (repo, path)).fetchone()
    if row is None:
        raise ValueError('File is outside the pinned inventory')
    return row


def coverage(db, row):
    end = 0
    for a, b in db.execute('SELECT start,stop FROM reads WHERE repo=? AND path=? AND blob=? '
                          'ORDER BY start,stop', (row['repo'], row['path'], row['blob'])):
        if a > end:
            return False
        end = max(end, b)
    return row['bytes'] is not None and end >= row['bytes']


def show(db, repo, path, start=0, count=12000):
    if start < 0 or not 1 <= count <= 12000:
        raise ValueError('Read ranges require start >= 0 and 1..12000 bytes')
    row = file_row(db, repo, path)
    raw = git(row['root'], 'cat-file', 'blob', row['blob'])
    if start > len(raw):
        raise ValueError('Read starts after EOF')
    # Bytes are used for exact coverage. Escaping preserves binary/non-UTF8 data.
    stop = min(start + count, len(raw))
    text = raw[start:stop].decode('utf-8', errors='backslashreplace')
    print(json.dumps(dict(repo=repo, path=path, blob=row['blob'], start=start,
                          stop=stop, total_bytes=len(raw))))
    print(text)
    db.execute('UPDATE files SET bytes=?,sha256=? WHERE repo=? AND path=?',
               (len(raw), hashlib.sha256(raw).hexdigest(), repo, path))
    db.execute('INSERT OR IGNORE INTO reads VALUES (?,?,?,?,?)',
               (repo, path, row['blob'], start, stop))
    db.commit()


def review(db, repo, path, notes, evidence):
    row = file_row(db, repo, path)
    if not coverage(db, row):
        raise ValueError('Review requires complete recorded read coverage')
    if not notes.strip() or not evidence:
        raise ValueError('Review requires substantive notes and a saved evidence file')
    artifact = Path(evidence).resolve()
    raw = artifact.read_bytes()
    record = json.dumps(dict(path=str(artifact), sha256=hashlib.sha256(raw).hexdigest()))
    db.execute('UPDATE files SET reviewed=1,notes=?,evidence=? WHERE repo=? AND path=?',
               (notes, record, repo, path))
    db.commit()


def review_valid(db, row, artifacts):
    """A flag alone is not evidence: retain reads, notes and intact artifacts."""
    if not row['reviewed'] or not row['notes'] or not coverage(db, row):
        return False
    try:
        record = json.loads(row['evidence'])
        path = record['path']
        if path not in artifacts:
            try:
                artifacts[path] = hashlib.sha256(Path(path).read_bytes()).hexdigest()
            except OSError:
                artifacts[path] = None
        return artifacts[path] == record['sha256']
    except (TypeError, ValueError, KeyError):
        return False


def advance(db, destination, revisions):
    """Create a new inventory; carry review only for the same path, blob and mode.

    This is content-review provenance, not a claim that unchanged source has been
    revalidated against new dependencies. The previous database remains intact.
    """
    destination = Path(destination).resolve()
    if destination.exists():
        raise ValueError('New snapshot destination must not exist')
    repos = list(db.execute('SELECT * FROM repos ORDER BY name'))
    roots = [r for r in repos if not any(r['name'].startswith(s['name'] + '/')
                                       for s in repos if s['name'] != r['name'])]
    if set(revisions) - {r['name'] for r in roots}:
        raise ValueError('Revision overrides must name top-level repositories')
    destination.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=destination.name + '.', dir=destination.parent)
    os.close(fd)
    pending = Path(name)
    artifacts = {}
    carried = 0
    try:
        with closing(connect(pending)) as out:
            out.execute('CREATE TABLE provenance(repo TEXT, path TEXT, source_revision TEXT, '
                        'source_blob TEXT, source_mode TEXT, PRIMARY KEY(repo,path))')
            for r in roots:
                inventory(out, r['name'], r['root'], revisions.get(r['name'], r['revision']))
            # Only files with recorded reads can have useful progress to carry.
            for old in db.execute('SELECT f.*,r.revision FROM files f JOIN repos r '
                                  'ON r.name=f.repo WHERE f.bytes IS NOT NULL'):
                new = out.execute('SELECT blob,mode FROM files WHERE repo=? AND path=?',
                                  (old['repo'], old['path'])).fetchone()
                if new is None or (new['blob'], new['mode']) != (old['blob'], old['mode']):
                    continue
                valid = review_valid(db, old, artifacts)
                out.execute('UPDATE files SET bytes=?,sha256=?,reviewed=?,notes=?,evidence=? '
                            'WHERE repo=? AND path=?',
                            (old['bytes'], old['sha256'], int(valid),
                             old['notes'] if valid else None, old['evidence'] if valid else None,
                             old['repo'], old['path']))
                out.executemany('INSERT INTO reads VALUES (?,?,?,?,?)', db.execute(
                    'SELECT * FROM reads WHERE repo=? AND path=? AND blob=?',
                    (old['repo'], old['path'], old['blob'])))
                out.execute('INSERT INTO provenance VALUES (?,?,?,?,?)',
                            (old['repo'], old['path'], old['revision'], old['blob'], old['mode']))
                carried += int(valid)
            out.commit()
        # Never replace an existing audit, including one created concurrently.
        os.link(pending, destination)
        return dict(destination=str(destination), carried_reviews=carried)
    finally:
        pending.unlink(missing_ok=True)


def summary(db):
    rows = []
    artifacts = {}
    for repo in db.execute('SELECT * FROM repos ORDER BY name'):
        total, flagged = db.execute('SELECT count(*),coalesce(sum(reviewed),0) FROM files '
                                     'WHERE repo=?', (repo['name'],)).fetchone()
        reviewed = sum(review_valid(db, row, artifacts) for row in db.execute(
            'SELECT * FROM files WHERE repo=? AND reviewed=1', (repo['name'],)))
        rows.append(dict(repo=repo['name'], revision=repo['revision'], files=total,
                         reviewed=reviewed, invalid_reviews=flagged-reviewed,
                         percent=100 * reviewed / total if total else 100))
    total = sum(r['files'] for r in rows)
    reviewed = sum(r['reviewed'] for r in rows)
    return dict(schema=1, total_files=total, reviewed_files=reviewed,
                invalid_reviews=sum(r['invalid_reviews'] for r in rows),
                percent=100 * reviewed / total if total else 0,
                complete=bool(total) and reviewed == total, repositories=rows)


def report(db, destination):
    data = summary(db)
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    (destination / 'coverage.json').write_text(json.dumps(data, indent=2) + '\n')
    table = ''.join('<tr><td>' + html.escape(r['repo']) + '</td><td>' +
                    html.escape(r['revision'][:12]) + '</td><td>' + str(r['files']) +
                    '</td><td>' + str(r['reviewed']) + '</td><td>' +
                    f"{r['percent']:.6f}%</td></tr>" for r in data['repositories'])
    (destination / 'coverage.html').write_text('''<!doctype html><meta charset="utf-8">
      <title>LLVM and Ink file audit</title><style>body{font:16px system-ui;max-width:1100px;
      margin:40px auto;padding:0 20px;background:#fafafa;color:#18242c}td,th{padding:10px;
      text-align:left;border-bottom:1px solid #ddd}table{border-collapse:collapse;width:100%}</style>
      <h1>LLVM and Ink file audit</h1>''' +
      f"<p><strong>{data['reviewed_files']:,} / {data['total_files']:,} files reviewed "
      f"({data['percent']:.6f}%).</strong> The goal remains open until coverage is 100% "
      "and resulting implementation work is verified.</p><p>All tracked files in the pinned "
      "repositories are counted, including sparse files, tests, documentation, proof data and "
      "binary assets. Inventory and automated search do not count as review. Each review "
      "requires complete recorded reads, notes and a hashed evidence artifact. The SQLite "
      "database contains the individual file records. Snapshot advancement carries content "
      "reviews only at identical paths, blobs and file modes; this does not revalidate new "
      "dependency combinations. Missing or modified evidence does not count.</p>" +
      f"<p>Invalid review records: {data['invalid_reviews']}.</p><table><tr><th>Repository</th>" +
      "<th>Revision</th><th>Files</th><th>Reviewed</th><th>Coverage</th></tr>" + table + '</table>')
    return data


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--db', type=Path, required=True)
    sub = p.add_subparsers(dest='command', required=True)
    i = sub.add_parser('inventory'); i.add_argument('repo'); i.add_argument('root', type=Path)
    i.add_argument('--revision', default='HEAD')
    s = sub.add_parser('show'); s.add_argument('repo'); s.add_argument('path')
    s.add_argument('--start', type=int, default=0); s.add_argument('--bytes', type=int, default=12000)
    r = sub.add_parser('review'); r.add_argument('repo'); r.add_argument('path')
    r.add_argument('--notes', required=True); r.add_argument('--evidence', type=Path, required=True)
    out = sub.add_parser('report'); out.add_argument('destination', type=Path)
    a = sub.add_parser('advance'); a.add_argument('destination', type=Path)
    a.add_argument('--revision', action='append', default=[], metavar='REPO=REVISION')
    sub.add_parser('summary')
    a = p.parse_args()
    with connect(a.db) as db:
        if a.command == 'inventory': inventory(db, a.repo, a.root, a.revision)
        elif a.command == 'show': show(db, a.repo, a.path, a.start, a.bytes)
        elif a.command == 'review': review(db, a.repo, a.path, a.notes, a.evidence)
        elif a.command == 'report': print(json.dumps(report(db, a.destination)))
        elif a.command == 'advance':
            revisions = {}
            for spec in a.revision:
                name, sep, revision = spec.partition('=')
                if not sep or not revision or name in revisions:
                    raise ValueError('Use one REPO=REVISION per top-level repository')
                revisions[name] = revision
            print(json.dumps(advance(db, a.destination, revisions)))
        else: print(json.dumps(summary(db)))


if __name__ == '__main__':
    main()
