@echo off
title BrowseGuard - Unified Sandbox Platform Launcher
color 0b

echo ======================================================================
echo 🛡️  LAUNCHING BROWSEGUARD UNIFIED PLATFORM
echo ======================================================================
echo.

set ROOT_DIR=%~dp0
set VENV_PYTHON=%ROOT_DIR%venv\Scripts\python.exe

if exist "%VENV_PYTHON%" (
    "%VENV_PYTHON%" "%ROOT_DIR%main.py"
) else (
    python "%ROOT_DIR%main.py"
)

pause
