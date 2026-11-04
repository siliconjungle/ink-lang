# Ordered pipeline fusion and read-only model data

Static embedding imports exposed two generic planning failures. Neither requires
a new arithmetic rule or an embedding-specific backend recognizer.

The existing polymorphic `pipeline-templates/foldl-map` equation preserves the
seed, item order and reducer expression, including each F32 rounding point.
Higher-pattern adapters can carry this equality through an explicit local
binding. When a callback calls a source helper with scalar/list-only signatures,
the adapter needs the helper's portable definition context just as a nominal
record callback does. Template generation now checks both named sorts and calls
to source functions, and captures only the reachable checked definitions.
Ordinary kernel proof replay remains mandatory. Rehashed false endpoints do not
gain authority from that context.

Structural search also charged a callback-value wrapper for a literal lambda
that is immediately consumed as an ordinary local binding. The corrected price
retains body and eager argument work, including unused arguments, but removes
that wrapper charge. Database prices still guide search only: they are not
measurements or proof premises. Existing target models and measurement gates
retain their contracts.

Rust already supports checked parameter-read capabilities and typed borrowing
entrypoints. A complete physical plan must be replayed with `ink compile --plan`;
the historical plain `build` path is not the physical-plan executor. Eligible
public plain-value functions expose `ink_borrowed_function_l_NAME` alongside the
existing owning `function_l_NAME`. Typed Rust callers can pass shared references
to stable weight vectors. Calls still evaluate fresh changing inputs and return
detached owned results; no output memoization or new ownership fact is inferred.
The caller retains weights, so cloning them at every public invocation is
unnecessary. Owned/recursive/ineligible parameters retain the checked fallback.

The regression suites cover scalar-helper adapters, exact left-fold grouping,
empty/repeated/out-of-range source inputs, false-law rejection, callback pricing,
eager unused arguments and the separation of ranking from proof authority.
The external `siliconjungle/neural-to-ink` experiment retains unchanged model
source, selection/physical packets, output checks and CPU-only before/after
measurements. Its NumPy comparisons include a different implementation/runtime;
only same-source, same-target comparisons isolate these changes. No GPU speedup,
weight decompilation or general neural-network interpretation follows.
