const rcedit = require('rcedit');
const path = require('path');

const exePath = path.join(__dirname, '../dist/google-maps-bot.exe');
const iconPath = path.join(__dirname, '../src/assets/proje.ico');

async function addIcon() {
    try {
        // Önce sadece ikonu dene
        await rcedit(exePath, {
            icon: iconPath
        });
        console.log('✅ İkon başarıyla eklendi!');

        // İkon başarılı olduysa metadata'yı dene
        try {
            await rcedit(exePath, {
                'version-string': {
                    ProductName: 'Google Maps Bot',
                    FileDescription: 'Google Maps İşletme Bilgileri Toplama Aracı',
                    CompanyName: 'Google Maps Bot',
                    LegalCopyright: '© 2024 Google Maps Bot',
                    FileVersion: '1.0.0',
                    ProductVersion: '1.0.0'
                }
            });
            console.log('✅ Program bilgileri başarıyla eklendi!');
        } catch (metadataError) {
            console.log('⚠️ Program bilgileri eklenemedi, sadece ikon eklendi.');
            console.error('Metadata hatası:', metadataError);
        }
    } catch (error) {
        console.error('❌ İkon eklenirken hata oluştu:', error);
        process.exit(1); // Hata durumunda backup'a dönmek için
    }
}

addIcon(); 