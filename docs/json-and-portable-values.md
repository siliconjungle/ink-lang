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

## Keep values compiled across the network

`ink-value-wire-v1` is a portable typed value format, owned by the ABI package.
Networking, framing, compression and connection management stay outside Ink.
A buffer can pass through a relay unchanged, without reconstructing JSON text.

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

## Compiler, database and trust boundary

Compiler changes are stable, hygienic naming of all payload enums and a shared generic recursive-record analysis. C checkpoint schema construction now handles bound recursive types with explicit budgets. JSON
algorithms and datatype definitions stay in knowledge. General schema derivation,
byte codecs, bounded validation and entrypoint plumbing live in ABI/support,
lowerings and runtime. No JSON-specific rewrite or storage strategy is selected
by core. Six database laws cover lookup after put, empty lookup, projection
idempotence, projection/map fusion and concrete String instances. Their proof
bytes and premises are checked through the ordinary law machinery; profiles and
schema hashes confer no rewrite authority.

Transport implementation is operationally trusted. Its conformance tests do not
prove backend/codec correctness. This baseline materializes target values for a
compiled call, uses a temporary generic carrier in native adapters and copies at
Wasm memory boundaries. It does not promise zero-copy mutation, a globally optimal
layout or measured speedups. Direct borrowed validation/relay already avoids a
JSON document tree. Further direct typed decoding, lazy/indexed layouts and fusion
need explicit implementations, correspondence proofs and lifecycle measurements.
