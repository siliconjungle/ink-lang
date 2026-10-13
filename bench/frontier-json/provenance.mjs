import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

export function provenance(root) {
  const files = [
    'bench/frontier-json/state.ink', 'bench/frontier-json/prepare.py',
    'bench/frontier-json/run.mjs', 'bench/frontier-json/json-kernels.mjs',
    'bench/frontier-json/src/main.rs', 'bench/frontier-json/package-lock.json',
    'bench/frontier-json/Cargo.lock', 'bench/frontier-json/provenance.mjs',
    'build/frontier-json/fixtures.json', 'build/frontier-json/preparation.json',
    'build/frontier-json/ink.mjs', 'target/debug/ink',
    'build/frontier-json/ink-indexed.mjs', 'build/frontier-json/indexed.plan.json',
    'build/frontier-json/target/release/ink-frontier-json-benchmark',
  ];
  const hashes = Object.fromEntries(files.map(file => [file,
    createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
  const repositories = ['.', 'abi', 'core', 'native-support', 'runtime', 'knowledge',
    'planner', 'lowerings/c', 'lowerings/rust', 'lowerings/js', 'lowerings/wasm',
    'lowerings/gpu', 'build/frontier', 'build/frontier-state-main',
    'build/frontier-engine', 'build/frontier-codec'];
  const revisions = Object.fromEntries(repositories.map(repo => [repo,
    execFileSync('git', ['-C', path.join(root, repo), 'rev-parse', 'HEAD'],
      {encoding: 'utf8'}).trim()]));
  return {
    captured_at: new Date().toISOString(), hashes, revisions,
    node: process.version,
    target: {cpu: os.cpus()[0].model, platform: os.platform(), arch: os.arch(),
      release: os.release()},
    host_isolation: 'Shared development host; no exclusive CPU reservation. Repeated process cohorts and rotated lane order, not a controlled laboratory.',
  };
}
