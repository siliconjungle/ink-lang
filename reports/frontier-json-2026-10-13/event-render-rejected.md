# Rejected direct JSON rendering adapter

Processes 284–286 use the same source layouts and complete output checks. The adapter streams generic source framing events and interprets their descriptors. It avoids allocating a logical Json tree but performs more dispatch and schema bookkeeping.

For the 512-field selected-record/sum layout, process medians were 1163.193, 1081.673 and 1176.607 microseconds for direct rendering, versus 469.762, 500.113 and 420.822 for the existing output path. Frontier text/edit/text took 78.904, 78.471 and 78.226 microseconds on the shared finite-integer/Unicode domain, with its different validation and lexeme contract. The direct adapter lost on all three measured sizes in each process. It was removed; no default or planner selection uses it.

Generic compiled-value framing visitation remains independent boundary machinery. Further JSON rendering work needs compiled observer fusion rather than interpreting a descriptor at each event. Profiles before that experiment show most output samples in the logical stringifier and its member callback; input samples include parser control, constructor dispatch and GC. Those profiles are diagnostic observations on a shared host, not comparable cost evidence. The exact earlier profiled module is flat-combined.mjs.

Process 283 suffered severe shared-host slowdown for both controls and Frontier and is retained as rejected diagnostic evidence. Exact modules, plans, runners, profiles, conformance script and the removed adapter are retained under artifacts/event-render-284-286.
