Development scalar microbenchmark, measured 15 October 2026.

Run with Node.js, Playwright, and Chrome installed: node run.cjs
Use NODE_PATH to resolve an existing Playwright installation if needed.
The harness writes a new timestamped result without replacing the original.
Generated modules are the exact files measured; no handwritten replacements.
Three fresh Chrome processes; 15 alternating pairs after warmup per case.
Varying unsigned inputs and consumed output checksums; fixed JS backend.
Timing includes harness loads, exported function calls and checksum accumulation.
These small development examples do not establish application-wide performance.
Other work was using this shared machine, as authorised by the user.
