import fs from "node:fs";
import path from "node:path";

/**
 * Tự động tăng versionCode và versionName trong build.gradle
 *
 * versionCode: tăng +1 mỗi lần build
 * versionName: YYYYMMDD + 2 chữ số build count (01, 02, ...)
 *   - Cùng ngày → tăng count
 *   - Khác ngày → reset về 01
 */
export function bumpAndroidVersion(appRoot) {
  const gradlePath = path.join(appRoot, "android", "app", "build.gradle");

  if (!fs.existsSync(gradlePath)) {
    console.warn("⚠️ Không tìm thấy android/app/build.gradle, bỏ qua bump version.");
    return;
  }

  let gradle = fs.readFileSync(gradlePath, "utf8");

  // Tạo YYYYMMDD
  const now = new Date();
  const date =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");

  // Đọc versionCode hiện tại
  const versionCodeMatch = gradle.match(/versionCode (\d+)/);
  const currentVersionCode = versionCodeMatch ? parseInt(versionCodeMatch[1]) : 0;
  const newVersionCode = currentVersionCode + 1;

  // Đọc versionName hiện tại
  const versionNameMatch = gradle.match(/versionName "(\d{8})(\d{2})"/);

  let buildCount = 1;
  if (versionNameMatch) {
    const currentDate = versionNameMatch[1];
    const currentCount = parseInt(versionNameMatch[2]);

    if (currentDate === date) {
      buildCount = currentCount + 1; // cùng ngày → tăng
    }
    // khác ngày → reset về 1
  }

  // Format: YYYYMMDD + 2 chữ số số lần build (01, 02, ...)
  const newVersionName = `${date}${String(buildCount).padStart(2, "0")}`;

  // Cập nhật vào build.gradle
  gradle = gradle.replace(/versionCode \d+/, `versionCode ${newVersionCode}`);
  gradle = gradle.replace(/versionName ".*"/, `versionName "${newVersionName}"`);

  fs.writeFileSync(gradlePath, gradle);

  console.log(`✅ versionCode : ${newVersionCode}`);
  console.log(`✅ versionName : ${newVersionName}`);
}
