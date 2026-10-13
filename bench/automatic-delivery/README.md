# Automatic optimisation delivery

This replication corpus measures what ordinary balanced compilation emits.
It has eight fresh partial typed kernels and two reusable E1 knowledge schemes
at three catalogue checkpoints. No forced plan or supplied evaluation workload
enters compilation. The compiler binary, backends, runtime and inputs stay fixed;
before/after machinery is reported separately from after-only database growth.

These are handwritten source kernels and synthetic data, not whole upstream
applications or an unbiased software population. Previous optimisation knowledge
informed the source choices. Six programs exercise common ordered transformations
and two serve as single-pass controls. The report retains every adverse case.

```sh
python bench/automatic-delivery/run.py freeze
python bench/automatic-delivery/run.py databases
python bench/automatic-delivery/run.py build --lane before --code /path/to/before
python bench/automatic-delivery/run.py build --lane after --code /path/to/after
python bench/automatic-delivery/run.py reference
node bench/automatic-delivery/bench.mjs time telemetry-total
node --expose-gc bench/automatic-delivery/bench.mjs memory telemetry-total after/complete
python bench/automatic-delivery/warm.py
```

Freeze once, before measurements; do not overwrite an epoch. Reproduction needs
the exact compiler and original knowledge snapshot in the protocol. Local
databases under `build/` use immutable canonical object links and separate
publication/index/cache files. The only changed catalogue objects are the six
genuine E1 templates (two reusable schemes), not specialised endpoints for these
evaluation programs. The planning machinery is hashed and must remain unchanged
within each lane. Compilation records process high-water RSS and total time;
receipts retain search, measurement and selection costs and candidate diagnostics.

Runtime samples use eleven randomised interleaved rounds, full output consumption,
independent reference results, a second handwritten oracle, and input immutability
checks. Report nonempty fixed-cohort geometric means, timing uncertainty,
per-program gains/losses and automatic selection coverage. Keep empty cells and
unchanged artifact timing noise visible outside the headline. Do not tune laws,
probe policy or planning using these outcomes; start a new epoch for further work.

The published report keeps complete compiled packets, receipts, generated modules
and process logs in verified artifact archives to keep the review diff readable.
Extract each archive into its report directory before using the benchmark or
report script. Archive manifests bind every member's bytes; no disposable index
or planning cache is archived. `validate-before` checks the baseline independently
while the after builds are pending.

`measured-machinery.part-*` retains the exact before/after Python/knowledge
source trees and measured macOS compiler, including pinned producer resources.
Reassemble the parts in filename order into `measured-machinery.tar.gz`, verify
its SHA-256 and member manifest in `archive-machinery.json`, then extract it.
This preserves the measured prototype independently of subsequent main changes.
The full compiler binary and inventories bind the experiment; source-to-binary
correspondence remains trusted. Final main integration is checked separately.
