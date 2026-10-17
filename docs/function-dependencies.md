# Function dependencies and device declarations

Core's `analysis::function_dependencies` reports the executable function names
and named types reachable from a checked, elaborated function. It follows direct
calls, signatures, local type annotations, record constructors, enum constants
and complete transitive record fields. Parameters and local/callback bindings
shadow enum names. Let initializers run in the outer scope. Traversal is iterative;
call and carrier cycles terminate, and work exhaustion returns an error instead
of a partial result. The two current consumers allocate 100,000 work steps.
The report grants no source admission, effects, equality or profitability fact.

The packed GPU lowering uses this report to emit each function's required WGSL
record declarations. An unrelated binary64 or owned library record no longer
blocks an otherwise eligible F32 kernel. Every field of a reachable record stays
present; strict helper arguments, constructors, preconditions and unsupported
binary64 computation retain their existing execution or CPU fallback. The
original complete checked module still determines the bundle identity and CPU ABI.
Runtime's existing mixed-module closure assembly uses the same lexical report,
then rechecks its extracted closure. Host state, contracts and recursive-measure
boundaries retain their existing rules.

The resident learner example also contains ordinary binary64 forward-AD helpers
and an unrelated owned carrier. The old compiler rejects device emission for all
four F32 training functions in that exact module; the per-function declarations
allow the resident history while the binary64 companion stays on CPU. Validation
compares ten complete reads on native CPU/wgpu and browser Wasm/WebGPU, all 244
initial gradient coordinates, zero iteration transfers, exact binary64 CPU and
JavaScript results, and explicit rejection of required binary64 GPU work. A
stateful reverse-AD fixture additionally uses a parameter that shadows an
unrelated global record name and requires an actual eligible GPU call alongside
complete CPU/JavaScript/Wasm values and checkpoints.

This is literal execution capability, with no speed or whole-compiler-correctness
claim. It does not add binary64 GPU arithmetic, owned reverse tapes on device,
prepared-graph execution or automatic profitable placement. See
[resident source training](resident-source-training.md).
