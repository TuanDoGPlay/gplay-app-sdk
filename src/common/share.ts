import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'

/**
 * Share ảnh từ base64 data URL.
 *
 * @param base64Data - Chuỗi base64 (có hoặc không có prefix `data:image/...;base64,`)
 * @param fileName  - Tên file ảnh (VD: 'screenshot.png'). Nếu không truyền sẽ tự tạo.
 */
export async function shareImage(base64Data: string, fileName?: string): Promise<void> {
    if (!fileName) {
        const ext = base64Data.match(/data:image\/(\w+)/)?.[1] || 'png'
        fileName = `image_${Date.now()}.${ext}`
    }
    // Tách phần data thuần (bỏ prefix data:image/xxx;base64, nếu có)
    const pureBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data

    if (Capacitor.getPlatform() === 'web') {
        // Web: dùng Web Share API nếu hỗ trợ, fallback download
        await shareImageWeb(base64Data, fileName)
        return
    }

    // Native (Android/iOS): ghi file tạm rồi share
    const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: pureBase64,
        directory: Directory.Cache,
    })

    const fileUri = savedFile.uri

    await Share.share({
        title: fileName,
        files: [fileUri],
    })
}

/**
 * Fallback cho Web: dùng Web Share API hoặc tải file xuống
 */
async function shareImageWeb(base64Data: string, fileName: string): Promise<void> {
    // Đảm bảo có prefix
    const dataUrl = base64Data.includes(',') ? base64Data : `data:image/png;base64,${base64Data}`

    const blob = await fetch(dataUrl).then((r) => r.blob())
    const file = new File([blob], fileName, { type: blob.type || 'image/png' })

    // Thử Web Share API (hỗ trợ share file trên mobile browsers)
    if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
            title: fileName,
            files: [file],
        })
        return
    }

    // Fallback: tải ảnh xuống
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

/**
 * Tải ảnh xuống thiết bị từ base64.
 *
 * - Native: lưu vào thư mục Documents
 * - Web: trigger download qua trình duyệt
 *
 * @param base64Data - Chuỗi base64 (có hoặc không có prefix `data:image/...;base64,`)
 * @param fileName   - Tên file (VD: 'photo.png'). Nếu không truyền sẽ tự tạo.
 */
export async function downloadImage(base64Data: string, fileName?: string): Promise<string> {
    if (!fileName) {
        const ext = base64Data.match(/data:image\/(\w+)/)?.[1] || 'png'
        fileName = `image_${Date.now()}.${ext}`
    }

    if (Capacitor.getPlatform() === 'web') {
        // Web: tạo link download
        const dataUrl = base64Data.includes(',') ? base64Data : `data:image/png;base64,${base64Data}`
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        return fileName
    }

    // Native: ghi file vào Documents
    const pureBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data

    const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: pureBase64,
        directory: Directory.Documents,
    })

    return savedFile.uri
}
