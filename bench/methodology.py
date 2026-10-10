"""Shared measurement methodology for active benchmark harnesses.

Environment capture, platform-portable native linking, warmup/interleaving
helpers and bootstrap confidence intervals. Archived reports keep the method
they were produced with; see docs/benchmark-methodology.md.
"""
import json, math, os, platform, random, re, shutil, statistics, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DARWIN = platform.system() == 'Darwin'


def _out(argv, env=None):
    try:
        p = subprocess.run(argv, cwd=ROOT, env=env, text=True, capture_output=True)
        return (p.stdout + p.stderr).strip() if p.returncode == 0 else None
    except OSError:
        return None


# ---------------------------------------------------------------- platform

def shared_suffix():
    return 'dylib' if DARWIN else 'so'


def shared_link_flag():
    return '-dynamiclib' if DARWIN else '-shared'


def static_rust_link_libs():
    """Extra system libraries needed to link a Rust staticlib from C."""
    return ['-liconv'] if DARWIN else ['-lpthread', '-ldl', '-lm']


def native_cpu_flag():
    return '-mcpu=native' if platform.machine() in ('arm64', 'aarch64') else '-march=native'


def cpu_model():
    if DARWIN:
        return _out(['sysctl', '-n', 'machdep.cpu.brand_string'])
    try:
        for line in Path('/proc/cpuinfo').read_text().splitlines():
            if line.lower().startswith('model name'):
                return line.split(':', 1)[1].strip()
    except OSError:
        pass
    return platform.processor() or None


def llvm_major(text):
    if not text:
        return None
    m = re.search(r'LLVM version: (\d+)', text) or re.search(r'clang version (\d+)', text)
    return int(m.group(1)) if m else None


def environment(env=None):
    """Toolchain, machine and source identities for a run's metadata."""
    rustc = _out(['rustc', '-vV'], env)
    clang = _out(['clang', '--version'])
    info = {
        'platform': platform.platform(),
        'machine': platform.machine(),
        'cpu': cpu_model(),
        'logical_cpus': os.cpu_count(),
        'python': platform.python_version(),
        'rustc': rustc,
        'clang': clang,
        'rustc_llvm_major': llvm_major(rustc),
        'clang_llvm_major': llvm_major(clang),
        'git': {},
    }
    for name, path in [('ink-lang', ROOT), ('knowledge', ROOT / 'knowledge')] + [
            (f'lowering-{p.name}', p) for p in sorted((ROOT / 'lowerings').glob('*')) if p.is_dir()]:
        rev = _out(['git', '-C', str(path), 'rev-parse', 'HEAD'])
        dirty = _out(['git', '-C', str(path), 'status', '--porcelain'])
        info['git'][name] = {'commit': rev, 'dirty': bool(dirty)} if rev else None
    if not DARWIN:
        gov = Path('/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor')
        info['cpufreq_governor'] = gov.read_text().strip() if gov.exists() else None
        boost = Path('/sys/devices/system/cpu/intel_pstate/no_turbo')
        info['intel_no_turbo'] = boost.read_text().strip() if boost.exists() else None
    warnings = []
    if info['rustc_llvm_major'] and info['clang_llvm_major'] and info['rustc_llvm_major'] != info['clang_llvm_major']:
        warnings.append(f"rustc uses LLVM {info['rustc_llvm_major']} but clang uses LLVM "
                        f"{info['clang_llvm_major']}: C/C++ and Rust code generation differ by backend version")
    if any(v and v['dirty'] for v in info['git'].values()):
        warnings.append('uncommitted changes in a measured checkout')
    info['warnings'] = warnings
    return info


# ---------------------------------------------------------------- statistics

def bootstrap_ci(samples, statistic=statistics.median, iterations=4000, alpha=0.05, seed=0):
    """Percentile bootstrap interval for a statistic of independent samples."""
    xs = list(samples)
    if len(xs) < 2:
        v = statistic(xs)
        return (v, v)
    rnd = random.Random(seed)
    draws = sorted(statistic([rnd.choice(xs) for _ in xs]) for _ in range(iterations))
    lo = draws[int(math.floor(alpha / 2 * iterations))]
    hi = draws[min(iterations - 1, int(math.ceil((1 - alpha / 2) * iterations)) - 1)]
    return (lo, hi)


def ratio_ci(numerator, denominator, iterations=4000, alpha=0.05, seed=0):
    """Median ratio with a paired bootstrap interval.

    Samples are paired by position (the same interleaved round), so slow
    rounds affect both sides. Falls back to unpaired resampling when the
    lengths differ.
    """
    a, b = list(numerator), list(denominator)
    point = statistics.median(a) / statistics.median(b)
    rnd = random.Random(seed)
    draws = []
    for _ in range(iterations):
        if len(a) == len(b):
            idx = [rnd.randrange(len(a)) for _ in a]
            ra = [a[i] for i in idx]; rb = [b[i] for i in idx]
        else:
            ra = [rnd.choice(a) for _ in a]; rb = [rnd.choice(b) for _ in b]
        draws.append(statistics.median(ra) / statistics.median(rb))
    draws.sort()
    lo = draws[int(math.floor(alpha / 2 * iterations))]
    hi = draws[min(iterations - 1, int(math.ceil((1 - alpha / 2) * iterations)) - 1)]
    return point, lo, hi


def geomean(xs):
    xs = list(xs)
    return math.exp(statistics.mean(math.log(x) for x in xs))


def fmt_ci(point, lo, hi, unit='×'):
    return f'{point:.2f}{unit} [{lo:.2f}, {hi:.2f}]'


def interleaved(variants, rounds, seed):
    """Yields (round, variant) in a shuffled order per round."""
    rnd = random.Random(seed)
    for r in range(rounds):
        order = list(variants)
        rnd.shuffle(order)
        for v in order:
            yield r, v
