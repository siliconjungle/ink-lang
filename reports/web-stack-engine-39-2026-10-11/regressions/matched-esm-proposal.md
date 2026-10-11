# Matched ESM follow-up proposal

Use six variants for each left/right composed high4096/high65536 fixture: archived prior and checked modules, byte-identical ESM clones of each, prior clone with only its primary concat allocation/copy loops removed, and checked clone with only four neutral additions removed. Keep __fn0, all module exports/helpers/destination code and ESM strictness. The original-versus-no-op pairs test the remaining module URL/import-order context.

All six variants share input capture (both lists copied), fresh owned output and full-word timed checksum. Three fresh uninstrumented processes, nine paired rounds and fixed seeds give648 samples. Every frame/process/pair remains visible. No extra timings are authorized yet.

Four separate instrumented representative profiles can print final optimized __fn0 machine code and exact tier/deoptimization/inlining evidence without a large compiler IR dump. Those times remain excluded. Untimed allocation-counting copies can verify primary constructors: prior4, no-padding3, checked1, no-pluszero1; the two input capture copies are additional common work. Counting copies alter code and never supply speed measurements.

The current profiles disfavor the more-deoptimization hypothesis. Scalar helpers are already inline in emitted source. Even a successful matched source intervention would establish an effect of staging/fusion under this workload, not automatically prove one instruction or a universal JIT rule. Preserve “exact cause unknown” if the controls do not isolate it.
