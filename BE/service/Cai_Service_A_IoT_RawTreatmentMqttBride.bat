@echo off
chcp 65001 >nul
title Cai Service - A_IoT_RawTreatmentMqttBride
cd /d "%~dp0"

rem ---- Tu nang quyen Admin (UAC) ----
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo  Can quyen Administrator. Dang mo cua so UAC, hay bam Yes...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo ==============================================
echo   CAI SERVICE: A_IoT_RawTreatmentMqttBride
echo   Node bridge Raw Treatment and UF - HiveMQ
echo ==============================================
echo.

rem ---- Tim node.exe (tu dong, chay duoc tren moi may) ----
set "NODEEXE="
for /f "delims=" %%i in ('where node 2^>nul') do if not defined NODEEXE set "NODEEXE=%%i"
if not defined NODEEXE if exist "C:\Program Files\nodejs\node.exe" set "NODEEXE=C:\Program Files\nodejs\node.exe"
if not defined NODEEXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODEEXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODEEXE (
    echo  KHONG TIM THAY node.exe.
    echo  Cai Node.js LTS truoc (https://nodejs.org) roi chay lai file nay.
    pause
    exit /b 1
)
echo  Node: %NODEEXE%

rem ---- Kiem tra da npm install chua ----
if not exist "..\node_modules\node-windows" (
    echo  THIEU node-windows. Mo terminal tai thu muc BE va chay: npm install
    pause
    exit /b 1
)

rem ---- Go service cu (neu co) roi cai moi ----
echo  Buoc 1/2: Go service cu (neu co)...
"%NODEEXE%" "%~dp0uninstall-service.cjs"
echo.
echo  Buoc 2/2: Cai service moi...
"%NODEEXE%" "%~dp0install-service.cjs"
if errorlevel 1 (
    echo.
    echo  ******************************************************
    echo  *  CO LOI XAY RA! Xem chi tiet loi o phia tren.     *
    echo  ******************************************************
    pause
    exit /b 1
)

echo.
echo  Log cua service nam trong: %~dp0logs
pause
exit /b 0
