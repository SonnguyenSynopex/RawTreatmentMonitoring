@echo off
chcp 65001 >nul
title Go Service - A_IoT_RawTreatmentMqttBride
cd /d "%~dp0"

rem ---- Tu nang quyen Admin (UAC) ----
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo  Can quyen Administrator. Dang mo cua so UAC, hay bam Yes...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo ==============================================
echo   GO SERVICE: A_IoT_RawTreatmentMqttBride
echo ==============================================
echo.

rem ---- Tim node.exe ----
set "NODEEXE="
for /f "delims=" %%i in ('where node 2^>nul') do if not defined NODEEXE set "NODEEXE=%%i"
if not defined NODEEXE if exist "C:\Program Files\nodejs\node.exe" set "NODEEXE=C:\Program Files\nodejs\node.exe"
if not defined NODEEXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODEEXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODEEXE (
    echo  KHONG TIM THAY node.exe.
    pause
    exit /b 1
)

echo  Dang go service (se stop truoc roi xoa)...
"%NODEEXE%" "%~dp0uninstall-service.cjs"

echo.
pause
exit /b 0
