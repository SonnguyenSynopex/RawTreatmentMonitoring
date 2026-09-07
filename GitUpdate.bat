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
rem ---- 4. Day len GitHub (tu dong thu lai 5 lan khi mang chap chon) ----
echo.
set /a TRY=0

:RETRY_PUSH
set /a TRY+=1
echo  Dang day len GitHub (lan %TRY%/5)...
echo  (Neu cua so dang nhap GitHub hien ra, dang nhap account SonnguyenSynopex)
git push
if not errorlevel 1 goto :PUSH_OK
if %TRY% geq 5 goto :LOI
echo  Mang loi ket noi - thu lai sau 4 giay...
timeout /t 4 /nobreak >nul
goto :RETRY_PUSH

:PUSH_OK
echo  Da day xong.
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
