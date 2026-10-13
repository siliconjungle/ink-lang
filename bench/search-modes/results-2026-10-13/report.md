| Program | Initial cost | Beam cost | Beam s | E-graph+beam cost | s | Chosen |
|---|---:|---:|---:|---:|---:|---|
| ast-ancestor | 52 | 52 | 4.7 | 52 | 5.6 | beam |
| bulk-update | 56 | 56 | 2.9 | 56 | 2.9 | beam |
| compact-set | 81 | 73 | 4.9 | 73 | 6.6 | beam |
| drawing-hit | 120 | 47 | 4.4 | 47 | 5.7 | beam |
| incremental-distinct | 68 | 68 | 4.3 | 68 | 4.8 | beam |
| index-membership | 13 | 13 | 4.6 | 13 | 5.4 | beam |
| particle-step | 63 | 63 | 0.3 | 63 | 0.4 | beam |
| sequence-every | 10 | 10 | 4.6 | 10 | 5.1 | beam |
| spatial-collision | 33 | 33 | 4.9 | 33 | 4.8 | beam |
| text-lines | 27 | 27 | 4.1 | 27 | 5.0 | beam |
| collection-pipelines | 1311 | 996 | 40.8 | 923 | 37.3 | egraph |

| Modular run | Cost | Seconds | Hits / misses |
|---|---:|---:|---|
| full | 996 (from 1311) | 42.2 | full search |
| cold | error am=core_program, width=args.width, memory_bytes=args.memory_bytes, strategy=args | | |
| warm | error am=core_program, width=args.width, memory_bytes=args.memory_bytes, strategy=args | | |
| after_adding_one_function | error am=core_program, width=args.width, memory_bytes=args.memory_bytes, strategy=args | | |
