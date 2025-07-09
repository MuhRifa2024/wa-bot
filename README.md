# WA Bot - WhatsApp Bot with Google Cloud Functions

Bot WhatsApp sederhana yang dapat menjawab sapaan dan melakukan perhitungan matematika. Bot ini dapat di-deploy ke Google Cloud Functions menggunakan CI/CD GitHub Actions.

## Fitur

- 🤖 Bot WhatsApp otomatis
- 🧮 Kalkulator matematika sederhana
- 👋 Respons sapaan
- 📱 QR Code untuk autentikasi
- ☁️ Deploy ke Google Cloud Functions
- 🔄 CI/CD dengan GitHub Actions

## Setup Lokal

1. Clone repository:

```bash
git clone <your-repo-url>
cd wa-bot
```

2. Install dependencies:

```bash
npm install
```

3. Jalankan bot:

```bash
npm start
```

4. Buka browser dan scan QR code di `http://localhost:3000`

## Deploy ke Google Cloud Functions

### Prerequisites

1. **Google Cloud Project** dengan Cloud Functions API aktif
2. **Service Account** dengan permission:
   - Cloud Functions Developer
   - Service Account User
   - Cloud Build Editor

### Setup GitHub Secrets

Tambahkan secrets berikut di repository GitHub:

1. `GCP_PROJECT_ID`: ID project Google Cloud
2. `GCP_SA_KEY`: Service Account key (JSON format)

### Cara Mendapatkan Service Account Key

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Pilih project Anda
3. Buka **IAM & Admin** > **Service Accounts**
4. Buat service account baru atau gunakan yang ada
5. Tambahkan role: **Cloud Functions Developer**
6. Buat key baru (JSON format)
7. Copy isi JSON ke GitHub secret `GCP_SA_KEY`

### Deploy Otomatis

Setelah setup secrets, setiap push ke branch `main` atau `master` akan otomatis deploy ke Cloud Functions.

### Deploy Manual

```bash
npm run deploy
```

## API Endpoints

Setelah deploy, bot akan tersedia di endpoint berikut:

- `GET /` - Info API dan status bot
- `GET /health` - Health check
- `GET /qr` - Dapatkan QR code untuk scan
- `POST /start` - Mulai bot
- `POST /stop` - Hentikan bot

## Penggunaan

1. **Mulai Bot**:

   ```bash
   curl -X POST https://your-function-url/start
   ```

2. **Dapatkan QR Code**:

   ```bash
   curl https://your-function-url/qr
   ```

3. **Cek Status**:

   ```bash
   curl https://your-function-url/health
   ```

4. **Hentikan Bot**:
   ```bash
   curl -X POST https://your-function-url/stop
   ```

## Komunikasi Bot

Bot akan merespons pesan berikut:

- **Sapaan**: "halo" → "Hai juga 👋"
- **Matematika**: "2+2" → "Hasil: 4"
- **Pertanyaan**: "siapa kamu" → "I'm a king of the kingdom..."

## Troubleshooting

### Bot tidak merespons

1. Cek status bot di `/health`
2. Pastikan bot sudah dimulai dengan `/start`
3. Scan QR code jika belum terautentikasi

### Deploy gagal

1. Pastikan secrets GitHub sudah benar
2. Cek permission service account
3. Pastikan Cloud Functions API aktif

### QR Code tidak muncul

1. Hentikan bot dengan `/stop`
2. Mulai ulang dengan `/start`
3. Cek endpoint `/qr`

## Struktur File

```
wa-bot/
├── .github/workflows/deploy.yml  # CI/CD workflow
├── main.js                       # Entry point Cloud Functions
├── index.js                      # Local development
├── package.json                  # Dependencies
├── .gcloudignore                 # Files to exclude from deploy
└── README.md                     # Documentation
```

## Environment Variables

- `NODE_ENV`: Environment (production/development)
- `GCP_PROJECT_ID`: Google Cloud Project ID
- `GCP_SA_KEY`: Service Account Key

## Contributing

1. Fork repository
2. Buat feature branch
3. Commit changes
4. Push ke branch
5. Buat Pull Request

## License

ISC
