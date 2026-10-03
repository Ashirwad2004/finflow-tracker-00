import sys
import json
from pathlib import Path

# Add apps/api to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "apps" / "api"))

from src.main import app

def generate():
    spec = app.openapi()
    out_path = Path(__file__).resolve().parent / "openapi.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(spec, f, indent=2)
    print(f"OpenAPI spec generated at {out_path} with {len(spec.get('paths', {}))} endpoints and {len(spec.get('components', {}).get('schemas', {}))} schemas.")

if __name__ == "__main__":
    generate()
