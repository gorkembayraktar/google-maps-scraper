const figlet = require('figlet');
const util = require('util');

// Figlet'i promise'e çevir
const figletPromise = util.promisify(figlet);

/**
 * ASCII başlık oluşturur
 * @param {string} text - Gösterilecek metin
 * @returns {Promise<string>} ASCII art olarak formatlanmış metin
 */
async function showTitle(text) {
    try {
        // Varsayılan fontu kullan (Standard)
        return await figletPromise(text);
    } catch (error) {
        console.error('Başlık oluşturulurken hata:', error);
        return text; // Hata durumunda normal metni döndür
    }
}

module.exports = {
    showTitle
};
