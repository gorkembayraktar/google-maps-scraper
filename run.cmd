@echo off
title Google Maps Bot

:: Node.js'in yüklü olup olmadığını kontrol et
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js bulunamadi! Lutfen Node.js'i yukleyin: https://nodejs.org/
    pause
    exit /b 1
)

:: Paketlerin yüklü olup olmadığını kontrol et
if not exist "node_modules" (
    echo Paketler yukleniyor...
    npm install
    if %ERRORLEVEL% neq 0 (
        echo Paket yukleme hatasi!
        pause
        exit /b 1
    )
)

:: Projeyi başlat
echo Bot baslatiliyor...
node index.js

pause 