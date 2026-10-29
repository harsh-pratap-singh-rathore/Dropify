# Dropify Central Release & Distribution Guide

This document details the unified release management architecture for **Dropify**, enabling coordinated releases across the central website (`https://dropify.vercel.app`), the Android mobile app, and the Windows desktop player.

---

## 1. Architecture Overview

Dropify uses a **single source of truth** release architecture:

```
                      +---------------------------------------+
                      |       Central Release Publisher       |
                      |   (dropify/scripts/publish_release)   |
                      +-------------------+-------------------+
                                          |
                +-------------------------+-------------------------+
                |                                                   |
                v                                                   v
   +-------------------------+                         +-------------------------+
   |   frontend/public/      |                         |    backend/releases.    |
   |      releases.json      |                         |          json           |
   +------------+------------+                         +------------+------------+
                |                                                   |
                v                                                   v
   +-------------------------+                         +-------------------------+
   |       Vercel CDN        |                         |     Render Backend      |
   |  https://dropify.       |                         |  /api/updates (Dynamic  |
   |  vercel.app/api/updates |                         |   query & SemVer check) |
   +------------+------------+                         +------------+------------+
                |                                                   |
        +-------+-------------------------+                         |
        |                                 |                         |
        v                                 v                         v
+---------------+                 +---------------+         +---------------+
|  Web Landing  |                 |  Android App  |         |  Windows App  |
|  Page Portal  |                 |  In-App Flow  |         |  Auto-Updater |
+---------------+                 +---------------+         +---------------+
```

### High Availability & Zero-Cold-Start SLA
- **Primary Endpoint:** `https://dropify.vercel.app/api/updates` (rewritten directly at the Vercel Edge CDN to `/releases.json`, delivering instant sub-20ms responses globally without waking backend dynos).
- **Dynamic Endpoint:** `https://dropify-backend-wy9v.onrender.com/api/updates?platform=android` (supports dynamic version evaluation, `updateAvailable`, and `mandatory` checking).
- **Direct CDN Fallback:** `https://dropify.vercel.app/releases.json`.

---

## 2. Release Metadata Schema

Both `/api/updates` and `/releases.json` adhere to the Dropify Release Schema:

```json
{
  "schemaVersion": "1.0.0",
  "project": "Dropify",
  "lastUpdated": "2026-10-28T17:00:00Z",
  "channel": "stable",
  "platforms": {
    "android": {
      "platform": "android",
      "latestVersion": "1.0.0",
      "version": "1.0.0",
      "versionCode": 1,
      "releaseDate": "2026-10-27",
      "filename": "dropify-v1.0.0.apk",
      "downloadUrl": "https://dropify.vercel.app/downloads/dropify-v1.0.0.apk",
      "fallbackUrl": "https://github.com/harsh-pratap-singh-rathore/Dropify/releases/download/v1.0.0/app-release.apk",
      "fileSize": 19816149,
      "size": 19816149,
      "sizeFormatted": "18.9 MB",
      "sha256": "6a14f791f86480d69aff15d2cf391e4a6b110070cfb3cb13ee0fbbb864ae58e2",
      "minSupportedVersion": "1.0.0",
      "minSdk": 26,
      "minOs": "Android 8.0 (Oreo) or higher",
      "arch": "Universal (arm64-v8a, armeabi-v7a, x86_64)",
      "mandatory": false,
      "channel": "stable",
      "releaseNotes": [
        "First production signed release of Dropify for Android",
        "Interactive Turntable / Vinyl Player with haptic controls",
        "Synchronized Real-Time Lyrics Engine with automatic metadata cleaning"
      ]
    },
    "windows": {
      "platform": "windows",
      "latestVersion": "1.0.0",
      "version": "1.0.0",
      "versionCode": 1,
      "releaseDate": "2026-10-25",
      "downloadUrl": "https://github.com/harsh-pratap-singh-rathore/Dropify/releases/download/v1.0.0/Dropify-Setup-1.0.0.exe",
      "portableUrl": "https://github.com/harsh-pratap-singh-rathore/Dropify/releases/download/v1.0.0/Dropify-Portable-1.0.0.exe",
      "installer": {
        "format": "NSIS Setup (.exe)",
        "filename": "Dropify-Setup-1.0.0.exe",
        "downloadUrl": "https://github.com/harsh-pratap-singh-rathore/Dropify/releases/download/v1.0.0/Dropify-Setup-1.0.0.exe",
        "mirrorUrl": "/downloads/Dropify-Setup-1.0.0.exe",
        "size": 135163574,
        "fileSize": 135163574,
        "sizeFormatted": "128.9 MB",
        "sha256": "05fd37b08b0c72b4a70958851118f257e37791d09b657b4ad8c271f7404b0e6b"
      },
      "portable": {
        "format": "Standalone Portable (.exe)",
        "filename": "Dropify-Portable-1.0.0.exe",
        "downloadUrl": "https://github.com/harsh-pratap-singh-rathore/Dropify/releases/download/v1.0.0/Dropify-Portable-1.0.0.exe",
        "mirrorUrl": "/downloads/Dropify-Portable-1.0.0.exe",
        "size": 114367762,
        "fileSize": 114367762,
        "sizeFormatted": "109.1 MB",
        "sha256": "e3211562f661ba719a93c64e0a58e0dcfed7f5a7bee591a16c3f06880d484ad0"
      },
      "minSupportedVersion": "1.0.0",
      "minOs": "Windows 10 / Windows 11 (64-bit)",
      "arch": "x64",
      "mandatory": false,
      "channel": "stable",
      "releaseNotes": [
        "Frameless desktop experience with Mica material",
        "System Tray integration with quick controls",
        "Windows Taskbar thumbnail toolbar (Thumbar buttons: Play/Pause, Next, Prev)"
      ]
    }
  }
}
```

