class Business {
    constructor() {
        this.name = '';
        this.address = '';
        this.phone = '';
        this.website = '';
        this.email = '';
        this.description = '';
        this.workingHours = '';
        this.photoUrl = '';
        this.features = {
            accessibility: [],
            serviceOptions: [],
            amenities: [],
            payments: [],
            parking: []
        };
        this.owner = '';
        this.ownerPhone = '';
        this.ownerEmail = '';
        this.ownerAddress = '';
        this.ownerCompany = '';
        this.ownerCompanyAddress = '';
        this.voteCount = 0;
        this.reviewCount = 0;
        this.rating = 0;
        this.type = '';
        this.subType = '';
        this.location = '';
        this.coordinates = {
            latitude: '',
            longitude: ''
        };
    }

    toJSON() {
        return {
            'İşletme Adı': this.name,
            'Adres': this.address,
            'Telefon': this.phone,
            'Website': this.website,
            'Email': this.email,
            'İşletme Türü': this.type,
            'Puan': this.rating,
            'Yorum Sayısı': this.reviewCount,
            'Hakkında': this.description,
            'Çalışma Saatleri': this.workingHours,
            'Fotoğraf': this.photoUrl,
            'Erişilebilirlik': this.features.accessibility.join(', '),
            'Hizmet Seçenekleri': this.features.serviceOptions.join(', '),
            'Sunulan Olanaklar': this.features.amenities.join(', '),
            'Ödeme Yöntemleri': this.features.payments.join(', '),
            'Park Yerleri': this.features.parking.join(', ')
        };
    }
}

module.exports = Business; 