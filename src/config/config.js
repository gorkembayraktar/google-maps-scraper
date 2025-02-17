module.exports = {
    browser: {
        headless: true,
        defaultViewport: null,
        allowChromiumDownload: true
    },
    baseUrl: 'https://www.google.com/maps',
    excel: {
        fileName: 'isletme-bilgileri.xlsx',
        sheetName: 'İşletmeler'
    },
    selectors: {
        // Main container for business listings
        businessList: '[role="feed"] > div',
        
        // Business name - using aria-label and role attributes
        businessName: '[role="heading"][aria-level="2"]',
        
        // Rating - using data attributes and aria-label containing rating
        rating: '[aria-label*="yıldız"]',
        
        // Review count - using aria-label for reviews
        reviewCount: '[aria-label*="yorum"]',
        
        // Address - multiple reliable selectors
        address: '[data-item-id="address"], [aria-label*="Adres"], button[data-tooltip*="Adres"]',
        
        // Phone - multiple reliable selectors
        phone: '[data-item-id*="phone"], [aria-label*="Telefon"], button[data-tooltip*="Ara"]',
        
        // Website - multiple reliable selectors
        website: '[data-item-id="authority"], [aria-label*="Web sitesi"], a[data-tooltip*="Web"]',
        
        // Business type - using role and aria attributes
        type: '[role="link"][aria-label*="kategori"], [jsaction*="category"]'
    }
}; 