# Direct typed JSON scalar emission

TypedJsonCodec writes checked numeric scalar words directly into the existing bounded writer, avoiding a temporary byte array/DataView per scalar. A shared F32 scratch view completes conversion before any writer call. Existing JSON grammar/range/rounding checks and complete output schema validation remain. This is general numeric boundary support; no source recognizer or rewrite authority is introduced.

Three fresh processes, 15 alternating rounds, 1,024-element numeric lists. Exact encoded bytes, complete decoded values and reduced limits are checked before timing. Every output byte is consumed.

| Operation | Candidate/control ratios |
|---|---|
| f32-text-to-compact | 0.557, 0.478, 0.508 |
| f32-text-to-portable | 0.552, 0.484, 0.472 |
| u32-text-to-compact | 0.635, 0.666, 0.562 |
| u32-text-to-portable | 0.656, 0.610, 0.575 |
| u64-text-to-compact | 0.824, 0.686, 0.786 |
| u64-text-to-portable | 0.850, 0.687, 0.708 |

All six operations improve in all three processes. These are shared-host Ink implementation diagnostics, not Frontier, startup, heap or arbitrary-JSON rankings.

Full ABI tests pass, including signed zero, subnormal/overflow rounding, all integer boundaries and byte/node/depth limits. An initial added test compared a text-ingress byte limit with output encoding alone; it was corrected to account for both input text and output bytes. The initial failure is retained. ABI main revision: 04193e0c002195d1fa55a27824be99d3a8805a7f. Dependent exact-pin JavaScript/full distribution checks are separate release gates.
