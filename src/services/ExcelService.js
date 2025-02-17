const XLSX = require('xlsx');
const config = require('../config/config');
const path = require('path');
const fs = require('fs');
const os = require('os');

class ExcelService {
    constructor() {
        this.workbook = XLSX.utils.book_new();
        // İşletim sistemine göre Belgeler klasörünü belirle
        const documentsPath = this.getDocumentsPath();
        this.outputDir = path.join(documentsPath, 'GoogleMapsBot', 'output');
        this.desktopShortcut = path.join(os.homedir(), 'Desktop', 'GoogleMapsBot Çıktıları');
        this.ensureOutputDirExists();
        this.createDesktopShortcut();
    }

    getDocumentsPath() {
        switch (process.platform) {
            case 'win32':
                return path.join(os.homedir(), 'Documents');
            case 'darwin': // macOS
                return path.join(os.homedir(), 'Documents');
            case 'linux':
                // XDG_DOCUMENTS_DIR değerini kontrol et, yoksa varsayılan kullan
                const xdgConfig = path.join(os.homedir(), '.config', 'user-dirs.dirs');
                if (fs.existsSync(xdgConfig)) {
                    try {
                        const config = fs.readFileSync(xdgConfig, 'utf-8');
                        const match = config.match(/XDG_DOCUMENTS_DIR="([^"]+)"/);
                        if (match) {
                            return match[1].replace('$HOME', os.homedir());
                        }
                    } catch (error) {
                        console.error('Linux belgeler klasörü okuma hatası:', error);
                    }
                }
                return path.join(os.homedir(), 'Documents');
            default:
                return path.join(os.homedir(), 'Documents');
        }
    }

    ensureOutputDirExists() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    createDesktopShortcut() {
        try {
            const desktopPath = path.join(os.homedir(), 'Desktop');
            // Windows için .bat dosyası
            if (process.platform === 'win32' && !fs.existsSync(this.desktopShortcut + '.bat')) {
                const shortcutContent = `@echo off\nexplorer "${this.outputDir}"`;
                fs.writeFileSync(this.desktopShortcut + '.bat', shortcutContent);
            }
            // Linux için .desktop dosyası
            else if (process.platform === 'linux' && !fs.existsSync(path.join(desktopPath, 'googlemapsbot-output.desktop'))) {
                const shortcutContent = `[Desktop Entry]
Type=Application
Name=GoogleMapsBot Çıktıları
Exec=xdg-open "${this.outputDir}"
Icon=folder
Terminal=false`;
                fs.writeFileSync(path.join(desktopPath, 'googlemapsbot-output.desktop'), shortcutContent);
                // Linux'ta .desktop dosyasına çalıştırma izni ver
                fs.chmodSync(path.join(desktopPath, 'googlemapsbot-output.desktop'), '755');
            }
            // macOS için .command dosyası
            else if (process.platform === 'darwin' && !fs.existsSync(this.desktopShortcut + '.command')) {
                const shortcutContent = `#!/bin/bash\nopen "${this.outputDir}"`;
                fs.writeFileSync(this.desktopShortcut + '.command', shortcutContent);
                // macOS'ta .command dosyasına çalıştırma izni ver
                fs.chmodSync(this.desktopShortcut + '.command', '755');
            }
            console.log('\x1b[32m%s\x1b[0m', 'Masaüstüne kısayol oluşturuldu!');
        } catch (error) {
            console.error('Kısayol oluşturulurken hata:', error);
        }
    }

    getOutputPath() {
        const now = new Date();
        const dateStr = now.toLocaleDateString('tr-TR').replace(/\./g, '_');
        const datePath = path.join(this.outputDir, dateStr);
        
        if (!fs.existsSync(datePath)) {
            fs.mkdirSync(datePath, { recursive: true });
        }
        
        return datePath;
    }

    generateFileName(location, keyword, limit, extension) {
        const now = new Date();
        const time = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }).replace(':', '_');
        
        // Türkçe karakterleri değiştir ve küçük harfe çevir
        const sanitizedLocation = location.toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/\s+/g, '-');

        const sanitizedKeyword = keyword.toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/\s+/g, '-');

        return `${sanitizedLocation}-${sanitizedKeyword}-${limit}-${time}.${extension}`;
    }

    saveBusinessesToTxt(businesses, location, keyword, limit) {
        const outputPath = this.getOutputPath();
        const fileName = this.generateFileName(location, keyword, limit, 'txt');
        const filePath = path.join(outputPath, fileName);
        const absolutePath = path.resolve(filePath);

        const content = businesses.map(business => {
            return `İşletme Adı: ${business.name}
Adres: ${business.address}
Telefon: ${business.phone}
Website: ${business.website}
İşletme Türü: ${business.type}
Puan: ${business.rating}
Yorum Sayısı: ${business.reviewCount}
Hakkında: ${business.description}
Çalışma Saatleri: ${business.workingHours}
Fotoğraf: ${business.photoUrl}
Erişilebilirlik: ${business.features.accessibility.join(', ')}
Hizmet Seçenekleri: ${business.features.serviceOptions.join(', ')}
Sunulan Olanaklar: ${business.features.amenities.join(', ')}
Ödeme Yöntemleri: ${business.features.payments.join(', ')}
Otopark: ${business.features.parking.join(', ')}
----------------------------------------`;
        }).join('\n\n');

        fs.writeFileSync(filePath, content, 'utf8');
        console.log('\x1b[32m%s\x1b[0m', 'TXT dosyası kaydedildi!');
        console.log('\x1b[36m%s\x1b[0m', 'TXT dosya konumu:', absolutePath);
    }

    saveBusinessesToExcel(businesses, location, keyword, limit) {
        const outputPath = this.getOutputPath();
        
        // Excel dosyasını oluştur
        const worksheet = XLSX.utils.json_to_sheet(
            businesses.map(business => business.toJSON())
        );

        XLSX.utils.book_append_sheet(
            this.workbook,
            worksheet,
            config.excel.sheetName
        );

        // Excel dosyasını kaydet
        const excelFileName = this.generateFileName(location, keyword, limit, 'xlsx');
        const excelFilePath = path.join(outputPath, excelFileName);
        const absoluteExcelPath = path.resolve(excelFilePath);
        
        XLSX.writeFile(this.workbook, excelFilePath);
        console.log('\x1b[32m%s\x1b[0m', 'Excel dosyası kaydedildi!');
        console.log('\x1b[36m%s\x1b[0m', 'Excel dosya konumu:', absoluteExcelPath);

        // TXT dosyasını kaydet
        this.saveBusinessesToTxt(businesses, location, keyword, limit);
    }
}

module.exports = new ExcelService(); 