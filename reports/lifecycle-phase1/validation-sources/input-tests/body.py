#!/usr/bin/env python3
import sys,json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[2]
subprocess.run([str(root/"target/release/lang"),*sys.argv[1:]],check=True)
if sys.argv[1]=="emit-state":
 project=Path(sys.argv[sys.argv.index("-o")+1])
 (project/"src/lib.rs").write_text("pub struct State;\n")
