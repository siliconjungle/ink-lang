#!/usr/bin/env python3
"""Summarize every retained timing group without filtering samples or outliers."""
import hashlib,json,math,statistics,tarfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent
summary={'schema':1,'groups':{},'artifacts':{},'scope':'All retained raw measurements, with no outlier removal. Per-pair ratios divide the two process medians; latency columns are separate medians of those per-process medians. Artifact bytes are uncompressed file inventories, not runtime memory.'}
for directory in sorted((ROOT/'measurements').iterdir()):
 rows=[json.loads(p.read_bytes())for p in sorted(directory.glob('pair-*.json'))]
 assert len(rows)==6
 group={'pairs':6,'node_versions':sorted({r['node']for r in rows}),'phases':{},
  'scope':sorted({r['scope']for r in rows})}
 for phase in rows[0]['results']['baseline']['phases']:
  baseline=[r['results']['baseline']['phases'][phase]['medianNs']for r in rows]
  selected=[r['results']['selected']['phases'][phase]['medianNs']for r in rows]
  ratios=[a/b for a,b in zip(baseline,selected)]
  group['phases'][phase]=dict(baseline_median_ns=statistics.median(baseline),selected_median_ns=statistics.median(selected),
   geometric_paired_speedup=math.exp(statistics.mean(math.log(x)for x in ratios)),
   median_paired_speedup=statistics.median(ratios),paired_speedup_range=[min(ratios),max(ratios)],
   per_pair_speedups=ratios,baseline_process_medians=baseline,selected_process_medians=selected)
 summary['groups'][directory.name]=group
for label in ['baseline','previous','selected']:
 archive=ROOT/(label+'-artifact.tar.gz')
 with tarfile.open(archive)as tar:
  manifest=json.load(tar.extractfile('artifact/artifact.json'))
  summary['artifacts'][label]=dict(archive_sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),
   artifact_inventory_bytes=sum(f['bytes']for f in manifest['files'].values()),
   source_bytes=manifest['files']['program.mjs.source.mjs']['bytes'],
   descriptor_bytes=manifest['files']['program.mjs.plan.json']['bytes'],
   proof_bytes=manifest['files'].get('selection.json',{}).get('bytes',0),
   source=manifest['source_core_sha256'],selected=manifest.get('selected_core_sha256',manifest['compiled_core_sha256']))
print(json.dumps(summary,indent=2))
