# GPlay App SDK

SDK phát triển ứng dụng hybrid (Android / iOS / Web) xây dựng trên **Capacitor** + **Vue 3** + **TypeScript**.

## 📦 Cài đặt

```bash
npm install gplay-app-sdk --registry=https://repo.gplaysdk.com/repository/npm/  
```

Import style (bắt buộc):

```typescript
import 'gplay-app-sdk/style.css'
```

## 🚀 Khởi tạo

```typescript
import { init } from 'gplay-app-sdk'

init({
  app: { id: 'com.example.myapp', name: 'My App' },
  defaultScreen: { home: HomeComponent },
  layout: { component: LayoutComponent },
  color: {
    background: '#1a1a2e',
    primaryText: '#ffffff',
  },
  // Tùy chọn
  applovin: { /* ... */ },
  appsflyer: { /* ... */ },
  additionalRouter: [ /* ... */ ],
})
```

## 📖 API

### Điều hướng

```typescript
import { goToRouter, goToHome, useRoute } from 'gplay-app-sdk'

goToRouter({ name: 'Settings' })  // Chuyển trang
goToHome()                         // Về trang chủ
const route = useRoute()           // Lấy thông tin route hiện tại
```

### Thông báo

```typescript
import { showToast } from 'gplay-app-sdk'

showToast({ text: 'Thành công!' })
// Native: Toast | Web: alert()
```

### Chụp màn hình

```typescript
import { captureImage } from 'gplay-app-sdk'

const base64 = await captureImage({
  elementId: 'capture-area',    // ID element cần chụp
  pixelRatio: 3,                 // Chất lượng
})
```

### Chia sẻ & Tải ảnh

```typescript
import { shareImage, downloadImage } from 'gplay-app-sdk'

// Share ảnh (Native: share sheet | Web: Web Share API)
await shareImage(base64Data)
await shareImage(base64Data, 'my-image.png')

// Tải ảnh xuống (Native: Documents | Web: browser download)
const uri = await downloadImage(base64Data)
const uri = await downloadImage(base64Data, 'photo.png')
```

### Quảng cáo (AppLovin MAX)

```typescript
import { loadRewardedVideo, showRewardedVideo } from 'gplay-app-sdk'

await loadRewardedVideo()
await showRewardedVideo(() => {
  console.log('Người dùng đã xem xong video')
})
// Tự động skip trên Web
```

### Database (JSON trên Filesystem)

```typescript
import { Database } from 'gplay-app-sdk'

await Database.initDatabase({ users: [] })
await Database.insertTable('users', { name: 'GPlay', level: 1 })
const users = await Database.selectTable('users', { name: 'GPlay' })
await Database.updateTable('users', { name: 'GPlay' }, { level: 2 })
await Database.deleteTable('users', { name: 'GPlay' })
```

## 💻 CLI (`gplay`)

### Build Android (production)

```bash
npx gplay build:android
```

Tự động: build web → cài Capacitor → init config → add platform → **bump version** → sync.

Version tự động tăng mỗi lần build:
```
versionCode: +1
versionName: YYYYMMDDXX (VD: 2026032601, 2026032602, ...)
```

### Build Android (development / live-reload)

```bash
npx gplay build:dev --url http://192.168.1.50:4000
```

Inject `server.url` vào `capacitor.config.json`, build, rồi tự khôi phục config gốc.

**Workflow:**
1. Chạy `npm run dev` → Vite server lên tại port 4000
2. Chạy `npx gplay build:dev --url http://<IP_LAN>:4000`
3. Mở Android Studio → Run trên thiết bị

### Build Remote (OTA update)

```bash
npx gplay build:remote
```

Build web, tự bump version, đóng gói thành zip cho việc cập nhật từ xa.

### Host bản build remote

```bash
npx gplay host-dist-remote
```

## 🗂 Cấu trúc dự án

```
gplay-app-sdk/
├── bin/
│   ├── cli.mjs              # Entry point CLI
│   ├── build-android.mjs     # Logic build Android
│   ├── bump-version.mjs      # Tự tăng version
│   ├── zip-build.mjs         # Đóng gói bản remote
│   └── host-dist-remote.mjs  # Server host bản remote
├── src/
│   ├── index.ts              # Entry point SDK (exports)
│   ├── main.ts               # Khởi chạy Vue app
│   ├── state.ts              # Quản lý config
│   ├── common/
│   │   ├── applovin.ts       # Quảng cáo AppLovin MAX
│   │   ├── appsflyer.ts      # Analytics AppsFlyer
│   │   ├── capture.ts        # Chụp màn hình & tạo video slideshow
│   │   ├── database.ts       # JSON database trên filesystem
│   │   ├── firebase.ts       # Firebase init
│   │   └── share.ts          # Share & download ảnh
│   ├── layouts/              # Layout components
│   ├── router/               # Vue Router setup
│   └── types/                # TypeScript type definitions
├── package.json
└── vite.config.ts
```

## 🛠 Công nghệ

| Thành phần | Công nghệ |
|-----------|-----------|
| Framework | Vue 3 + TypeScript |
| Build | Vite |
| Native | Capacitor 8 |
| Ads | AppLovin MAX (Cordova) |
| Analytics | Firebase, AppsFlyer |
| Capture | html-to-image |

## 📄 License

ISC
