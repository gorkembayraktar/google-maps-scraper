const inquirer = require('inquirer');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

class InputService {
    constructor() {
        this.argv = yargs(hideBin(process.argv))
            .option('location', {
                alias: 'l',
                type: 'string',
                description: 'Arama yapılacak konum'
            })
            .option('keyword', {
                alias: 'k',
                type: 'string',
                description: 'Arama anahtar kelimesi'
            })
            .option('limit', {
                type: 'number',
                description: 'Toplanacak işletme sayısı',
                default: 10
            })
            .option('skipPrompts', {
                type: 'boolean',
                description: 'Kullanıcı girdilerini atla',
                default: false
            })
            .option('saveFormat', {
                type: 'string',
                description: 'Kaydetme formatı (xlsx/txt/none)',
                default: 'xlsx'
            })
            .argv;
    }

    async getUserInput() {
        // CLI argümanları varsa ve skipPrompts true ise direkt onları kullan
        if (this.argv.skipPrompts && this.argv.location && this.argv.keyword) {
            process.env.NODE_ENV = 'dev';
            return {
                location: this.argv.location,
                keyword: this.argv.keyword,
                limit: this.argv.limit || 10,
                useFilter: false,
                minRating: 0,
                saveFormat: this.argv.saveFormat || 'xlsx'
            };
        }

        // Aksi takdirde interaktif sorular sor
        const questions = [
            {
                type: 'input',
                name: 'location',
                message: 'Aramak istediğiniz konumu girin:',
                default: this.argv.location || 'istanbul',
                validate: input => input.length > 0 ? true : 'Konum boş bırakılamaz'
            },
            {
                type: 'input',
                name: 'keyword',
                message: 'Anahtar kelimeyi girin:',
                default: this.argv.keyword || 'çiçekçi',
                validate: input => input.length > 0 ? true : 'Anahtar kelime boş bırakılamaz'
            },
            {
                type: 'number',
                name: 'limit',
                message: 'Kaç işletme çekilecek:',
                default: this.argv.limit || 10,
                validate: input => input > 0 ? true : 'En az 1 işletme seçilmelidir'
            },
            {
                type: 'confirm',
                name: 'useFilter',
                message: 'Filtreleme yapmak istiyor musunuz?',
                default: false,
            },
            {
                type: 'number',
                name: 'minRating',
                message: 'Minimum puanı girin (1-5):',
                when: (answers) => answers.useFilter,
                validate: (value) => {
                    if (value >= 1 && value <= 5) return true;
                    return 'Lütfen 1 ile 5 arasında bir değer girin';
                },
            },
            {
                type: 'list',
                name: 'saveFormat',
                message: 'Sonuçları hangi formatta kaydetmek istersiniz?',
                choices: [
                    { name: 'Excel (.xlsx)', value: 'xlsx' },
                    { name: 'Metin (.txt)', value: 'txt' },
                    { name: 'Kaydetme', value: 'none' }
                ],
                default: 'xlsx'
            }
        ];

        return inquirer.prompt(questions);
    }
}

module.exports = new InputService(); 