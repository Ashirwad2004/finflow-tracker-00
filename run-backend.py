import os
import sys
import subprocess

def main():
    is_win = sys.platform.startswith('win')
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, 'backend')
    
    # Locate python executable in backend/venv or root .venv
    possible_python_paths = [
        os.path.join(backend_dir, 'venv', 'Scripts' if is_win else 'bin', 'python.exe' if is_win else 'python'),
        os.path.join(base_dir, '.venv', 'Scripts' if is_win else 'bin', 'python.exe' if is_win else 'python'),
    ]
    
    python_path = sys.executable
    for p in possible_python_paths:
        if os.path.exists(p):
            python_path = p
            break
            
    print(f"[Backend Runner] Starting FastAPI backend using: {python_path}")
    
    cmd = [python_path, '-m', 'uvicorn', 'src.main:app', '--reload', '--port', '8000', '--host', '0.0.0.0']
    
    # Run uvicorn
    try:
        subprocess.run(cmd, cwd=backend_dir, check=True)
    except KeyboardInterrupt:
        print("\n[Backend Runner] Stopping FastAPI backend...")
    except Exception as e:
        print(f"[Backend Runner] Error running backend: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()