"""Ask ordinary core admission to bind a proposed image's feature version.

A transformation may introduce local bindings/control into a legacy image. Its
old transport version then becomes stale. These bounded untrusted guesses grant
no semantics or proof authority: only check-core's complete validation accepts.
Unknown future versions and all non-version errors fail closed.
"""
import copy
from pathlib import Path
import subprocess

from ink_knowledge import canonical


def write_checked_image(core, path, compiler):
    candidate = copy.deepcopy(core)
    versions = list(dict.fromkeys([core['semantics'], *[
        f'ink-executable-core-v{version}' for version in range(1, 17)]]))
    for version in versions:
        candidate['semantics'] = version
        Path(path).write_bytes(canonical(candidate))
        result = subprocess.run([str(Path(compiler).resolve()), 'check-core', str(path)],
                                capture_output=True, timeout=180)
        if result.returncode == 0:
            return candidate
        if result.stderr.decode(errors='replace').strip() != 'error: incorrect executable semantics version':
            raise subprocess.CalledProcessError(result.returncode, result.args,
                                                output=result.stdout, stderr=result.stderr)
    raise ValueError('candidate requires an unsupported executable feature version')
