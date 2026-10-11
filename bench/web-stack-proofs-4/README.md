# Fourth web proof batch

Six original U32 algorithms exercise 23 new proof instances. Each source is compiled unselected, against immutable old786, and against the extended catalogue with the same frozen compiler. Old786 must leave every benchmark body unchanged; new proofs must be selected, replay locally and reify to executable source. Proof scope includes U32/I32/U64 and applicable F32 instances; timings cover U32 only.

Controls preserve original materialised map/zip stages and arithmetic. Independent Python arbitrary integer oracles reduce modulo 2^32 once per result. Python literal stages wrap every operation; handwritten JavaScript and Rust preserve source stages with normal language optimisation. Rust is compiled to Wasm in release mode, not timed natively.

Warm complete calls include one input snapshot for every implementation, host-to-Wasm copies, result conversion, scheduling/await and checksum consumption. Rust input/output allocation is reused; intermediate Vec stages receive normal release optimisation. Module startup and first calls are archived separately. All result words are validated before timing, with input nonmutation checks. No caller checks are added to emitted code.

GPU timing requires actual headed-browser WebGPU execution. Every call audits dispatch, upload and readback counters. Fallback is retained as availability evidence and never timed as GPU. Newly shader-eligible code is compared against the current CPU routes as well as prior CPU routes. Eligibility alone does not select a profitable backend.

Pure callback fusion preserves exact per-element arithmetic/grouping but changes global callback scheduling. Integer conservation excludes F32; fused F32 expressions retain operand order. Correctness, executable applicability and profitability are separate evidence. Confidence intervals are paired bootstrap 95%, exploratory across many cells. Exported Wasm linear-memory highwater is the only measured memory metric; host/GPU peak memory is unmeasured.

Prepare, validate, then time Node and browser sequentially with agent/test jobs stopped. The report archives the harness, source, controls, proof pins, outputs, hashes, fixtures, calibration, warmups, raw samples and observations. Never overwrite archived results.
