import os
import sys
import subprocess

def main():
    is_win = sys.platform.startswith('win')
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, 'backend')
    
    # Try to locate uvicorn in backend/venv or root .venv
    possible_paths = [
        os.path.join(backend_dir, 'venv', 'Scripts' if is_win else 'bin', 'uvicorn.exe' if is_win else 'uvicorn'),
        os.path.join(base_dir, '.venv', 'Scripts' if is_win else 'bin', 'uvicorn.exe' if is_win else 'uvicorn'),
    ]
    
    uvicorn_path = ''
    for p in possible_paths:
        if os.path.exists(p):
            uvicorn_path = p
            break
            
    if not uvicorn_path:
        uvicorn_path = 'uvicorn' # Fallback to global
        
    print(f"[Backend Runner] Starting FastAPI backend using: {uvicorn_path}")
    
    cmd = [uvicorn_path, 'main:app', '--reload', '--port', '8000']
    
    # Run uvicorn
    try:
        # On Windows, shell=True can help resolve paths cleanly
        subprocess.run(cmd, cwd=backend_dir, shell=is_win, check=True)
    except KeyboardInterrupt:
        print("\n[Backend Runner] Stopping FastAPI backend...")
    except Exception as e:
        print(f"[Backend Runner] Error running backend: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
