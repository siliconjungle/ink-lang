#!/usr/bin/env python3
"""Rebuild pinned emitters, or replay the exact retained measured modules."""
import argparse, gzip, hashlib, io, json, subprocess, tarfile
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "build/signals-state"
REPORT = ROOT / "reports/signals-state-2026-10-12"
BASELINE = "e9a45c390c3a6a9ffbfe756e2423d280f7a9f430"

def run(*args, cwd=ROOT):
    subprocess.run([str(x) for x in args], cwd=cwd, check=True)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frozen", action="store_true", help="inflate retained measured modules; no Rust compiler needed")
    args = parser.parse_args()
    for lane in ("before", "after"):
        (BUILD / lane).mkdir(parents=True, exist_ok=True)
    if args.frozen:
        hashes = json.loads((REPORT / "results.json").read_text())["hashes"]
        for lane in ("before", "after"):
            for name in ("aggregate", "point", "indexed"):
                packed = REPORT / "modules" / f"{lane}-{name}.mjs.gz"
                emitted = gzip.decompress(packed.read_bytes())
                key = f"../../build/signals-state/{lane}/{name}.mjs"
                if hashlib.sha256(emitted).hexdigest() != hashes[key]:
                    raise RuntimeError(f"frozen module hash mismatch: {lane}/{name}")
                (BUILD / lane / f"{name}.mjs").write_bytes(emitted)
        (BUILD / 'indexed.request.json').write_bytes((ROOT / 'knowledge/research/indexed-aggregate/request.json').read_bytes())
        return
    # Old backend, current identical checked core/source/request on both sides.
    pinned = BUILD / f"baseline-js-{BASELINE}"
    if not pinned.exists():
        archive = subprocess.check_output(["git", "archive", BASELINE], cwd=ROOT / "lowerings/js")
        pinned.mkdir()
        with tarfile.open(fileobj=io.BytesIO(archive)) as files:
            files.extractall(pinned, filter="data")
    crate = BUILD / "baseline-compiler"
    (crate / "src").mkdir(parents=True, exist_ok=True)
    core = json.dumps(str(ROOT / "core"))
    backend = json.dumps(str(pinned))
    (crate / "Cargo.toml").write_text(f'''[package]
name="signal-baseline-emitter"
version="0.1.0"
edition="2021"
[dependencies]
ink-core={{path={core}}}
ink-lowering-js={{path={backend}}}
serde_json="=1.0.152"
[patch."https://github.com/siliconjungle/ink-lang"]
ink-core={{path={core}}}
[workspace]
''')
    (crate / "src/main.rs").write_text('''fn main() {
 let args: Vec<String> = std::env::args().collect();
 let module = ink_core::core::CheckedModule::from_source(
  ink_core::syntax::parse(&std::fs::read_to_string(&args[1]).unwrap()).unwrap()).unwrap();
 let emitted = if args.len() == 4 {
  let request = serde_json::from_slice(&std::fs::read(&args[3]).unwrap()).unwrap();
  let checked = ink_core::representation::check(&module, &request).unwrap();
  ink_lowering_js::representation_program::lower(&checked).unwrap()
 } else { ink_lowering_js::lower(&module).unwrap().javascript };
 std::fs::write(&args[2], emitted).unwrap();
}
''')
    run("cargo", "build", "--locked", "--bin", "ink")
    for name, source in (("aggregate", ROOT / "examples/filtered-aggregate.ink"), ("point", ROOT / "bench/signals-state/point.ink")):
        run("cargo", "run", "--manifest-path", crate / "Cargo.toml", "--", source, BUILD / "before" / f"{name}.mjs")
        run(ROOT / "target/debug/ink", "build", source, "--target", "javascript", "-o", BUILD / "after" / f"{name}.mjs")
    source = ROOT / "examples/filtered-aggregate.ink"
    # Explicit database proof replaces historical backend envelope erasure.
    # Both emitters receive the same checked compact request in source mode.
    sys.path.insert(0,str(ROOT/'knowledge'))
    from producers.compact_observation import attach
    request=BUILD/'indexed.request.json'
    request.write_text(json.dumps(attach(json.loads((ROOT/'knowledge/research/indexed-aggregate/request.json').read_text()),BUILD/'compact-store')))
    run(ROOT/'target/debug/ink','check-representation',source,request)
    run("cargo", "run", "--manifest-path", crate / "Cargo.toml", "--", source, BUILD / "before/indexed.mjs", request)
    run(ROOT / "target/debug/ink", "emit-representation", source, request, "--target", "javascript", "-o", BUILD / "after/indexed.mjs")

if __name__ == "__main__":
    main()
