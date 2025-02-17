const inputService = require('./src/services/InputService');
const scraperService = require('./src/services/ScraperService');
const excelService = require('./src/services/ExcelService');
const { showTitle } = require('./src/utils/figlet');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function waitForEnter() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        console.log('\n\nProgramı kapatmak için Enter tuşuna basın...');
        rl.question('', () => {
            rl.close();
            resolve();
        });
    });
}

async function main() {
    try {
        // Başlık göster
        console.log(await showTitle('Google Maps'));
        // Kullanıcı girdilerini al
        const userInput = await inputService.getUserInput();

        // dev modunda mı ?
        if (process.env?.NODE_ENV === 'dev') {
            console.log('Arama kriterleri:', userInput);
        }

        try {
            // Scraper'ı başlat
            await scraperService.initialize();
        } catch (error) {
            if (error.message.includes('Chrome kurulu değil')) {
                console.error('\x1b[31m%s\x1b[0m', 'HATA: ' + error.message);
                await waitForEnter();
                return;
            }
            throw error;
        }

        try {
            // veriler toplanıyor...
            console.log('\x1b[33m%s\x1b[0m', 'Veriler toplanıyor...');

            // Google Maps'te arama yap
            await scraperService.searchBusinesses(userInput.location, userInput.keyword);

            // İşletmeleri topla
            const businesses = await scraperService.getBusinesses(
                userInput.limit,
                userInput.useFilter ? userInput.minRating : 0
            );

            // Kaydetme formatına göre işlem yap
            if (userInput.saveFormat !== 'none') {
                if (userInput.saveFormat === 'xlsx') {
                    // Excel'e kaydet
                    excelService.saveBusinessesToExcel(
                        businesses,
                        userInput.location,
                        userInput.keyword,
                        userInput.limit
                    );
                } else if (userInput.saveFormat === 'txt') {
                    // TXT olarak kaydet
                    excelService.saveBusinessesToTxt(
                        businesses,
                        userInput.location,
                        userInput.keyword,
                        userInput.limit
                    );
                }
            } else {
                console.log('\x1b[33m%s\x1b[0m', 'Sonuçlar kaydedilmedi (kullanıcı tercihi)');
            }

            // Tarayıcıyı kapat
            await scraperService.close();

            // mavi renkli yazdır
            console.log('\x1b[34m%s\x1b[0m', 'İşlem başarıyla tamamlandı!');
            
            // Kullanıcıdan Enter bekle
            await waitForEnter();
        } catch (error) {
            console.error('\x1b[31m%s\x1b[0m', 'İşlem sırasında hata:', error.message);
            await waitForEnter();
        }
    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', 'Bir hata oluştu:', error.message);
        
        // Tarayıcıyı kapatmaya çalış
        try {
            await scraperService.close();
        } catch {
            // Tarayıcı kapatma hatasını görmezden gel
        }
        await waitForEnter();
    }
}

main(); 