# Private schema syntax sharing

JavaScript emission factors repeated private named-declaration literals into
private lazy factories. Each use still creates a fresh declaration object;
codec construction keeps its own frozen descriptor. The change shares emitted
syntax, avoids eager construction and retains no additional descriptor pool.
It supplies no algebraic rewrite, source-name recognition or strategy choice.

Full standalone JavaScript tests pass for final source 755e502. The same checked
record/sum/preflight source plan emits 640,958 bytes versus 652,160 bytes for the
unfactored module: 11,202 bytes (1.72%) less. This establishes artifact size only;
no import latency, retained heap or throughput gain has been measured. JavaScript
CI 38519097827 and final distribution publication remain pending.
