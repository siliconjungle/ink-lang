# Guarded canonical native JSON experiments

Nine fresh-process experiments retain exact generated modules, prototype support, runner, proof plan and conformance logs under `artifacts/canonical-native-329-337`.

The prototype admitted native parsing only if native reserialization reproduced the complete input exactly, after conservative resource bounds and inherited-hook checks. Noncanonical numeric tokens, reordered integer keys, duplicates, malformed Unicode and narrow resource cases fell back to the original parser. A second adapter targeted the existing generic compiled-value builder directly. Full ABI tests and ordinary/composed record-and-sum builder tests passed. The first standalone test used the published ABI and failed because that ABI did not have the prototype method; the corrected local-ABI run passed.

Processes 329–331 compare boxed parsing: candidate/control parse medians were 0.948 / 0.973 / 0.960, with complete UTF-8 output pipeline ratios 0.978 / 0.971 / 0.954. Processes 332–334 compare direct compiled construction against the prior emitted module: pipeline medians were 351.12 / 365.71 / 378.12 microseconds, versus Frontier 97.76 / 97.09 / 101.12 microseconds. Those older-module comparisons include ABI/compiler epoch differences.

The decisive isolation uses exactly the same emitted module for both constructor paths in processes 335–337. Construction-plus-portable-encoding ratios improved to 0.917 / 0.953 / 0.927, but complete edit/UTF-8 output ratios were **1.015 / 0.944 / 0.972**. The first process regressed. These small mixed lifecycle results do not establish stable profitability; no default or database-selected strategy is promoted.

Both prototype APIs and their production support were removed after the comparison. Only archived experimental modules retain them. Production source, fixed grammar, exact lexemes/member order and source representation choices remain unchanged. Shared host, no confidence bounds, no heap/startup/all-metrics gain. The two text contracts differ: Frontier uses native JSON on the shared finite numeric/Unicode fixture, while Ink preserves exact tokens and rejects duplicate keys.
