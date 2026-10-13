# JSON and portable compiled values

JSON is a source library in `ink-knowledge/libraries/json.ink`, using Ink's
ordinary recursive records, payload enums and immutable lists. It is not a new
compiler algorithm or untyped `any`. All five CPU targets execute the same source.
Dynamic JSON runs on the host; this adds no GPU JSON kernel capability.

```ink
module documents;
import "std:json" as json;
fn mark_received(document:json.Json)->Result<json.Json,json.JsonError> {
 return json.set(document,"received",json.boolean(true));
}
```

See `examples/json/main.ink` for a complete program with construction, lookup,
projection, storage, events and portable checkpoints. `std:json` embeds the distribution's pinned knowledge library; ordinary file imports remain relative to the source file. `ink build examples/json/main.ink --target javascript -o
json.mjs` emits a self-contained module and schema-bound binary entrypoints.

## Source meaning and JSON boundaries

`Json` has Null, Boolean, Number, Text, Array and Object variants. `Member` has a
String key and Json value. Lookup returns `Result<Option<Json>,JsonError>`:
missing is None, present null is Some(Json.Null), a non-object is an explicit
error. `set` prepends the replacement and removes old occurrences; unrelated
members retain their order and values. `remove` and `project` preserve relative
order. Arrays preserve order. Structural source equality observes member order
and numeric token spelling; it is not mathematical decimal equality.

Numbers are exact JSON tokens stored as String: `-0`, `1.2300e+1000` and arbitrary
integer digits survive without a floating conversion. Parsing rejects duplicate
object keys (including names equal after escape decoding), trailing data,
invalid numbers, malformed Unicode and resource exhaustion. Serialization keeps
number spelling and member order and emits deterministic escaped text; this is
not RFC 8785 canonicalization and does not preserve original whitespace/escapes.
Library constructors are ordinary functions; a manually built Number("01") or
object with duplicate members can be an Ink value but cannot cross the checked
JSON boundary. Serialization is therefore fallible.

`ink-abi::json_value::JsonCodec` adapts a checked library schema to/from JSON text.
JavaScript exports `JsonCodec`, `parseJson` and `stringifyJson`. A codec verifies
the six-variant shape; a type name or package pin alone never establishes it.

`TypedJsonCodec` in Rust (`ink-abi::typed_json`) and JavaScript converts standard
JSON into any supported declared value descriptor: words, Int, f32, Bool, Unit,
String, IDs, enums, lists, vectors, records, Option and Result. Record conversion
rejects unknown, missing and duplicate fields. Int and words use exact decimal
conversion, including integral exponent/fraction forms, with range/magnitude
checks. Option and Result use explicit `{Some:...}`, `{None:null}`, `{Ok:...}` or
`{Err:...}` JSON objects. Non-finite f32 cannot encode as standard JSON; the binary
codec preserves all raw f32 bits. Arbitrary future shapes require checked guards
or contracts; usage profiles only guide representation profitability.

## Plain objects at the JavaScript boundary

JavaScript applications can use `JsonCodec.fromJS` and `JsonCodec.toJS` without a
JSON text round trip or a declared record for each incoming object shape:

```js
import {JsonCodec, valueCodecs, callOwned} from './json.mjs';
const documents = new JsonCodec(valueCodecs.identity.result);
const input = {title: 'hello', unknown: {items: [true, null, 3]}};
const result = callOwned('mark_received', [documents.fromJS(input)]);
if (Object.hasOwn(result, 'Ok')) console.log(documents.toJS(result.Ok));
```

These are explicit JavaScript host adapters to the same recursive `Json` type.
They do not add source primitives, alter portable schemas/checkpoints, or run in
native Rust/C/Wasm execution. Existing calls and codecs do not invoke them.
Their source bytes are included in generated JavaScript; traversal work and
allocation occur only when the methods are called. The resulting logical value
can use ordinary calls or existing portable/compact binary calls. A JavaScript
host may also encode it and hand the unchanged portable bytes to a native or
Wasm consumer. No adapter is inserted into that consumer's computation.

The input domain is null, booleans, well-formed strings, finite Numbers, BigInts,
dense plain arrays, and current-realm plain objects with ordinary or null
prototypes. All object fields must be enumerable own string-keyed data
properties. Undefined, functions, symbols, accessors, hidden properties,
non-finite numbers, class instances, sparse/decorated arrays and cycles reject.
`toJSON` and getters are not invoked. Inputs must remain stable; Proxy reflection
can execute traps, so this is not a sandbox for hostile JavaScript code.

Containers are detached, repeated references become independent values, and
returned objects have ordinary prototypes with safe own `__proto__` properties.
Numeric spelling and JSON member order are not generally preserved by plain JS
values. BigInt becomes an exact integer token; JSON has no separate BigInt tag.
`toJS` defaults to `numbers: 'number'`, rejecting non-finite results and decimal
values that change when reserialized as a Number. `numbers: 'bigint'` requires
integral values of at most 4096 decimal digits; `numbers: 'string'` preserves all
numeric tokens as strings. Negative zero survives Number conversion. Existing
portable byte/node/depth budgets apply to both methods.

Known record schemas should still use direct typed calls or `ValueCodec.capture`;
they need no dynamic-JSON conversion and can accept supported typed-array inputs.

## Keep values compiled across the network

`ink-value-wire-v1` is a portable typed value format, owned by the ABI package.
Networking, framing, compression and connection management stay outside Ink.
A buffer can pass through a relay unchanged, without reconstructing JSON text.

For a JavaScript connection that agrees on the exact schema identity beforehand,
`valueCodecs.fn.arguments.compact()` and `.result.compact()` expose
`ink-value-session-v1`. Generated JavaScript `callCompact(name, bytes, limits)`
executes the same pure function and preconditions through that codec. It uses one
version byte, canonical variable-length text/count prefixes and schema-directed
fields, without the portable format's hash or per-node frames. Both peers must
agree on the codec's `.identity` and `.format`; bytes alone cannot detect use of
the wrong schema. All type, Unicode, tag, node/depth and byte bounds remain
checked. Results and buffers are owned. This optional JavaScript transport does
not change `ink-value-wire-v1`, native signatures or state snapshots, and native
backends do not yet expose direct compact calls.

JavaScript `JsonCodec.parseCompact(text, limits)` and
`TypedJsonCodec.parseCompact(text, limits)` construct those agreed-schema bytes
directly from JSON tokens, without a temporary logical tree. Both paths validate
the completed value against the full schema. Input text and final compact bytes
each obey the byte limit, and source/wire node and depth checks remain distinct.
This optional construction path leaves `parse`, `parseBinary` and checkpoints
unchanged. `TypedJsonCodec` uses the declared record/sum shapes; arbitrary JSON
inside a library `Json` field uses `JsonCodec` and validated buffer composition.
Measurements must choose between direct emission and logical
parse/encode for the actual workload: bypassing a tree is not a universal speed
guarantee.

```js
import {JsonCodec, valueCodecs, callCompact} from './json.mjs';
const documents = new JsonCodec(valueCodecs.identity.result);
const document = documents.parseCompact('{"title":"hello"}');
const requests = valueCodecs.mark_received.arguments.compact();
// Compose validated document bytes into the one-field argument record.
// The connection negotiates arguments/result schema identities beforehand.
const request = requests.encodeWith(w => w.frame(() => w.bytes(document.subarray(1))));
const reply = callCompact('mark_received', request);
const result = valueCodecs.mark_received.result.compact().decode(reply);
```

```js
import {ValueCodec,JsonCodec,valueCodecs,callBinary,metadata} from './json.mjs';
// The identity function returns the library Json type itself.
const documents=new JsonCodec(valueCodecs.identity.result);
const document=documents.parse('{"title":"hello","unknown":1e10000}');
const request=valueCodecs.mark_received.arguments.encode({document});
const reply=callBinary('mark_received',request); // can execute on the receiver
// An external transport carries request/reply Uint8Arrays unchanged.
const result=valueCodecs.mark_received.result.decode(reply);
console.log(documents.stringify(result.Ok));
// {"received":true,"title":"hello","unknown":1e10000}
```

Generated native C/Rust packages expose `State::call_binary`,
`State::binary_schemas`, `State::validate_binary_arguments` and `ValueWireLimits`.
C and both Wasm hosts additionally expose optional `lang_call_binary(state,
function_index,arguments_buffer)`, returning a raw result buffer (zero on error,
read `lang_error`). Indices enumerate sorted supported wire signature names.
`StateInstance.pureBinary(index,bytes)` is the browser/Node adapter. These are
pure-function calls: action transaction reports continue through existing checked
state interfaces, and portable snapshots remain a separate protocol.

A schema has a root descriptor, reachable named records and a SHA-256 identity.
Generated nominal payload identities depend on the declaring module, type and
variant, so unrelated function edits do not change a schema. Field/type changes
change it. There is no automatic schema migration or execution-code transfer.
Untrusted JavaScript schema data must use `createValueCodec` and compare its
computed identity; `new ValueCodec` consumes trusted compiler metadata.

Each message has the eight bytes `INKVAL\0\x01`, the 32-byte schema identity,
and one length-delimited root node. Every node carries a little-endian u32 body
length. Words/f32 use fixed little-endian bits; strings/Int/IDs/enums use UTF-8;
lists/vectors carry an element count followed by framed children; records carry
children in declaration order; Option/Result carry one discriminant byte and an
optional child. Exact Int uses canonical signed decimal digits. Schema mismatch,
invalid tags/ranges/text, forged lengths, truncation and trailing bytes reject.
Default and hard maxima are 16 MiB, one million nodes and depth 128. Caller limits
may lower these maxima. Depth counts wire structure, including nested sum/record
nodes, so it is not identical to JSON document nesting.

Rust `Schema::validate` returns a borrowed validated view with field, sequence,
sum and text access. `JsonCodec::validate_binary` also checks unique names and
numeric grammar directly over that view, without constructing a document tree.
Rust borrowing prevents mutation while the witness exists. JavaScript `JsonCodec.validateBinary` also checks numeric tokens and unique names through a generic byte visitor. JavaScript validation
is synchronous and rejects SharedArrayBuffer; its Boolean result is not a reusable
witness after the caller mutates a buffer. The binary pure-call boundaries validate
again. Structural wire validation alone does not establish source preconditions;
executed public functions still check their declared preconditions.

JavaScript binds portable validation and visitation operations lazily to the
immutable descriptor. The scan plan and cursor are separate from decoding;
recursive children retain complete frame, Unicode, discriminant and resource
checks. Selected visitor names restrict callbacks, never validation. Callbacks
run in postorder with the same byte spans and no exposed internal cursor.
The generic materialising scanner remains an independent conformance oracle.
Compiler-derived JavaScript codecs may validate the complete buffer and then
materialise it with literal typed readers and static field names. Arbitrary
runtime schemas retain generic decoding. The materialisers are trusted backend
code; their callbacks are not an untrusted extension mechanism or a proof of
meaning. Full validation precedes synchronous owned materialisation for both
portable and compact formats, with their existing schema and resource contracts.
JSON and typed JSON share an exact token cursor; number text is not converted
through JavaScript Number. Sparse logical arrays reject during JSON rendering.

The plain JavaScript pure `call` API borrows stable caller inputs and can share
their containers in its result. Callers manage that aliasing. Stateful replies
and binary calls retain their own capture/encoding ownership boundaries.
`callOwned` keeps that trusted input contract and uses literal type-directed
copies to return a detached canonical logical value. Declared preconditions still
execute, and result copying obeys ABI byte/node/depth bounds; pure execution has
no timeout. `ValueCodec.capture` validates and owns external logical values in
one traversal; `ValueCodec.copy` requires already valid, stable values. Neither
operation grants rewrite authority or proves the backend correct.
Benchmarks distinguish retained sharing from fully detached mutable JSON trees;
text output is an owned string without requiring a detached intermediate tree.

## Compiler, database and trust boundary

Compiler changes are stable, hygienic naming of all payload enums and a shared generic recursive-record analysis. C checkpoint schema construction now handles bound recursive types with explicit budgets. JSON
algorithms and datatype definitions stay in knowledge. General schema derivation,
byte codecs, bounded validation and entrypoint plumbing live in ABI/support,
lowerings and runtime. No JSON-specific rewrite or storage strategy is selected
by core. Eight database laws cover lookup after put, first-match early exit, empty lookup, projection
idempotence, projection/map fusion and concrete String instances. Their proof
bytes and premises are checked through the ordinary law machinery; profiles and
schema hashes confer no rewrite authority.

Transport implementation is operationally trusted. Its conformance tests do not
prove backend/codec correctness. Both JSON codecs now stream text directly into
schema-bound frames and render frames directly to text. Scalars may allocate
individual string/number tokens; neither path builds a complete JSON AST or an
intermediate serde_json value tree. Typed text records accept any member order;
already ordered fields need no reorder copy. Unknown, missing or duplicate names,
invalid numbers, forged frames and lowered resource-limit violations reject.

Generated Rust binary calls decode directly into the emitted native types through
`BinaryValue` and encode those types through the ABI's bounded `Encoder`. C calls
decode directly into their ordinary typed value arena and emit frames from arena
values. Both paths preserve preconditions, raw f32 bits and exact Int. Wasm uses
the same implementations, with copies at its memory boundary. Calls still
materialise native values, and source algorithms retain their normal ownership
costs; this is not zero-copy execution of arbitrary compiled programs.

Rust validated views also offer declaration-order `fields()` traversal and an
optional `SequenceIndex` with O(1) reads. Index construction scans once and retains
four bytes per element. `wire_packed::pack_flat(view)` bridges supported flat
numeric records/vectors/lists directly into the existing compute word layout,
without a generic value carrier. Non-finite f32 bits survive packing and set the
separate `finite` eligibility flag. Arbitrary JSON objects do not qualify for
flat numeric packing.

The ABI benchmark in `abi/examples/value_boundaries.rs` measures construction,
whole lifecycles and resident reads separately. The knowledge producer
`value_boundary_measurements.py` publishes immutable observations bound to exact
code, target, shape and phase. The existing generic lifecycle planner ranks them;
missing comparable evidence retains the baseline. These are host boundary
alternatives, separate from source rewrites. No compiler recognition case or
benchmark result grants mathematical authority. See the measured report in
`reports/value-boundaries-2026-10-13` and the Frontier comparison in
`reports/frontier-json-2026-10-13` for current numbers and limits.
