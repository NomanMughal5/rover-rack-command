@echo off
title Autonomous Mobile Robot (AMR) Warehouse Command
color 0A

echo =========================================================================
echo       AUTONOMOUS MOBILE ROBOT (AMR) WAREHOUSE COMMAND SYSTEM
echo       Space-Time A* Pathfinding ^& Spatio-Temporal Reservation Ledger
echo =========================================================================
echo.

cd /d "%~dp0"

set "NODE_EXE=node"
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VisualStudio\NodeJs\node.exe" (
        set "PATH=C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VisualStudio\NodeJs;%PATH%"
    )
)

set "NODE_TLS_REJECT_UNAUTHORIZED=0"

echo [1/2] Launching Warehouse Simulation Server on http://localhost:3000 ...
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000/"

echo [2/2] Starting AMR Coordination Engine...
node ".\node_modules\vite\bin\vite.js" dev --port 3000

pause
