@echo off
title Google Maps Bot - Build Process

echo Google Maps Bot derleme işlemi başlatılıyor...

:: Node.js kontrolü
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js bulunamadi! Lutfen Node.js'i yukleyin: https://nodejs.org/
    pause
    exit /b 1
)

:: Gerekli klasörleri oluştur
if not exist "dist" mkdir dist

:: Paketleri yükle
echo Paketler yukleniyor...
call npm install
if %ERRORLEVEL% neq 0 (
    echo Paket yukleme hatasi!
    pause
    exit /b 1
)

:: Uygulamayı derle
echo Uygulama derleniyor...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Derleme hatasi!
    pause
    exit /b 1
)

:: İkonu ekle
echo Icon ekleniyor...
call npm run icon
if %ERRORLEVEL% neq 0 (
    echo Icon ekleme hatasi! Resource Hacker yuklu oldugundan emin olun.
    echo Resource Hacker'i buradan indirebilirsiniz: http://www.angusj.com/resourcehacker/
)

:: Gerekli dosyaları kopyala
echo Gerekli dosyalar kopyalaniyor...
xcopy /y README.md dist\
xcopy /y LICENSE dist\ 2>nul
if not exist "dist\output" mkdir dist\output

echo.
echo Derleme islemi tamamlandi!
echo Executable dosyasi dist klasoru altinda olusturuldu.
echo.
echo NOT: Programi calistirmak icin dist klasorundeki google-maps-bot.exe dosyasini calistirin.
echo.
pause 