---

## 3. How to Publish an Android Release

### Step 1: Build the signed Android release APK
```bash
cd dropify-android
./gradlew assembleRelease
```
The output APK is generated at:
`dropify-android/app/build/outputs/apk/release/app-release.apk`

### Step 2: Publish using the release CLI tool
```bash
cd dropify
npm run publish:release -- \
  --platform android \
  --version 1.0.1 \
  --code 2 \
  --file ../dropify-android/app/build/outputs/apk/release/app-release.apk \
  --notes "Performance enhancements; Turntable pitch tuning; Fixed background sync"
```

The script will automatically:
1. Verify the APK exists and is non-empty.
2. Compute the cryptographic SHA-256 hash.
3. Measure exact file bytes and format human-readable size.
4. Create an atomic timestamped backup of the previous manifest.
5. Copy the APK into `frontend/public/downloads/dropify-v1.0.1.apk`.
6. Write the updated manifest atomically via temporary file replacement.

### Step 3: Deploy to Vercel production
```bash
cd dropify/frontend
npm run build
cd ..
npx vercel build --prod --yes
npx vercel deploy --prebuilt --prod
```

### Result:
- Website download links immediately point to `v1.0.1`.
- Android apps will detect `versionCode: 2 > 1` on startup or via Settings > "Check for Updates", display the 2D tactile update dialog, stream the download with live progress, verify SHA-256 integrity, and trigger the system installer via `FileProvider`.

---

## 4. How to Publish a Windows Desktop Release

### Step 1: Package Windows Desktop Binaries
```bash
cd dropify
npm run dist:win
```
This builds:
- `release/Dropify Setup 1.0.1.exe` (~128 MB)
- `release/Dropify-Portable-1.0.1.exe` (~109 MB)

### Step 2: Upload large binaries to GitHub Releases
Due to Vercel's 100MB static asset limit and Git storage policies, Windows binaries (>100MB) are hosted on GitHub Releases:
```bash
gh release create v1.0.1 "release/Dropify Setup 1.0.1.exe" "release/Dropify-Portable-1.0.1.exe" --title "Dropify v1.0.1" --notes "Release notes..."
```

### Step 3: Update manifest with the publisher tool
```bash
npm run publish:release -- \
  --platform windows \
  --version 1.0.1 \
  --file "release/Dropify Setup 1.0.1.exe" \
  --notes "Windows 11 Mica vibrancy fixes; AutoEq DSP optimizations"
```

### Step 4: Deploy website
```bash
npx vercel build --prod --yes && npx vercel deploy --prebuilt --prod
```

### Result:
- The website download buttons update automatically.
- Installed Windows desktop apps detect the update asynchronously 5 seconds after launch.
- Portable builds inform the user and direct them to download the portable executable.

---

## 5. Security & Protection Features

1. **Downgrade Attack Mitigation:**
   - Both Android (`versionCode`) and Windows (`SemVer`) check that remote version is strictly greater than the installed version.
2. **Tamper & Corruption Defense:**
   - The Android client hashes downloaded bytes in real time with `MessageDigest (SHA-256)` and immediately deletes corrupted downloads if the hash does not match the manifest.
3. **Graceful Permission Onboarding:**
   - On Android 8.0+, if `REQUEST_INSTALL_PACKAGES` is not yet granted, the user is navigated directly to Dropify's specific app setting screen rather than crashing.
4. **Isolated FileProvider Access:**
   - APK files are stored in `context.cacheDir/updates/` with `FLAG_GRANT_READ_URI_PERMISSION`, preventing other unauthorized applications from tampering with the file during installation.
5. **Non-Blocking Background Execution:**
   - All update checks run on background coroutines (`Dispatchers.IO` on Android, asynchronous `setTimeout` on Electron) so audio playback and UI rendering are never interrupted.
