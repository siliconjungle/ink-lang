# Source reverse differentiation

The source translation has a fresh bounded owned tape, dynamic F32 parameter
lists, nested records, helper/context propagation, optional/result context, zip,
ordinary folds and both early-stop contracts. Public capacity and zero-cotangent
policies are explicit. A selected variant arm returning an owned carrier may consume affine captures;
plain observations and contract guards retain readonly captures;
loop/loan capture and reuse-after-move rejection remain checked.

The retained program is `examples/source-reverse-learning.ink`: 64 trainable
parameters, authored squared-error objective and SGD rule, transactional learning,
constraint rejection, event publication and exact restore. The source unit suite
also checks 100 coordinates, nonlinear derivatives against a separate real
arithmetic oracle, raw primal bits, lazy defaults, nonfinite policy, precondition
rejection and lexical/raw-core boundaries. There are 14 source AD tests and three
specific affine-variant tests. The earlier full private suite passed 433 tests;
its log precedes the four final test additions. The final exact committed
standalone package passed all 437 tests in a separate private checkout and
target; its receipt binds that tree and the complete log.

`native-conformance.log` compares all 35 observations, including 24 accepted
learning updates, two rejected updates, pure results, ordered events and exact
portable checkpoints. Three restore operations are in the 38-command history.
Offline replay reaches the identical final checkpoint. JavaScript, native Rust,
Rust/Wasm and the native GPU host agree. One separate eligible numeric call must
execute on the GPU; tapes use CPU fallback and unsupported required-GPU calls
must fail.

`browser-conformance.json` records 105 complete comparisons through JavaScript,
Rust/Wasm and WebGPU selection, nine restores, six rejected required-GPU requests
and one actual WebGPU dispatch. Browser fixtures replay the retained reference
history; they do not substitute sampled scalar checks for complete state.

`artifacts.json` hashes immutable evidence. Run `python3 audit.py` here or from
the repository root. Hashes bind bytes, not correctness. The transform, ownership
checker, literal emitters, ABI, runtime, toolchain and drivers remain trusted.
There is no new equality law or automatic profitable selection. F64 AD, proof
precondition transport, broader source domains, device training, frozen graph
specialization and Handwired/Pretext/Freerange matched performance remain open.


The separate terminal-step history adds 25 native/Wasm observations and 75 browser
comparisons, including raw primal equality for negative zero, infinity and NaN.
It checks exclusive/inclusive terminal gradients and another actual device call.
Source contract checks retain readonly captures; the final package includes that
regression rather than relaxing all one-shot callbacks indiscriminately.


The final dependency replay also passes the existing forward differentiation and
14 source-contract tests, including state invariants, approximation/refinement,
preconditions and rollback, with required CPU/Wasm/native-device checks. The
final CLI emission is byte-identical to checked-core.json. Every standalone graph
has one identical core revision, and the runtime tracked lockfile is refreshed.
Package revisions and actual standalone suite counts are in packages.json.
