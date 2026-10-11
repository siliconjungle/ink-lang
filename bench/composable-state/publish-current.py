#!/usr/bin/env python3
"""Re-author and admit current composable choices; retain archived admissions."""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'knowledge'))
from producers.representations import generate
from producers.partition_representation import generate as partition
from producers.compose_representations import compose
from producers.source_grouped_laws import generate as grouped_laws
from producers.admit_representations import publish
from producers.state_calculus import publish as publish_mathematics


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler', type=Path, required=True)
    args = parser.parse_args()
    compiler = args.compiler.resolve()
    output = ROOT / 'knowledge/research/composable-state-current'
    work = ROOT / 'build/composable-current-publication'
    work.mkdir(parents=True, exist_ok=True)
    candidates = []

    def run(*arguments):
        subprocess.run([str(compiler), *map(str, arguments)], cwd=ROOT, check=True,
                       capture_output=True)

    def model(source, name):
        path = work / (name + '-model.json')
        run('emit-action-model', source, '-o', path)
        return json.loads(path.read_text())

    def save(name, source, request):
        path = output / 'choices' / (name + '.json')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(request, separators=(',', ':')) + '\n')
        run('check-representation', source, path)
        candidates.append(('current/' + name, source, path))
        print(name, 'checked', flush=True)
        return request

    keep_source = ROOT / 'knowledge/research/keep-parity/app.ink'
    keep_model = model(keep_source, 'keep')
    keep = json.loads((output / 'keep/representation-1.json').read_text())
    indexed = save('point-index', keep_source, partition(keep_model, work / 'point-index'))
    save('keep-point', keep_source, keep)
    save('index-point-cache', keep_source,
         compose(keep_model, [indexed, keep], work / 'index-point-cache', {'get': 0, 'zero': 1}))

    source = ROOT / 'examples/field-sensitive-point.ink'
    fields = model(source, 'fields')
    save('field-point', source, generate(fields, work / 'fields', cache_query='zero_field',
                                        preserve_cache=True, delta_query=True)['requests'][1])

    source = ROOT / 'examples/composable-filtered-state.ink'
    aggregate = model(source, 'aggregate')
    indexed = partition(aggregate, work / 'aggregate-index')
    total = generate(aggregate, work / 'aggregate-total', cache_query='total_query',
                     preserve_cache=True, aggregate_query=True)['requests']
    count = generate(aggregate, work / 'aggregate-count', cache_query='count_query',
                     preserve_cache=True, aggregate_query=True)['requests'][1]
    save('aggregate-direct', source, total[0])
    save('aggregate-total', source, total[1])
    save('aggregate-count', source, count)
    first = compose(aggregate, [indexed, total[1]], work / 'index-total-cache',
                    {'get': 0, 'total_query': 1, 'count_query': 0})
    save('index-total-cache', source, first)
    save('index-two-aggregates', source,
         compose(aggregate, [first, count], work / 'index-two-aggregates',
                 {'get': 0, 'total_query': 0, 'count_query': 1}))

    fixtures = json.loads((output / 'fixtures-admission.json').read_text())['fixtures']
    sources = {'point-delta': ROOT / 'examples/point-query-delta.ink',
               'source-representations': ROOT / 'knowledge/research/source-representations/app.ink',
               'filtered-aggregate': ROOT / 'examples/filtered-aggregate.ink',
               'compact-queries': ROOT / 'examples/representation-cache-maintenance.ink'}
    for fixture in fixtures:
        folder = fixture['name'].split('/')[0]
        if folder in sources:
            candidates.append(('current/' + fixture['name'].removesuffix('.json'),
                               sources[folder], output / fixture['name']))
    assert len(candidates) == 20

    source = ROOT / 'examples/grouped-state.ink'
    grouped = grouped_laws(model(source, 'grouped'), work / 'grouped')
    view = work / 'source-group.json'
    view.write_text(json.dumps(grouped, separators=(',', ':')) + '\n')
    core = work / 'source-group-core.json'
    run('emit-core', source, '-o', core)
    publish_mathematics(ROOT / 'knowledge', compiler, output / 'mathematics-admission.json')
    receipt = publish(ROOT / 'knowledge', compiler, candidates,
                      output / 'representations-admission.json', [('current/source-group', core, view)])
    print(json.dumps({'status': receipt['status'], 'candidates': len(receipt['candidates'])}))


if __name__ == '__main__':
    main()
