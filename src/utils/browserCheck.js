const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');

function checkChromeInstallation() {
    try {
        const platform = os.platform();
        let chromePath = null;

        switch (platform) {
            case 'win32':
                // Windows için Chrome kontrol yolları
                const paths = [
                    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                    `${os.homedir()}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`
                ];
                
                for (const path of paths) {
                    if (fs.existsSync(path)) {
                        chromePath = path;
                        break;
                    }
                }
                break;

            case 'darwin':
                // macOS için Chrome kontrolü
                const macPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
                if (fs.existsSync(macPath)) {
                    chromePath = macPath;
                }
                break;

            case 'linux':
                // Linux için Chrome kontrolü
                try {
                    chromePath = execSync('which google-chrome', { encoding: 'utf8' }).trim();
                } catch {
                    try {
                        chromePath = execSync('which chromium-browser', { encoding: 'utf8' }).trim();
                    } catch {
                        chromePath = null;
                    }
                }
                break;
        }

        return {
            isInstalled: Boolean(chromePath),
            executablePath: chromePath,
            message: chromePath 
                ? 'Chrome kurulu.' 
                : 'Chrome kurulu değil. Lütfen Google Chrome\'u yükleyin: https://www.google.com/chrome/'
        };
    } catch (error) {
        return {
            isInstalled: false,
            executablePath: null,
            message: 'Chrome kontrolü yapılırken bir hata oluştu. Lütfen Google Chrome\'un kurulu olduğundan emin olun.'
        };
    }
}

module.exports = checkChromeInstallation; 