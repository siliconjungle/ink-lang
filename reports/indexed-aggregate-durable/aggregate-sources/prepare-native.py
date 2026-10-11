"""Build standalone frozen benchmarks, with no Ink runtime/checker dependency."""
import json, pathlib, subprocess
root=pathlib.Path(__file__).resolve().parents[3]
frozen=root/'reports/indexed-aggregate-durable/aggregate-sources'
build=root/'build/indexed-aggregate'
manifest='''[package]
name = "ink-compiled-representation"
version = "0.1.0"
edition = "2021"
[dependencies]
num-bigint = "=0.4.8"
sha2 = "=0.10.9"
serde_json = {version="=1.0.151",features=["float_roundtrip"]}
[profile.release]
lto = "thin"
codegen-units = 1
[workspace]
'''
for label,project,target in [('source','source-rust','source-bench-target'),('direct','baseline/rust','native-bench-target'),('indexed','indexed-rust','indexed-bench-target')]:
    p=build/project;(p/'src/bin').mkdir(parents=True,exist_ok=True)
    (p/'Cargo.toml').write_text(manifest)
    (p/'src/lib.rs').write_text((frozen/(label+'.rs')).read_text())
    harness=(frozen/'native-bench.rs').read_text()
    if label=='source':harness=harness.replace('State::new().unwrap()', 'State::new()')
    (p/'src/bin/bench.rs').write_text(harness)
    subprocess.run(['cargo','build','--release','--manifest-path',str(p/'Cargo.toml'),'--target-dir',str(build/target),'--bin','bench'],check=True)
results={}
for label in ['direct','indexed']:
    p=build/('migration-'+label);(p/'src').mkdir(parents=True,exist_ok=True)
    (p/'Cargo.toml').write_text(manifest.replace('ink-compiled-representation','indexed-migration-benchmark'))
    # Both independent emissions export identical C ABI symbol names. The
    # benchmark calls their Rust APIs only; remove symbol-export attributes
    # when nesting the unmodified definitions in separate modules.
    before=(frozen/'source.rs').read_text().replace('#[no_mangle]','')
    after=(frozen/(label+'.rs')).read_text().replace('#[no_mangle]','')
    harness=(frozen/'migration-main.rs').read_text().replace('before::State::new().unwrap()', 'before::State::new()')
    (p/'src/main.rs').write_text('mod before{\n'+before+'\n}\nmod after{\n'+after+'\n}\n'+harness)
    subprocess.run(['cargo','build','--release','--manifest-path',str(p/'Cargo.toml')],check=True)
    results[label]=json.loads(subprocess.check_output([str(p/'target/release/indexed-migration-benchmark')],text=True))
(root/'reports/indexed-aggregate-durable/migration-rust-ns.json').write_text(json.dumps(results,indent=2)+'\n')
