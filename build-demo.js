const { execSync } = require('child_process');
const path = require('path');

// Environment variable'ı ayarla
process.env.IS_DEMO = 'true';

// Build komutunu çalıştır
const buildCommand = `pkg . --target node18-win-x64 --output dist/google-maps-bot-demo.exe --public --public-packages=* --no-bytecode --compress Brotli`;

try {
    execSync(buildCommand, { stdio: 'inherit' });
    console.log('Demo build başarıyla tamamlandı!');
} catch (error) {
    console.error('Build sırasında hata oluştu:', error);
    process.exit(1);
} 