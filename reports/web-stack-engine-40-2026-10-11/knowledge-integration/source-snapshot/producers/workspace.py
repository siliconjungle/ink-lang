"""Locations for untrusted proof producers; no compiler dependency is imported."""
import os
from pathlib import Path

STORE_ROOT = Path(__file__).resolve().parents[1]
KNOWLEDGE_ROOT = STORE_ROOT / "research"

def _core_root():
    if 'INK_CORE_ROOT' in os.environ:
        return Path(os.environ['INK_CORE_ROOT']).expanduser().resolve()
    for candidate in (STORE_ROOT.parent, Path.cwd()):
        if (candidate / 'Cargo.toml').is_file() and (candidate / 'core/src/logic.rs').is_file():
            return candidate.resolve()
    # Pure producers and --help work in a standalone checkout. Commands needing
    # the checker should pass --compiler or set INK_COMPILER / INK_CORE_ROOT.
    return Path.cwd().resolve()

CORE_ROOT = _core_root()

def compiler_path(relative='target/debug/ink'):
    value = os.environ.get('INK_COMPILER')
    return Path(value).expanduser().resolve() if value else CORE_ROOT / relative
