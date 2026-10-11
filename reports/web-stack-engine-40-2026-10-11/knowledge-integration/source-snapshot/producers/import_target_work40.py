"""Prepare canonical physical observations/prices; never publish or grant admission.

Target-work entries are diagnostic definitions in separate semantics namespaces.
Exact decimal sample strings and original JSON model bytes preserve fractional ns;
Store's legacy observation metric also receives rounded integer decimal strings.
Publication and ordinary candidate checking remain the caller's separate actions.
"""
import argparse
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

B = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(B / 'planner'), str(B / 'knowledge')]
from ink_knowledge.store import Store, entry, identity, hash_id
from ink_planner.physical_features import PhysicalPrices, file_hash, read_json
from producers.web_cost40 import features, write


def bound_sources(label_path, labels):
    sources = labels.get('sources')
    if not isinstance(sources, list) or len(sources) > 256:
        raise ValueError('label provenance budget')
    for source in sources:
        if set(source) != {'path', 'sha256'}:
            raise ValueError('label provenance format')
        path = (Path(label_path).parent / source['path']).resolve()
        if file_hash(path) != source['sha256']:
            raise ValueError('label provenance drift')


def trace_entry(feature, samples, provenance):
    """Convert an already validated sidecar and exact sample cohort to DB data."""
    observation = feature['observation']
    roots = read_json(Path(feature['sidecar']).parent /
                      observation['bindings']['selection']['path'])['knowledge']['roots']
    if not isinstance(roots, list) or len(roots) > 1024:
        raise ValueError('selected closure roots')
    roots = sorted(set(hash_id(root) for root in roots))
    # Paths are diagnostic acquisition locations, not canonical authority.
    payload = dict(kind='ink-target-work-measurement-v1', cohort=observation['cohort'],
                   entry=observation['entry'], fixture_id=observation['fixture_id'],
                   components=observation['components'], known=observation['known'],
                   unknown=observation['unknown'],
                   bindings={k: v['sha256'] for k, v in observation['bindings'].items()},
                   timing_ns_decimal_strings=[repr(float(x)) for x in samples],
                   provenance=provenance, scope=observation['scope'],
                   authority='Diagnostic execution/timing evidence only; no correctness or application authority; offline acquisition excluded')
    diagnostic = entry('definition', 'ink-target-work-measurement-v1', payload, roots)
    cohort = observation['cohort']
    measured = dict(schema=1, program=observation['bindings']['selected_core']['sha256'],
                    entries=roots,
                    plan=identity(dict(physical_measurement=identity(diagnostic))),
                    target=dict(hardware=json.dumps(cohort['host'], sort_keys=True),
                                driver='Exact instrumented emitted-site diagnostic; no device driver inference',
                                toolchain=cohort['emitter_sha256'] + '; ' + cohort['entry_abi'],
                                backend=cohort['target'], bridge=cohort['boundary']),
                    workload=dict(shape=dict(entry=observation['entry'], fixture=observation['fixture_id'],
                                             fixture_sha256=observation['bindings']['fixture']['sha256']),
                                  distribution=dict(split=feature['split'], operation=feature['operation'],
                                                    size=feature['size'], physical_measurement=identity(diagnostic)),
                                  concurrency=1, residency=cohort['boundary']),
                    metrics=dict(complete_call_ns=[str(round(x)) for x in samples], peak_bytes=None))
    Store.validate_observation(measured)
    return diagnostic, measured


def publication_context(path):
    data = read_json(path)
    if set(data) != {'schema', 'kind', 'status', 'scope', 'bindings'} or type(data['schema']) is not int or data['schema'] != 1 or data['kind'] != 'ink-target-work-publication-context-v1':
        raise ValueError('physical publication context format')
    if any(not isinstance(data[k], str) or not 1 <= len(data[k]) <= 16384 for k in ('status', 'scope')):
        raise ValueError('physical publication context scope')
    bound_sources(path, {'sources': data['bindings']})
    return entry('definition', 'ink-target-work-publication-context-v1',
                 dict(context=data, context_sha256=file_hash(path),
                      authority='Bound provenance and limitations only; no admission authority'))


