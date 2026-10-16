# Prepared binary64 text geometry

`std:prepared_text` ports Pretext's simple prepared line walkers into ordinary
Ink source. It separates immutable measured facts from changing layout widths,
and supplies separate count/height, summary and complete cursor-range results.
It does not perform text segmentation or font measurement.

```ink
module paragraph;
import "std:prepared_text" as text;
fn prepare(data:text.Data)->Result<text.Prepared,String> {
    return text.prepare(data,0.005f64,1000000);
}
fn resized(paragraph:text.Prepared,width:f64)->Result<text.Layout,String> {
    return text.layout(paragraph,width,19.25f64);
}
```

Prepare at the frequency at which text, segmentation, font, language or shaping
facts change. Reuse that immutable value while resizing. A different font or
measurement environment needs new facts and a new prepared value; this library
cannot detect an undeclared external change. The complete [example](../examples/prepared-text.ink)
also retains a paragraph in ordinary state and replaces it transactionally.

## Data and observations

`Data` contains parallel widths, flags, optional per-grapheme advances, optional
line-start/grapheme-start corrections, line-end/overflow trims and rich-inline
inside/fill extras. Measurements and arithmetic use F64. Flags preserve Pretext's
kind/spacing bits. This first walker admits text, collapsible spaces and zero-width
breaks without unbroken segment boundaries. It rejects the other kinds rather
than choosing different wrapping rules for them.

`prepare(data, epsilon, maximum)` validates finite measured arrays, their complete
shapes and flags, and a combined segment/grapheme budget. `maximum` is between one
and one million. It returns an opaque `Prepared`, not an authenticated host token.
The observation functions below validate a supplied prepared value; malformed
host-created records cannot bypass the budget or array checks. Low-level source helpers require already validated data. These checks do
not prove that a font engine supplied accurate widths or consistent shaping facts.

| Function | Result |
| --- | --- |
| `line_count(prepared,width)` | Count using the dedicated numeric loop, or geometry stepping when overflow trims require it |
| `layout(prepared,width,lineHeight)` | Count and binary64 `count * lineHeight`, without line strings/ranges |
| `stats(prepared,width)` | Count and maximum painted width, without line strings/ranges |
| `lines(prepared,width)` | Every painted width and complete start/end segment/grapheme cursor |
| `line_from(prepared,cursor,width)` | One line and its continuation cursor, or no remaining line |

Paragraph APIs normalize a NaN width to infinity, clamp negative widths to zero
before adding the explicit fit epsilon, and preserve the upstream addition order.
The counter and geometry walker retain their respective upstream comparisons;
they do not replace `<=` with the negation of `>` around nonfinite intermediate
arithmetic. Line height remains caller-authored arithmetic. Neither geometry nor
height builds line strings. Materializing text from cursors remains separate work.

## Complex prepared geometry

`std:prepared_complex_text` adds the complex walker as ordinary source. It uses
the same `Cursor`, `Line`, `Stats` and `Layout` records from `std:prepared_text`.
Its `Data` contains `base:text.Data`, an explicit `Profile`, optional `Items`,
letter spacing, hyphen width/contexts and tab stop/minimum advances. The complete
[example](../examples/prepared-complex-text.ink) shows preparation, observation
and transactional replacement. No new source syntax is needed.

```ink
import "std:prepared_complex_text" as complex;
import "std:prepared_text" as text;

fn resize(data:complex.Data,width:f64)->Result<text.Layout,String> {
    let paragraph=complex.prepare(data,1000000)?;
    return complex.layout(paragraph,width,19.25f64);
}
```

The complex `prepare` takes the data and combined segment/grapheme budget; its
epsilon belongs to `data.profile`. The observation names and result types match
the simple module. `line_count` derives the count from a numeric summary walk;
it does not allocate line ranges or materialize text. This supplies no automatic
choice between the simple and complex algorithms.

Flags admit kinds 0–9: text, collapsible space, zero-width break, soft hyphen,
preserved space, tab, zero-width glue, control, hard break and object. Spacing,
unbroken and returnable boundary bits remain explicit. The profile controls tab
hanging/app-unit rounding, hyphen retreat, empty glue, hanging spaces around items,
padded openings and retreat before hard breaks. These are measured-environment
inputs, not properties inferred from the compilation target. An author can
supply a custom profile; merely naming an engine does not establish accurate
segmentation, shaping or measurements.

`Items` carries optional per-segment hyphen widths/rooms, item-end halts, opening
edges, empty-object spaces/return flags, and tab stops/minimum advances. Inside
and fill extras remain in `base`. Present arrays must have the exact shape;
hyphen rooms have one extra entry for the paragraph's end. Empty-object spaces
and return flags must be supplied together. Measured arrays and profile scalars
must be finite, epsilon nonnegative, kinds/bits valid and advances nonempty when
present. Restored or forged prepared values undergo the same validation. Invalid
cursors reject; exhausted valid cursors return `Ok(None)`. Low-level source
helpers require their prepared-data domain.

The port retains binary64 operation order, explicit JavaScript-style rounding
for tab app units and signed-zero/NaN behavior of minimum/maximum. Its bounded
walks report nonprogress or exhausted work instead of looping indefinitely on
inconsistent external facts. Finite inputs alone do not establish that the
shaping facts describe real text.

The upstream-only `bench/prepared-text/generate-complex-oracle.mjs` executes the
same pinned, unmodified Pretext sources, with explicit numerical Blink, Gecko and
WebKit profiles. It generates a compressed fixture independently of Ink code.
The fixture includes full geometry, summaries, counts, heights and continuation
cursors on synthetic measured data. The mandatory `generic_libraries` tests
compare these results with the independent reference and compiled targets, and
exercise invalid data, edits, resizes, failed-update events and exact recovery.
Text geometry retains CPU execution in mixed GPU bundles; a separate eligible
numeric control checks actual device dispatch.

## Evidence and remaining work

The oracle generator executes unmodified Pretext source at
`0a27bbe0f109c689b0a2af2fb1d2e659ddabf5b8`, retaining source hashes. Its 232 cases
compare counts, heights, summary widths and every line's exact binary64 width and
both cursors. They include shaping corrections, negative advances, exceptional
paragraph widths, overflow and a branch that F32 narrowing would change.
These are synthetic measured facts, not browser/font accuracy evidence.

The mandatory `generic_libraries` suite includes shape/kind/budget/cursor and
forged-value rejection plus a 182-observation Rust/JavaScript/Wasm/native-GPU-host
history with edits, resizes, failed-update rollback and restore. CPU targets
compare every checkpoint; the native GPU host compares its final checkpoint.
The separate F32 kernel dispatches on the GPU; text geometry runs on CPU hosts.

The [retained diagnostic](../reports/prepared-text-2026-10-16/README.md) JavaScript comparison still places the best Ink prepared count path
well behind Pretext's direct loop. It reports setup/capture/first-call costs
separately. This is a fidelity baseline, not completion of the requested speed
target. The complex module extends prepared geometry to tabs, hyphens, preserved
spaces and rich-inline rules. Engine segmentation/shaping/preparation,
line-text materialization, incremental
preparation and broader performance acceptance remain required work. No automatic
replacement, precision narrowing, device layout or profitability follows from
these authored algorithms. See [the programme](chenglou-optimisation-programme.md).

The source port retains [Pretext's license and notices](../knowledge/notices/pretext-LICENSE.txt).
