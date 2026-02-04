# GPlay App1

Ứng dụng hybrid chạy trên Web – Android – iOS được xây dựng bằng **Capacitor** và framework frontend.

## 🚀 Công nghệ sử dụng
- Capacitor
- Frontend framework (React/Vue/Angular)
- TypeScript
- Plugin ví dụ:
  - @capacitor/app
  - @capacitor/filesystem
  - @capacitor/geolocation

## 📦 Cài đặt
```
npm install
```

## ▶️ Chạy development
```
npm run dev
```

## 🔨 Build web
```
npm run build
```

## 📱 Chạy trên Capacitor
### Đồng bộ web → native
```
npx cap sync
```
### Mở Android Studio
```
npx cap open android
```
### Mở Xcode
```
npx cap open ios
```

## 🗂 Cấu trúc thư mục
```
project/
 ├── src/
 ├── public/
 ├── android/
 ├── ios/
 ├── capacitor.config.ts
 ├── package.json
 └── README.md
```

## ⚙️ Lệnh quan trọng
| Lệnh | Mô tả |
|------|------|
| npx cap sync | Đồng bộ build web với Android/iOS |
| npx cap copy | Copy assets sang native |
| npx cap open android | Mở Android Studio |
| npx cap open ios | Mở Xcode |
| npm run build | Build web cho production |

## 📤 Deploy Web
```
npm run build
```

## 🐛 Debug Capacitor
| Lỗi | Cách xử lý |
|-----|-------------|
| Không thấy thay đổi | npx cap sync |
| Plugin lỗi | Build lại native |
| Lỗi Gradle | Sync trong Android Studio |

## 📄 License
MIT