def collect(features_path, labels_paths, frozen=None, context_path=None):
    indexed = features(features_path)
    # features() resolves and authenticates every sidecar before data conversion.
    for feature in indexed.values():
        feature['sidecar'] = str((Path(features_path).parent / feature['sidecar']).resolve())
    records = defaultdict(dict)
    provenance = defaultdict(list)
    frozen_path = Path(frozen) if frozen else None
    for label_path in labels_paths:
        labels = read_json(label_path)
        if labels.get('kind') not in ('ink-target-work-training-v1', 'ink-target-work-heldout-v1'):
            raise ValueError('audited split label input required')
        bound_sources(label_path, labels)
        heldout = labels['kind'] == 'ink-target-work-heldout-v1'
        if heldout and (frozen_path is None or labels.get('freeze_sha256') != file_hash(frozen_path / 'freeze.json')):
            raise ValueError('heldout prediction freeze binding')
        for row in labels['rows']:
            if set(row) != {'feature_id', 'round', 'ns_per_call'} or row['feature_id'] not in indexed:
                raise ValueError('measurement label row')
            feature = indexed[row['feature_id']]
            if (feature['split'] == 'train') == heldout:
                raise ValueError('label split mismatch')
            if type(row['round']) is not int or not 0 <= row['round'] < 5:
                raise ValueError('paired round format')
            value = row['ns_per_call']
            if type(value) not in (int, float) or not math.isfinite(value) or value <= 0:
                raise ValueError('finite positive sample')
            if row['round'] in records[row['feature_id']]:
                raise ValueError('duplicate physical sample round')
            records[row['feature_id']][row['round']] = value
            provenance[row['feature_id']].append(file_hash(label_path))
    objects, observations, names = [], [], {}
    context = publication_context(context_path) if context_path else None
    if context is not None:
        objects.append(context); names['physical-work40/publication-context'] = identity(context)
    for id, rounds in sorted(records.items()):
        if set(rounds) != set(range(5)):
            raise ValueError('all five physical sample rounds required')
        diagnostic, measured = trace_entry(indexed[id], [rounds[n] for n in range(5)],
                                           dict(features_sha256=file_hash(features_path),
                                                sidecar_sha256=indexed[id]['sidecar_sha256'],
                                                labels_sha256=sorted(set(provenance[id]))))
        if context is not None:
            diagnostic['dependencies'] = sorted(set(diagnostic['dependencies'] + [identity(context)]))
            diagnostic['payload']['publication_context'] = identity(context)
            diagnostic['payload']['publication_context_sha256'] = context['payload']['context_sha256']
            diagnostic['payload']['publication_context_contents'] = context['payload']['context']
            measured['plan'] = identity(dict(physical_measurement=identity(diagnostic)))
            measured['workload']['distribution']['physical_measurement'] = identity(diagnostic)
            measured['workload']['distribution']['evidence_status'] = context['payload']['context']['status']
            measured['workload']['distribution']['publication_context'] = identity(context)
        objects.append(diagnostic); observations.append(measured)
        names['physical-work40/' + id] = identity(diagnostic)
    if frozen_path is not None:
        receipt = read_json(frozen_path / 'freeze.json')
        if receipt.get('status') != 'frozen_before_heldout_evaluation':
            raise ValueError('frozen price evidence required')
        for name in ('fits', 'predictions'):
            if file_hash(frozen_path / (name + '.json')) != receipt[name + '_sha256']:
                raise ValueError('frozen price diagnostics drift')
        for name, digest in sorted(receipt['models'].items()):
            path = frozen_path / name
            if file_hash(path) != digest:
                raise ValueError('frozen model bytes drift')
            model_json = path.read_text(); model = json.loads(model_json); PhysicalPrices(model)
            # Exact JSON text avoids introducing canonical floating-number fields.
            price = entry('definition', 'ink-target-work-prices-v1',
                          dict(kind='ink-target-work-prices-v1', model_json=model_json,
                               model_sha256=digest, freeze_sha256=file_hash(frozen_path / 'freeze.json'),
                               cohort=model['cohort'],
                               authority='Untrusted opt-in offline target prices; not theorem, application condition or default policy'))
            if context is not None:
                price['dependencies'] = [identity(context)]
                price['payload']['publication_context'] = identity(context)
                price['payload']['publication_context_sha256'] = context['payload']['context_sha256']
                price['payload']['publication_context_contents'] = context['payload']['context']
            objects.append(price); names['physical-prices40/' + Path(name).stem] = identity(price)
    return objects, observations, names


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--features', type=Path, required=True)
    p.add_argument('--labels', type=Path, nargs='+', required=True)
    p.add_argument('--frozen', type=Path)
    p.add_argument('--publication-context', '--context', type=Path)
    p.add_argument('--output', type=Path, required=True)
    a = p.parse_args()
    if a.output.exists():
        raise ValueError('preserve physical publication preparation')
    objects, observations, names = collect(a.features, a.labels, a.frozen, a.publication_context)
    write(a.output / 'entries.json', objects); write(a.output / 'observations.json', observations)
    write(a.output / 'names.json', names)
    receipt = dict(status='prepared_no_publication', entries=len(objects), observations=len(observations),
                   producer_sha256=file_hash(__file__),
                   artifacts={n:file_hash(a.output/n) for n in ('entries.json','observations.json','names.json')},
                   scope='Separate diagnostic definitions, measured observations and untrusted prices. No canonical write, candidate admission or default model change.')
    write(a.output / 'receipt.json', receipt); print(json.dumps(receipt))


if __name__ == '__main__':
    main()
