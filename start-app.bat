@echo off
chcp 65001 >nul
title Timeout Quiz Studio 3D - Desktop App

echo ============================================================
echo   TIMEOUT QUIZ STUDIO 3D - UNTHROTTLED DESKTOP APP
echo   Phien ban tang toc phan cung GPU doc lap
echo ============================================================
echo.

cd /d "%~dp0timeout-quiz"

echo [1/3] Kiem tra may chu noi bo (Next.js & Socket.IO)...
powershell -Command "$client = New-Object System.Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', 3000); exit 0 } catch { exit 1 }" >nul 2>&1

if %errorlevel% neq 0 (
    echo [2/3] May chu chua chay, dang khoi dong may chu ngam...
    start "Timeout Quiz Server" /min cmd /c "node server.js"
    echo     Cho may chu khoi tao trong giay lat...
    timeout /t 3 /nobreak >nul
) else (
    echo [2/3] May chu dang san sang tai cong 3000!
)

echo [3/3] Dang khoi chay Desktop App voi GPU Hardware Acceleration...
echo     Nhan F11 de bat/tat toan man hinh (Fullscreen).
echo.

npx electron electron/main.js

echo.
echo Ung dung da dong.
