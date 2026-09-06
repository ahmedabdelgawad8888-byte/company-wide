@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN_TRYGC_HUB.ps1" -Mode dev
if errorlevel 1 pause
