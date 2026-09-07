@echo off
chcp 65001 >nul
title Git Update - RawTreatmentMonitoring
cd /d "%~dp0"

echo ==============================================
echo   GIT UPDATE  -  RawTreatment Monitoring
echo   Thu muc: "%cd%"
echo ==============================================
echo.

rem ---- 1. Them tat ca thay doi ----
git add -A
if errorlevel 1 goto :LOI

rem ---- 2. Neu khong co gi thay doi thi bo qua commit ----
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo  Khong co file nao thay doi - bo qua buoc commit.
    goto :PUSH
)

rem ---- 3. Nhap noi dung commit ----
set "MSG="
set /p MSG="Noi dung commit (Enter = tu dong theo gio hien tai): "
if "%MSG%"=="" set "MSG=update %date% %time%"
git commit -m "%MSG%"
if errorlevel 1 goto :LOI

:PUSH
rem ---- 4. Day len GitHub ----
echo.
echo  Dang day len GitHub...
echo  (Neu cua so dang nhap GitHub hien ra, dang nhap account SonnguyenSynopex)
git push
if errorlevel 1 goto :LOI

echo.
echo  ==============================================
echo    THANH CONG! Da cap nhat len GitHub.
echo  ==============================================
pause
exit /b 0

:LOI
echo.
echo  ******************************************************
echo  *  CO LOI XAY RA! Xem chi tiet loi o phia tren.     *
echo  ******************************************************
pause
exit /b 1
