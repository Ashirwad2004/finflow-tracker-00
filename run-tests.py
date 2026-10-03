import os
import sys
import subprocess

def main():
    is_win = sys.platform.startswith('win')
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, 'apps', 'api')
    if not os.path.exists(backend_dir):
        backend_dir = os.path.join(base_dir, 'backend')
    
    possible_python_paths = [
        os.path.join(backend_dir, 'venv', 'Scripts' if is_win else 'bin', 'python.exe' if is_win else 'python'),
        os.path.join(base_dir, '.venv', 'Scripts' if is_win else 'bin', 'python.exe' if is_win else 'python'),
    ]
    
    python_path = sys.executable
    for p in possible_python_paths:
        if os.path.exists(p):
            python_path = p
            break
            
    cmd = [python_path, '-m', 'pytest', os.path.join(backend_dir, 'tests'), '-v'] + sys.argv[1:]
    
    env = os.environ.copy()
    src_dir = os.path.join(backend_dir, 'src')
    env['PYTHONPATH'] = src_dir + os.pathsep + backend_dir + (os.pathsep + env.get('PYTHONPATH', ''))

    res = subprocess.run(cmd, cwd=backend_dir, env=env)
    sys.exit(res.returncode)

if __name__ == '__main__':
    main()
