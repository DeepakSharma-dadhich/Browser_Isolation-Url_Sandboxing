"""
BrowseGuard Unified One-Click Launcher
Starts the Express Backend, VM Agent Sandbox Worker, and Vite Frontend concurrently,
and automatically opens http://localhost:5173 in your default web browser.

Usage:
    python main.py
"""

import os
import sys
import time
import subprocess
import webbrowser
import signal
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
VM_AGENT_DIR = ROOT_DIR / "vm-agent"
VENV_PYTHON = ROOT_DIR / "venv" / "Scripts" / "python.exe"

if not VENV_PYTHON.exists():
    VENV_PYTHON = Path(sys.executable)

processes = []

def cleanup(*args):
    print("\n🛑 Shutting down BrowseGuard services...")
    for p in processes:
        try:
            p.terminate()
            p.wait(timeout=3)
        except Exception:
            try:
                p.kill()
            except Exception:
                pass
    print("✅ All services stopped.")
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

def main():
    print("=" * 65)
    print("🛡️  STARTING BROWSEGUARD UNIFIED PLATFORM (1-CLICK RUNNER)")
    print("=" * 65)

    # 1. Start Express Backend
    print("▶ [1/3] Starting Express Host Backend on port 3000...")
    backend_proc = subprocess.Popen(
        ["npm.cmd" if sys.platform == "win32" else "npm", "run", "dev"],
        cwd=str(BACKEND_DIR),
        shell=False
    )
    processes.append(backend_proc)

    # 2. Start VM Agent Queue Worker
    print("▶ [2/3] Starting VM Agent Sandbox Worker...")
    worker_proc = subprocess.Popen(
        [str(VENV_PYTHON), "worker.py"],
        cwd=str(VM_AGENT_DIR),
        shell=False
    )
    processes.append(worker_proc)

    # 3. Start Vite Frontend
    print("▶ [3/3] Starting Vite Frontend on port 5173...")
    frontend_proc = subprocess.Popen(
        ["npm.cmd" if sys.platform == "win32" else "npm", "run", "dev"],
        cwd=str(FRONTEND_DIR),
        shell=False
    )
    processes.append(frontend_proc)

    # Wait a moment for Vite & Express to bind ports
    print("\n⏳ Initializing services (waiting 3 seconds)...")
    time.sleep(3)

    target_url = "http://localhost:5173"
    print(f"🌐 Opening BrowseGuard Studio at: {target_url}")
    try:
        webbrowser.open(target_url)
    except Exception as e:
        print(f"Could not auto-open browser: {e}")

    print("\n" + "=" * 65)
    print("🎉 BROWSEGUARD IS FULLY OPERATIONAL!")
    print(f"👉 Web Studio:   {target_url}")
    print("👉 Backend API:  http://localhost:3000")
    print("👉 VM Worker:    Active & Polling PostgreSQL Queue")
    print("Press Ctrl+C at any time in this window to stop all services.")
    print("=" * 65 + "\n")

    try:
        while True:
            time.sleep(1)
            # Check if any process died unexpectedly
            for p in processes:
                if p.poll() is not None:
                    print(f"⚠️ Process {p.args} exited with code {p.returncode}")
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    main()
