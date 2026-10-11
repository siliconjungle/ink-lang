# Web stack engine iteration39

1. Diagnose all20 archived composed-helper CPU regressions with static emission evidence and isolated profiling/reproduction. Preserve uncertainty and isolate instrumented runs from performance timing.
2. Infer and preserve conservative composition facts and use them in JS/C/Wasm memory lowering; no new language syntax or caller checks.
3. After diagnosis, add target component cost estimates calibrated from measured training workloads; heldout evaluation must be independent.
4. Broaden full-result benchmark families and independently vary dimensions; separate full and resident boundaries.
5. Trial profile-backed small adaptive selector and static policy at invocation/batch boundaries, measure full overhead, avoid continuous online probing.
6. Test, independently review, then scoped commit/push each changed package and distribution pin on main.

All measurements are observational; no profile or hash grants mathematical authority. Pure semantic equivalence remains checked by the existing kernel. Lowering/ABI correspondence remains a tested trusted implementation boundary.
