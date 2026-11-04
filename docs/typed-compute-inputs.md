# Typed F32 input transport

The shared browser ABI can snapshot an ordinary Float32Array of at least 64 elements into exact owned
transport words without building an intermediate Number array. It requires a
deeply frozen flat List<F32> descriptor and the ordinary same-realm typed-array
prototype/iterator/length behavior. Modified traversal, subclasses, mutable
metadata and other packed carriers retain the existing checked path.

The implementation copies before scanning the owned words for nonfinite
exponents. Numeric NaN and infinity remain errors; explicit F32Bits tags keep
their existing checked traversal and raw payload semantics. Signed zero,
subnormals and finite bits survive unchanged. Intrinsic typed set rejects
detached/out-of-bounds views. The byte budget is checked before allocation,
and caller mutation after submission cannot change the private snapshot.

For transport-preferred captures of at least 128 F32 elements, the same snapshot supplies
CPU/GPU transport immediately. Its JavaScript representation is lazily copied
into an ordinary owned Array when requested. The lazy getter never rereads the
caller. Ordinary native capture remains unchanged. Runtime requests transport
preference only for a preparation with a known CPU/GPU consumer; a JavaScript
override can still decode that same snapshot. Tiny captures retain the eager
Array representation. Public
result detachment, fresh primals and the requirement to prepare again for changed
model inputs remain unchanged. No value/validation result is cached by input
identity; only immutable descriptor eligibility/copy functions are retained.

These are literal ABI representations, not arithmetic/source rewrites, backend
selection rules or new profitable-selection authority. The existing aggregate
runtime_host_sha256 already includes the ABI source, so emitted whole-call price
scopes change with this codec. Historical prices cannot silently select the new
implementation. The external controlled experiment supplies matching aggregate
fingerprints for both codec versions and installs no cost profile.

The external ink-static-embeddings experiment separates codec conversion,
capture/native materialization, ordinary calls, prepared calls, resident changed
inputs, initial preparation and ready-session opens. All GPU modes use identical
generated shaders. A new-host/old-codec control separates the preparation
preference from the new codec, with matching identities for all three versions.
Complete outputs, unchanged transfer/dispatch counts and held-out mixed-record
workloads are controls. Setup/phase medians are never added to warm-call medians.
Actual public-loader checks cover all five retained models/fixtures. See the
retained experiment receipts for measured gains and regressions.
