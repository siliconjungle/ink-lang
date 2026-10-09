#!/usr/bin/env python3
import os, shutil, subprocess, sys
from pathlib import Path
root=Path(__file__).resolve().parent
env=os.environ.copy()
local=root.parents[1]/'work'/'toolchain'
if not shutil.which('cargo') and (local/'cargo/bin/cargo').exists():
    env['CARGO_HOME']=str(local/'cargo')
    env['RUSTUP_HOME']=str(local/'rustup')
    env['PATH']=str(local/'cargo/bin')+os.pathsep+env['PATH']
raise SystemExit(subprocess.call(['cargo']+sys.argv[1:],cwd=root,env=env))
