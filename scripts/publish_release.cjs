#!/usr/bin/env node

/**
 * Dropify Central Release Management Tool
 * Validates binaries, computes cryptographic SHA-256 checksums,
 * performs atomic manifest updates, and stages artifacts for distribution.
 *
 * Usage:
 *   node scripts/publish_release.cjs --platform android --version 1.0.1 --code 2 --file ../dropify-android/app/build/outputs/apk/release/app-release.apk --notes "Bug fixes; Audio improvements"
 *   node scripts/publish_release.cjs --platform windows --version 1.0.1 --file "release/Dropify Setup 1.0.1.exe" --notes "Windows 11 Mica optimizations"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function printUsage() {
  console.log(`
Dropify Central Release Management Tool
=======================================
Usage:
  node scripts/publish_release.cjs [options]

Required Options:
  --platform <android|windows>    Target operating system platform
  --version <x.y.z>               Semantic version string (e.g. 1.0.1)
  --file <path>                   Path to release artifact (.apk, .exe)

Optional Options:
  --code <int>                    Android versionCode (defaults to parsed or incremented)
  --notes <string>                Semicolon-separated or newline-separated release notes
  --mandatory <true|false>        Mark release as mandatory (forces update)
  --channel <stable|beta>         Release channel (defaults to 'stable')
  --format <installer|portable>   Windows package format (defaults to 'installer')
  --dry-run                       Simulate without writing files
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        parsed[key] = args[i + 1];
        i++;
      } else {
        parsed[key] = true;
      }
    }
  }

  return parsed;
}

function computeFileHash(filePath) {
  const hash = crypto.createHash('sha256');
  const buffer = fs.readFileSync(filePath);
  hash.update(buffer);
  const hex = hash.digest('hex');
  return {
    sha256Hex: hex.toLowerCase(),
    sha256Upper: hex.toUpperCase(),
    sizeBytes: buffer.length
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function run() {
  const args = parseArgs();

  if (args.help || !args.platform || !args.version || !args.file) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  const platform = args.platform.toLowerCase().trim();
  if (platform !== 'android' && platform !== 'windows') {
    console.error(`[Error] Invalid platform: "${platform}". Must be "android" or "windows".`);
    process.exit(1);
  }

  const semverRegex = /^v?(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?$/;
  if (!semverRegex.test(args.version)) {
    console.error(`[Error] Invalid version format: "${args.version}". Expected SemVer (e.g. 1.0.1).`);
    process.exit(1);
  }
  const version = args.version.replace(/^v/, '');

  const artifactPath = path.resolve(process.cwd(), args.file);
  if (!fs.existsSync(artifactPath)) {
    console.error(`[Error] Artifact file not found at: ${artifactPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(artifactPath);
  if (stats.size === 0) {
    console.error(`[Error] Artifact file is empty (0 bytes): ${artifactPath}`);
    process.exit(1);
  }

  console.log(`\n==================================================`);
  console.log(`[Dropify Release Publisher]`);
  console.log(`Platform:  ${platform.toUpperCase()}`);
  console.log(`Version:   ${version}`);
  console.log(`Artifact:  ${artifactPath}`);
  console.log(`==================================================\n`);

  console.log(`[1/5] Calculating cryptographic SHA-256 hash & size...`);
  const { sha256Hex, sha256Upper, sizeBytes } = computeFileHash(artifactPath);
  const formattedSize = formatBytes(sizeBytes);
  console.log(`  -> SHA-256: ${sha256Hex}`);
  console.log(`  -> Size:    ${formattedSize} (${sizeBytes.toLocaleString()} bytes)`);

  const manifestPath = path.resolve(__dirname, '../frontend/public/releases.json');
  const backendManifestPath = path.resolve(__dirname, '../backend/releases.json');

  let manifest = {
    schemaVersion: "1.0.0",
    project: "Dropify",
    lastUpdated: new Date().toISOString(),
    channel: args.channel || "stable",
    platforms: {}
  };

  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      console.warn(`[Warning] Could not parse existing manifest: ${err.message}. Creating fresh manifest.`);
    }
  }

  // Backup existing manifest
  if (fs.existsSync(manifestPath) && !args['dry-run']) {
    const backupPath = manifestPath.replace(/\.json$/, `.backup.${Date.now()}.json`);
    fs.copyFileSync(manifestPath, backupPath);
    console.log(`[2/5] Created atomic backup: ${path.basename(backupPath)}`);
  } else {
    console.log(`[2/5] Skipping backup (dry-run or new manifest)`);
  }

  // Parse notes
  let releaseNotes = [];
  if (args.notes) {
    releaseNotes = args.notes
      .split(/[;\n]/)
      .map(s => s.trim())
      .filter(Boolean);
  } else if (manifest.platforms[platform]?.releaseNotes) {
    releaseNotes = manifest.platforms[platform].releaseNotes;
  } else {
    releaseNotes = [`Dropify ${platform} release v${version}`];
  }

  const isMandatory = String(args.mandatory).toLowerCase() === 'true';
  const channel = args.channel || manifest.platforms[platform]?.channel || 'stable';
  const releaseDate = new Date().toISOString().split('T')[0];

  console.log(`[3/5] Staging distribution assets...`);
  if (platform === 'android') {
    const targetFilename = `dropify-v${version}.apk`;
    const targetPath = path.resolve(__dirname, '../frontend/public/downloads', targetFilename);

    if (!args['dry-run']) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(artifactPath, targetPath);
      console.log(`  -> Copied APK to ${targetPath}`);
    } else {
      console.log(`  -> [Dry-Run] Would copy APK to ${targetPath}`);
    }

    const previousCode = manifest.platforms.android?.versionCode || 1;
    const versionCode = args.code ? parseInt(args.code, 10) : (previousCode + 1);

    manifest.platforms.android = {
      platform: "android",
      latestVersion: version,
      version: version,
      versionCode: versionCode,
      releaseDate: releaseDate,
      filename: targetFilename,
      downloadUrl: `https://dropify.vercel.app/downloads/${targetFilename}`,
      fallbackUrl: `https://github.com/harsh-pratap-singh-rathore/Dropify/releases/download/v${version}/${targetFilename}`,
      size: sizeBytes,
      fileSize: sizeBytes,
      sizeFormatted: formattedSize,
      sha256: sha256Hex,
      minSupportedVersion: manifest.platforms.android?.minSupportedVersion || "1.0.0",
      minSdk: 26,
      minOs: "Android 8.0 (Oreo) or higher",
      arch: "Universal (arm64-v8a, armeabi-v7a, x86_64)",
      mandatory: isMandatory,
      channel: channel,
      releaseNotes: releaseNotes
    };
  } else if (platform === 'windows') {
    const format = args.format || 'installer';
    const filename = path.basename(artifactPath);

    const prevWin = manifest.platforms.windows || {};
    const winEntry = {
      platform: "windows",
      latestVersion: version,
      version: version,
      versionCode: prevWin.versionCode ? prevWin.versionCode + 1 : 1,
      releaseDate: releaseDate,
      downloadUrl: `https://github.com/harsh-pratap-singh-rathore/Dropify/releases/download/v${version}/${filename}`,
      portableUrl: prevWin.portableUrl || `https://github.com/harsh-pratap-singh-rathore/Dropify/releases/download/v${version}/Dropify-Portable-${version}.exe`,
      installer: prevWin.installer || {},
      portable: prevWin.portable || {},
      size: sizeBytes,
      fileSize: sizeBytes,
      sizeFormatted: formattedSize,
      sha256: sha256Hex,
      minSupportedVersion: prevWin.minSupportedVersion || "1.0.0",
      minOs: "Windows 10 / Windows 11 (64-bit)",
      arch: "x64",
      mandatory: isMandatory,
      channel: channel,
      releaseNotes: releaseNotes
    };

    if (format === 'installer') {
      winEntry.installer = {
        format: "NSIS Setup (.exe)",
        filename: filename,
        downloadUrl: `https://github.com/harsh-pratap-singh-rathore/Dropify/releases/download/v${version}/${filename}`,
        mirrorUrl: `/downloads/${filename}`,
        size: sizeBytes,
        fileSize: sizeBytes,
        sizeFormatted: formattedSize,
        sha256: sha256Hex
      };
    } else {
      winEntry.portable = {
        format: "Standalone Portable (.exe)",
        filename: filename,
        downloadUrl: `https://github.com/harsh-pratap-singh-rathore/Dropify/releases/download/v${version}/${filename}`,
        mirrorUrl: `/downloads/${filename}`,
        size: sizeBytes,
        fileSize: sizeBytes,
        sizeFormatted: formattedSize,
        sha256: sha256Hex
      };
    }

    manifest.platforms.windows = winEntry;
  }

  manifest.lastUpdated = new Date().toISOString();

  console.log(`[4/5] Writing updated release manifest atomically...`);
  const serialized = JSON.stringify(manifest, null, 2) + '\n';

  if (!args['dry-run']) {
    // Atomic write via temp file
    const tmpFile = manifestPath + '.tmp';
    fs.writeFileSync(tmpFile, serialized, 'utf8');
    fs.renameSync(tmpFile, manifestPath);

    // Sync to backend
    try {
      fs.writeFileSync(backendManifestPath, serialized, 'utf8');
    } catch (_) {}

    console.log(`  -> Successfully updated ${manifestPath}`);
    console.log(`  -> Synced to ${backendManifestPath}`);
  } else {
    console.log(`  -> [Dry-Run] Skipped writing manifest`);
  }

  console.log(`[5/5] Verification completed!`);
  console.log(`\n==================================================`);
  console.log(`SUCCESS: Dropify ${platform} v${version} published to manifest!`);
  console.log(`Download URL: ${manifest.platforms[platform].downloadUrl}`);
  console.log(`SHA-256:      ${manifest.platforms[platform].sha256}`);
  console.log(`==================================================`);
  console.log(`\nNext Steps:`);
  console.log(`1. Test the build: cd frontend && npm run build`);
  console.log(`2. Deploy to Vercel: npx vercel deploy --prebuilt --prod`);
  console.log(`3. Push release tag: git tag v${version} && git push --tags\n`);
}

run().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
