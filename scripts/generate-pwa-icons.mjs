/**
 * Generate PWA icons and Apple splash screens using sharp.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(__dirname, '..', 'public')
const ICONS_DIR = join(PUBLIC, 'icons')

mkdirSync(ICONS_DIR, { recursive: true })

// Emerald brand color
const EMERALD = '#3ECF8E'
const EMERALD_DARK = '#059669'
const WHITE = '#FFFFFF'

// Shield + checkmark SVG icon (matches the login page logo)
function createIconSvg(size) {
  const padding = Math.round(size * 0.15)
  const innerSize = size - padding * 2
  // Scale factor relative to a 24x24 viewBox
  const scale = innerSize / 24
  const tx = padding
  const ty = padding

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${EMERALD};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${EMERALD_DARK};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="url(#bg)"/>
  <g transform="translate(${tx},${ty}) scale(${scale})">
    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      fill="none" stroke="${WHITE}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`)
}

// Splash screen SVG (centered logo + app name on white background)
function createSplashSvg(width, height) {
  const iconSize = Math.min(width, height) * 0.2
  const iconX = (width - iconSize) / 2
  const iconY = height * 0.35
  const padding = Math.round(iconSize * 0.15)
  const innerSize = iconSize - padding * 2
  const scale = innerSize / 24
  const fontSize = Math.round(iconSize * 0.3)
  const subFontSize = Math.round(iconSize * 0.15)

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="#fafafa"/>
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${EMERALD}" />
      <stop offset="100%" style="stop-color:${EMERALD_DARK}" />
    </linearGradient>
  </defs>
  <rect x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" rx="${Math.round(iconSize * 0.2)}" fill="url(#bg)"/>
  <g transform="translate(${iconX + padding},${iconY + padding}) scale(${scale})">
    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      fill="none" stroke="${WHITE}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="${width / 2}" y="${iconY + iconSize + fontSize * 1.5}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="${fontSize}" font-weight="700" fill="#1f2937">VVS Inspect</text>
  <text x="${width / 2}" y="${iconY + iconSize + fontSize * 1.5 + subFontSize * 1.5}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="${subFontSize}" fill="#9ca3af">Vehicle &amp; Equipment Inspection</text>
</svg>`)
}

// Icon sizes needed for PWA + Apple
const iconSizes = [72, 96, 128, 144, 152, 167, 180, 192, 384, 512]

// Apple splash screen sizes (portrait only - iOS rotates as needed)
// [width, height, devicePixelRatio, device description]
const splashScreens = [
  // iPhones
  [1290, 2796, 3, 'iPhone 16 Plus / 15 Plus / 14 Pro Max'],
  [1179, 2556, 3, 'iPhone 16 / 15 / 15 Pro / 14 Pro'],
  [1170, 2532, 3, 'iPhone 14 / 13 / 13 Pro / 12 / 12 Pro'],
  [1125, 2436, 3, 'iPhone 11 Pro / XS / X'],
  [1080, 2340, 3, 'iPhone 13 mini / 12 mini'],
  [828, 1792, 2, 'iPhone 11 / XR'],
  [1242, 2688, 3, 'iPhone 11 Pro Max / XS Max'],
  [1242, 2208, 3, 'iPhone 8 Plus / 7 Plus / 6s Plus'],
  [750, 1334, 2, 'iPhone 8 / 7 / 6s / SE 2nd+3rd'],
  [640, 1136, 2, 'iPhone SE 1st / 5s'],
  // iPads
  [2048, 2732, 2, 'iPad Pro 12.9"'],
  [1668, 2388, 2, 'iPad Pro 11"'],
  [1640, 2360, 2, 'iPad Air / 10th gen'],
  [1488, 2266, 2, 'iPad Mini 6th gen'],
  [1536, 2048, 2, 'iPad 9.7"'],
]

async function main() {
  console.log('Generating PWA icons...')

  // Generate app icons
  for (const size of iconSizes) {
    const svg = createIconSvg(size)
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(join(ICONS_DIR, `icon-${size}x${size}.png`))
    console.log(`  icon-${size}x${size}.png`)
  }

  // Generate maskable icon (extra padding for safe zone)
  const maskableSize = 512
  const maskablePadding = Math.round(maskableSize * 0.1) // 10% extra for maskable safe zone
  const maskableSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${maskableSize}" height="${maskableSize}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${EMERALD}" />
        <stop offset="100%" style="stop-color:${EMERALD_DARK}" />
      </linearGradient>
    </defs>
    <rect width="${maskableSize}" height="${maskableSize}" fill="url(#bg)"/>
    <g transform="translate(${maskableSize * 0.25},${maskableSize * 0.25}) scale(${maskableSize * 0.5 / 24})">
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        fill="none" stroke="${WHITE}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>`)
  await sharp(maskableSvg)
    .resize(maskableSize, maskableSize)
    .png()
    .toFile(join(ICONS_DIR, 'maskable-icon-512x512.png'))
  console.log('  maskable-icon-512x512.png')

  // Generate favicon.ico (32x32)
  const faviconSvg = createIconSvg(32)
  await sharp(faviconSvg)
    .resize(32, 32)
    .png()
    .toFile(join(PUBLIC, 'favicon.png'))
  // Also create an ICO-compatible PNG for /favicon.ico
  await sharp(faviconSvg)
    .resize(32, 32)
    .png()
    .toFile(join(ICONS_DIR, 'favicon-32x32.png'))
  console.log('  favicon.png')

  // Generate apple-touch-icon (180x180, no rounded corners - iOS adds its own)
  const appleTouchSize = 180
  const appleTouchSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${appleTouchSize}" height="${appleTouchSize}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${EMERALD}" />
        <stop offset="100%" style="stop-color:${EMERALD_DARK}" />
      </linearGradient>
    </defs>
    <rect width="${appleTouchSize}" height="${appleTouchSize}" fill="url(#bg)"/>
    <g transform="translate(${appleTouchSize * 0.2},${appleTouchSize * 0.2}) scale(${appleTouchSize * 0.6 / 24})">
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        fill="none" stroke="${WHITE}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>`)
  await sharp(appleTouchSvg)
    .resize(appleTouchSize, appleTouchSize)
    .png()
    .toFile(join(PUBLIC, 'apple-touch-icon.png'))
  console.log('  apple-touch-icon.png')

  // Generate splash screens
  console.log('\nGenerating Apple splash screens...')
  for (const [w, h, dpr, desc] of splashScreens) {
    const svg = createSplashSvg(w, h)
    const filename = `splash-${w}x${h}.png`
    await sharp(svg)
      .resize(w, h)
      .png({ quality: 80, compressionLevel: 9 })
      .toFile(join(ICONS_DIR, filename))
    console.log(`  ${filename} (${desc})`)
  }

  console.log('\nDone! Generated all PWA assets.')
}

main().catch(err => {
  console.error('Error generating icons:', err)
  process.exit(1)
})
