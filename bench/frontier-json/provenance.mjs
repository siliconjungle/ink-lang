import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';

// Bind installed executable package bytes as well as repository revisions.
// A checkout revision alone does not identify its built files or dependencies.
function implementationBytes(root) {
  const require = createRequire(import.meta.url), pending = [
    require.resolve('@shapeshift-labs/frontier/apply'),
    require.resolve('@shapeshift-labs/frontier-state'),
    require.resolve('@shapeshift-labs/frontier-codec'),
    path.join(root, 'build/frontier-state-main/dist/index.js'),
  ], visited = new Set(), hashes = {};
  const hash = file => { hashes[fs.realpathSync(file)] = createHash('sha256').update(fs.readFileSync(file)).digest('hex'); };
  while (pending.length) {
    const entry = fs.realpathSync(pending.pop());
    let directory = path.dirname(entry);
    while (!fs.existsSync(path.join(directory, 'package.json'))) {
      const parent = path.dirname(directory);
      if (parent === directory) throw Error('implementation package manifest missing');
      directory = parent;
    }
    if (visited.has(directory)) continue;
    visited.add(directory);
    const manifest = path.join(directory, 'package.json'); hash(manifest);
    const relative = path.relative(directory, entry), first = relative.split(path.sep)[0];
    const compiled = relative.includes(path.sep) ? path.join(directory, first) : directory;
    const walk = folder => {
      for (const item of fs.readdirSync(folder, {withFileTypes:true})) {
        if (item.name === 'node_modules' || item.name === '.git') continue;
        const file = path.join(folder, item.name);
        if (item.isDirectory()) walk(file);
        else if (item.isFile() && /\.(?:js|mjs|cjs)$/.test(item.name)) hash(file);
      }
    };
    walk(compiled);
    const resolver = createRequire(manifest), dependencies = JSON.parse(fs.readFileSync(manifest, 'utf8')).dependencies ?? {};
    for (const name of Object.keys(dependencies)) {
      if (name === '@shapeshift-labs/frontier' || name.startsWith('@shapeshift-labs/frontier-')) pending.push(resolver.resolve(name));
    }
  }
  return Object.fromEntries(Object.entries(hashes).sort(([a],[b]) => a.localeCompare(b)));
}

export function provenance(root, {native = true, artifacts = null, repositories: repositoryPaths = null} = {}) {
  const files = artifacts ?? [
    'bench/frontier-json/state.ink', 'bench/frontier-json/prepare.py',
    'bench/frontier-json/run.mjs', 'bench/frontier-json/state-adapters.mjs', 'bench/frontier-json/json-kernels.mjs',
    'bench/frontier-json/src/main.rs', 'bench/frontier-json/package-lock.json',
    'bench/frontier-json/Cargo.lock', 'bench/frontier-json/provenance.mjs',
    'build/frontier-json/fixtures.json', 'build/frontier-json/preparation.json',
    'build/frontier-json/ink.mjs', 'target/debug/ink',
    'build/frontier-json/ink-indexed.mjs', 'build/frontier-json/indexed.plan.json',
    'build/frontier-json/target/release/ink-frontier-json-benchmark',
  ];
  const hashes = Object.fromEntries(files.filter(file => native || file !== 'build/frontier-json/target/release/ink-frontier-json-benchmark').map(file => [file,
    createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
  const repositories = repositoryPaths ?? ['.', 'abi', 'core', 'native-support', 'runtime', 'knowledge',
    'planner', 'lowerings/c', 'lowerings/rust', 'lowerings/js', 'lowerings/wasm',
    'lowerings/gpu', 'build/frontier', 'build/frontier-state-main',
    'build/frontier-engine', 'build/frontier-codec'];
  const revisions = Object.fromEntries(repositories.map(repo => [repo,
    execFileSync('git', ['-C', path.join(root, repo), 'rev-parse', 'HEAD'],
      {encoding: 'utf8'}).trim()]));
  const installed = implementationBytes(root);
  // Existing runners compare the complete hashes object again after timing.
  Object.assign(hashes, installed);
  return {
    captured_at: new Date().toISOString(), hashes, revisions,
    installed_implementation_hashes: installed,
    native_artifact_included: native,
    node: process.version,
    target: {cpu: os.cpus()[0].model, platform: os.platform(), arch: os.arch(),
      release: os.release()},
    host_isolation: 'Shared development host; no exclusive CPU reservation. Repeated process cohorts and rotated lane order, not a controlled laboratory.',
  };
}
