const puppeteer = require('puppeteer');
const puppeteerCore = require('puppeteer-core');
const config = require('../config/config');
const Business = require('../models/Business');
const checkChromeInstallation = require('../utils/browserCheck');

class ScraperService {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isClosing = false;
        this.setupProcessHandlers();
    }

    setupProcessHandlers() {
        const cleanup = async () => {
            if (this.isClosing) return;
            this.isClosing = true;
            console.log('\nProgram kapatılıyor...');
            try {
                if (this.browser) {
                    const pages = await this.browser.pages();
                    await Promise.all(pages.map(page => page.close()));
                    await this.browser.close();
                    console.log('Tarayıcı kapatıldı.');
                }
            } catch (error) {
                console.error('Tarayıcı kapatılırken hata:', error);
            }
            process.exit(0);
        };

        // Windows için özel process kill
        if (process.platform === 'win32') {
            const rl = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.on('SIGINT', () => {
                process.emit('SIGINT');
            });
        }

        // Process handlers
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('SIGBREAK', cleanup);
        process.on('uncaughtException', async (error) => {
            console.error('Beklenmedik hata:', error);
            await cleanup();
        });
        process.on('unhandledRejection', async (error) => {
            console.error('İşlenmeyen Promise hatası:', error);
            await cleanup();
        });
    }

    async initialize() {
        try {
            // Chrome kurulum kontrolü
            const chromeCheck = checkChromeInstallation();
            
            if (chromeCheck.isInstalled) {
                // Sistem Chrome'unu kullan
                this.browser = await puppeteerCore.launch({
                    ...config.browser,
                    executablePath: chromeCheck.executablePath
                });
            } else if (config.browser.allowChromiumDownload) {
                console.log('\x1b[33m%s\x1b[0m', 'Chrome bulunamadı. Chromium indiriliyor...');
                try {
                    // Puppeteer'in kendi Chromium'unu indir ve kullan
                    const browserFetcher = require('puppeteer').createBrowserFetcher();
                    const revisionInfo = await browserFetcher.download();
                    
                    if (revisionInfo) {
                        console.log('\x1b[32m%s\x1b[0m', `Chromium başarıyla indirildi: ${revisionInfo.folderPath}`);
                        this.browser = await puppeteer.launch({
                            ...config.browser,
                            executablePath: revisionInfo.executablePath
                        });
                    } else {
                        throw new Error('Chromium indirilemedi.');
                    }
                } catch (downloadError) {
                    console.error('\x1b[31m%s\x1b[0m', 'Chromium indirme hatası:', downloadError.message);
                    throw new Error('Chromium indirme işlemi başarısız oldu. Lütfen Google Chrome\'u manuel olarak yükleyin.');
                }
            } else {
                throw new Error('Chrome kurulu değil ve Chromium indirmeye izin verilmiyor. Lütfen Google Chrome\'u yükleyin: https://www.google.com/chrome/');
            }

            this.page = await this.browser.newPage();

        } catch (error) {
            if (error.message.includes('Chrome kurulu değil')) {
                throw error;
            }
            throw new Error('Tarayıcı başlatılırken bir hata oluştu: ' + error.message);
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async searchBusinesses(location, keyword) {
        const searchQuery = `${keyword} ${location}`;
        const url = `${config.baseUrl}/search/${encodeURIComponent(searchQuery)}`;
        await this.page.goto(url);
        
        // Google Maps'in yüklenmesini bekle
        await this.page.waitForSelector(config.selectors.businessList, { timeout: 10000 });
        
        // Sayfanın tam yüklenmesi için biraz bekle
        await this.wait(2000);
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async scrollAndWaitForResults(limit) {
        let previousHeight = 0;
        let currentHeight = 0;
        let noChangeCount = 0;
        const maxNoChange = 3;
        let currentCount = 0;

        // Eğer zaten yeterli sayıda işletme varsa, scroll yapmaya gerek yok
        currentCount = await this.page.evaluate(() => {
            return document.querySelectorAll('div.Nv2PK').length;
        });

        if (currentCount >= limit + 2) {
            if(process.env?.NODE_ENV === 'dev'){
                console.log(`Zaten yeterli sayıda işletme var (${currentCount}), scroll işlemi atlanıyor.`);
            }
            return currentCount;
        }

        while (noChangeCount < maxNoChange) {
            previousHeight = currentHeight;

            // Mevcut işletme sayısını kontrol et
            currentCount = await this.page.evaluate(() => {
                return document.querySelectorAll('div.Nv2PK').length;
            });

            if(process.env?.NODE_ENV === 'dev'){
                console.log(`Scroll sonrası bulunan işletme sayısı: ${currentCount}`);
            }

            // Eğer yeterli sayıda işletme bulunduysa scroll'u durdur
            if (currentCount >= limit + 2) {
                if(process.env?.NODE_ENV === 'dev'){
                    console.log(`Hedeflenen işletme sayısına ulaşıldı (${limit}), scroll işlemi durduruluyor.`);
                }
                break;
            }

            // Scroll işlemi
            await this.page.evaluate(() => {
                const container = document.querySelector('.m6QErb[aria-label]');
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            });

            // Yeni sonuçların yüklenmesi için bekle
            await this.wait(1000);

            // Yeni yüksekliği kontrol et
            currentHeight = await this.page.evaluate(() => {
                const container = document.querySelector('.m6QErb[aria-label]');
                return container ? container.scrollHeight : 0;
            });

            // Yükseklik değişmediyse sayacı artır
            if (previousHeight === currentHeight) {
                noChangeCount++;
                if(process.env?.NODE_ENV === 'dev'){
                    if (noChangeCount === maxNoChange) {
                        console.log('Daha fazla sonuç yüklenemedi, scroll işlemi durduruluyor.');
                    }
                }
            } else {
                noChangeCount = 0; // Değişiklik olduysa sayacı sıfırla
            }
        }

        return currentCount;
    }

    async getBusinessDetails() {
        try {
            // Detay panelinin yüklenmesini bekle
            await this.page.waitForSelector('.m6QErb[role="main"]', { timeout: 5000 });
            
            const details = await this.page.evaluate(async () => {
                const info = {
                    address: '',
                    phone: '',
                    website: '',
                    type: '',
                    coordinates: '',
                    description: '',
                    workingHours: '',
                    photoUrl: '',
                    features: {
                        accessibility: [],
                        serviceOptions: [],
                        amenities: [],
                        payments: [],
                        parking: []
                    }
                };

                try {
                    // Adres bilgisi
                    const addressButton = document.querySelector('button[data-item-id="address"]');
                    if (addressButton) {
                        info.address = addressButton.querySelector('.Io6YTe')?.textContent?.trim() || '';
                        console.log('Adres bulundu:', info.address);
                    }

                    // Telefon bilgisi
                    const phoneButton = document.querySelector('button[data-item-id^="phone:tel"]');
                    if (phoneButton) {
                        info.phone = phoneButton.querySelector('.Io6YTe')?.textContent?.trim() || '';
                        console.log('Telefon bulundu:', info.phone);
                    }

                    // Website bilgisi
                    const websiteLink = document.querySelector('a[data-item-id="authority"]');
                    if (websiteLink) {
                        info.website = websiteLink.querySelector('.Io6YTe')?.textContent?.trim() || '';
                        console.log('Website bulundu:', info.website);
                    }

                    // İşletme türü
                    const typeElement = document.querySelector('button.DkEaL');
                    if (typeElement) {
                        info.type = typeElement.textContent.trim();
                        console.log('Tür bulundu:', info.type);
                    }

                    // Çalışma saatleri
                    const hoursTable = document.querySelector('table.eK4R0e');
                    if (hoursTable) {
                        const hours = [];
                        const rows = hoursTable.querySelectorAll('tr.y0skZc');
                        rows.forEach(row => {
                            const day = row.querySelector('.ylH6lf div')?.textContent?.trim();
                            const time = row.querySelector('.mxowUb')?.textContent?.trim();
                            if (day && time) {
                                hours.push(`${day}: ${time}`);
                            }
                        });
                        info.workingHours = hours.join('\n');
                        console.log('Çalışma saatleri bulundu:', info.workingHours);
                    }

                    // Hizmet seçenekleri
                    const serviceOptions = document.querySelectorAll('.E0DTEd .LTs0Rc');
                    serviceOptions.forEach(option => {
                        const text = option.textContent.trim();
                        if (text) {
                            info.features.serviceOptions.push(text);
                        }
                    });
                    console.log('Hizmet seçenekleri:', info.features.serviceOptions);

                    // Hakkında sekmesindeki özellikler
                    const aboutTab = Array.from(document.querySelectorAll('button[role="tab"]')).find(
                        tab => tab.textContent.includes('Hakkında')
                    );
                    if (aboutTab) {
                        aboutTab.click();
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        const sections = document.querySelectorAll('.iP2t7d');
                        sections.forEach(section => {
                            const title = section.querySelector('.iL3Qke')?.textContent?.trim();
                            const features = Array.from(section.querySelectorAll('.iNvpkb span:not(.f5BGzb)'))
                                .map(span => span.textContent.trim())
                                .filter(text => text);

                            if (title && features.length > 0) {
                                switch (title) {
                                    case 'Erişilebilirlik':
                                        info.features.accessibility = features;
                                        break;
                                    case 'Hizmet seçenekleri':
                                        info.features.serviceOptions = features;
                                        break;
                                    case 'Sunulan olanaklar':
                                        info.features.amenities = features;
                                        break;
                                    case 'Ödeme':
                                        info.features.payments = features;
                                        break;
                                    case 'Otopark':
                                        info.features.parking = features;
                                        break;
                                }
                            }
                        });

                        // Genel bakış sekmesine geri dön
                        const overviewTab = Array.from(document.querySelectorAll('button[role="tab"]')).find(
                            tab => tab.textContent.includes('Genel Bakış')
                        );
                        if (overviewTab) {
                            overviewTab.click();
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }

                    // Fotoğraf
                    const photoElement = document.querySelector('.ZKCDEc img');
                    if (photoElement) {
                        info.photoUrl = photoElement.getAttribute('src') || '';
                        console.log('Fotoğraf bulundu:', info.photoUrl);
                    }

                    return info;
                } catch (e) {
                    console.error('Detay çekerken hata:', e);
                    return info;
                }
            });

            return details;
        } catch (error) {
            console.error('Detay bilgileri alınırken hata:', error.message);
            return {
                address: '',
                phone: '',
                website: '',
                type: '',
                coordinates: '',
                description: '',
                workingHours: '',
                photoUrl: '',
                features: {
                    accessibility: [],
                    serviceOptions: [],
                    amenities: [],
                    payments: [],
                    parking: []
                }
            };
        }
    }

    async waitForPageLoad() {
        try {
            // Sayfanın tamamen yüklenmesini bekle
            await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
            // Sayfanın hazır olmasını bekle
            await this.page.waitForFunction(() => document.readyState === 'complete', { timeout: 30000 });
            return true;
        } catch (error) {
            console.log('Sayfa yükleme hatası:', error.message);
            return false;
        }
    }

    async getBusinesses(limit, minRating = 0) {
        const businesses = [];
        const processedNames = new Set();
        let loadedCount = 0;
        let retryCount = 0;
        const maxRetries = 3;

        try {
            // İlk scroll işlemi
            const totalFound = await this.scrollAndWaitForResults(limit);
            console.log(`Toplam ${totalFound} işletme bulundu, ${limit} tanesi işlenecek.`);
            let counter = 1;

            // İşletmeleri işle
            for (let i = 0; i < totalFound && businesses.length < limit; i++) {
                try {
                    // Ana listeye dönüldüğünden emin ol
                    await this.page.waitForSelector('div.Nv2PK', { timeout: 30000 });
                    await this.wait(2000); // Bekleme süresini artırdık

                    // Her seferinde güncel işletme listesini al
                    const currentBusiness = await this.page.evaluate((index) => {
                        const items = document.querySelectorAll('div.Nv2PK');
                        const item = items[index];
                        if (!item) return null;

                        return {
                            name: item.querySelector('.qBF1Pd')?.textContent?.trim() || '',
                            rating: item.querySelector('.MW4etd')?.textContent?.trim() || '',
                            reviewCount: item.querySelector('.UY7F9')?.textContent?.trim().replace(/[()]/g, '') || ''
                        };
                    }, i);

                    if (!currentBusiness || !currentBusiness.name) {
                        console.log(`${i + 1}. işletme için bilgi bulunamadı, sayfayı yenilemeyi deniyorum...`);
                        await this.page.reload();
                        await this.waitForPageLoad();
                        await this.page.waitForSelector('div.Nv2PK', { timeout: 30000 });
                        await this.scrollAndWaitForResults(limit);
                        i--;
                        continue;
                    }

                    // İşletme daha önce işlendiyse atla
                    if (processedNames.has(currentBusiness.name)) {
                        if(process.env?.NODE_ENV === 'dev'){
                            console.log(`${currentBusiness.name} daha önce işlenmiş, atlıyorum...`);
                        }
                        continue;
                    }

                    const business = new Business();
                    business.name = currentBusiness.name;
                    business.rating = currentBusiness.rating;
                    business.reviewCount = currentBusiness.reviewCount;
                    if (process.env?.NODE_ENV === 'dev') {
                        console.log(`İşleniyor: ${business.name}`);
                    }else{
                        console.log(`İşleniyor: ${business.name}`);
                    }

                    // Rating kontrolü
                    if (business.rating && parseFloat(business.rating) < minRating) {
                        continue;
                    }

                    try {
                        // İşletme kartını seç
                        const businessCards = await this.page.$$('div.Nv2PK');
                        const card = businessCards[i];
                        
                        if (!card) {
                            throw new Error('İşletme kartı bulunamadı');
                        }

                        // Kartı görünür yap
                        await this.page.evaluate((index) => {
                            const items = document.querySelectorAll('div.Nv2PK');
                            if (items[index]) {
                                items[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }, i);

                        // Kısa bir bekleme
                        await this.wait(2000);

                        // Karta tıkla
                        await card.click();
                        if (config.debug) console.log('İşletme kartına tıklandı');

                        // Detay panelinin yüklenmesini bekle
                        await this.page.waitForSelector('.m6QErb[role="main"]', { timeout: 30000 });
                        if (config.debug) console.log('Detay paneli yüklendi');

                        // Detay butonlarının yüklenmesini bekle
                        await this.page.waitForSelector('button.CsEnBe', { timeout: 30000 });
                        if (config.debug) console.log('Detay butonları yüklendi');

                        // Detayların yüklenmesi için bekle
                        await this.wait(3000);

                        // Detay bilgilerini çek
                        const details = await this.getBusinessDetails();
                        
                        // Detayları business nesnesine aktar
                        business.address = details.address;
                        business.phone = details.phone;
                        business.website = details.website;
                        business.type = details.type;
                        business.description = details.description;
                        business.workingHours = details.workingHours;
                        business.photoUrl = details.photoUrl;
                        business.features = details.features;
                        if (details.coordinates) {
                            const [lat, lng] = details.coordinates.split(',');
                            business.coordinates = { latitude: lat, longitude: lng };
                        }

                        businesses.push(business);
                        processedNames.add(business.name);
                        loadedCount++;

                        if(process.env?.NODE_ENV !== 'dev'){
                            // yeşil renkli yazdır
                            console.log(`\x1b[32m%s\x1b[0m`, `✅ ${counter}.${business.name} - Puan: ${business.rating}  - Yorum: ${business.reviewCount} - Telefon: ${business.phone} - Website: ${business.website} - Adres: ${business.address} `);
                            counter++;
                        }

                        // Eğer limit sayısına ulaştıysak döngüyü sonlandır
                        if (businesses.length >= limit) {
                            console.log(`Hedef sayıya (${limit}) ulaşıldı.`);
                            break;
                        }

                        // Liste görünümüne dön
                        if (config.debug) console.log('Ana listeye dönülüyor...');
                        
                        // Farklı geri butonu seçicilerini dene
                        const backButtonSelectors = [
                            'button.hYBOP[jsaction*="omnibox.back"]',
                            'button[jsaction*="omnibox.back"]',
                            'button[aria-label="Geri"]',
                            'button.hYBOP.FeqX4d[jsaction*="omnibox.back"]'
                        ];

                        let backButton = null;
                        for (const selector of backButtonSelectors) {
                            backButton = await this.page.$(selector);
                            if (backButton) {
                                if(process.env?.NODE_ENV === 'dev'){
                                    console.log(`Geri butonu bulundu: ${selector}`);
                                }
                                break;
                            }
                        }

                        if (backButton) {
                            await backButton.click();
                            await this.waitForPageLoad();
                            await this.page.waitForSelector('div.Nv2PK', { timeout: 30000 });
                            if (config.debug) console.log('Ana listeye dönüş başarılı');
                        } else {
                            console.log('Geri butonu bulunamadı, alternatif yöntem kullanılıyor...');
                            await this.page.goBack();
                            await this.waitForPageLoad();
                            await this.page.waitForSelector('div.Nv2PK', { timeout: 30000 });
                        }

                    } catch (clickError) {
                        console.error(`İşletme detayları alınırken hata: ${clickError.message}`);
                        try {
                            console.log('Kurtarma işlemi başlatılıyor...');
                            // Önce sayfayı yenilemeyi dene
                            await this.page.reload();
                            await this.waitForPageLoad();
                            await this.page.waitForSelector('div.Nv2PK', { timeout: 30000 });
                            await this.scrollAndWaitForResults(limit);
                            i--;
                        } catch (error) {
                            console.error('Kurtarma işlemi başarısız:', error.message);
                            // Son çare olarak yeni bir arama yap
                            await this.searchBusinesses(userInput.location, userInput.keyword);
                            await this.scrollAndWaitForResults(limit);
                            i = 0; // Baştan başla
                        }
                        continue;
                    }

                } catch (error) {
                    console.error(`İşletme işlenirken hata: ${error.message}`);
                    try {
                        await this.page.reload();
                        await this.waitForPageLoad();
                        await this.page.waitForSelector('div.Nv2PK', { timeout: 30000 });
                        await this.scrollAndWaitForResults(limit);
                        i--;
                    } catch (reloadError) {
                        console.error('Sayfa yenileme başarısız:', reloadError.message);
                        // Son çare olarak yeni bir arama yap
                        await this.searchBusinesses(userInput.location, userInput.keyword);
                        await this.scrollAndWaitForResults(limit);
                        i = 0; // Baştan başla
                    }
                    continue;
                }
            }

        } catch (error) {
            console.error(`İşletme listesi işlenirken hata: ${error.message}`);
            retryCount++;
        }

        return businesses;
    }
}

module.exports = new ScraperService();