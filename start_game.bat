@echo off
title Vo Lam Idle - Game Server
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% == 0 (
    echo [INFO] Dang khoi dong Node.js Server...
    node "%~dp0server.js"
) else (
    echo [INFO] Dang khoi dong PowerShell Server...
    powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
)
pause
