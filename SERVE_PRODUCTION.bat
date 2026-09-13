@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN_TRYGC_HUB.ps1" -Mode serve
pause
