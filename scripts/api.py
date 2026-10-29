"""Run the canonical API workspace with its installed Python environment."""

from pathlib import Path
import os
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "apps" / "api"


def main() -> int:
    command, *arguments = sys.argv[1:] or ["dev"]
    if command not in {"dev", "test"}:
        print("Usage: python scripts/api.py [dev|test] [arguments...]", file=sys.stderr)
        return 2

    # Prefer an explicitly activated virtual environment, then workspace installs.
    executable = sys.executable
    if sys.prefix == sys.base_prefix:
        directory, binary = ("Scripts", "python.exe") if os.name == "nt" else ("bin", "python")
        for environment in (API / ".venv", API / "venv", ROOT / ".venv"):
            candidate = environment / directory / binary
            if candidate.is_file():
                executable = str(candidate)
                break

    module_arguments = (
        ["uvicorn", "src.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"]
        if command == "dev"
        else ["pytest", "tests", "-v"]
    )
    environment = os.environ.copy()
    environment["PYTHONPATH"] = os.pathsep.join(
        filter(None, [str(API), environment.get("PYTHONPATH")])
    )
    try:
        return subprocess.run(
            [executable, "-m", *module_arguments, *arguments], cwd=API, env=environment
        ).returncode
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
