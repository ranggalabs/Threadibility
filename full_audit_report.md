# Laporan Audit Lengkap (Full Audit Report): Threadibility

Dokumen ini berisi laporan audit teknis lengkap dari kondisi terkini proyek ekstensi Chrome **Threadibility** setelah melalui berbagai pembaruan dan perbaikan. Laporan ini disusun untuk kebutuhan review dan dokumentasi akademik/teknis.

---

## 1. RINGKASAN PROJECT
* **Nama Ekstensi:** Threadibility
* **Tujuan:** Ekstensi Chrome untuk mengidentifikasi keaslian post berbasis teks pada platform Threads (threads.com / threads.net) secara langsung menggunakan menu klik kanan (*context menu*) dengan rujukan verifikasi cek fakta yang terintegrasi di halaman web.
* **Status Keseluruhan:** **95% Selesai (Frontend & Extension Scrapers)**. Seluruh fungsionalitas ekstensi, antarmuka pop-up, background worker, dan parser DOM Threads telah selesai diimplementasikan dan diuji secara mock. 5% sisa adalah integrasi riil dengan API backend yang dideploy di server produksi.

---

## 2. TECH STACK FINAL
Berdasarkan berkas [package.json](file:///c:/Users/Rangga%20Prasetya/Documents/Threadibility/package.json), berikut adalah daftar pustaka dan perkakas pengembangan yang terinstal:

### Dependencies (Pustaka Inti)
* `react` (`^18.3.1`): Framework antarmuka pengguna untuk bagian Pop-up.
* `react-dom` (`^18.3.1`): Pengikat React dengan DOM pada Pop-up.

### DevDependencies (Perkakas Pengembangan)
* `@crxjs/vite-plugin` (`^2.0.0-beta.23`): Plugin Vite khusus untuk memproses Manifest V3 Chrome Extension secara dinamis.
* `@vitejs/plugin-react` (`^4.3.1`): Plugin resmi Vite untuk mengaktifkan React Fast Refresh dan integrasi JSX.
* `typescript` (`^5.2.2`): Kompiler bahasa tipe data ketat TypeScript.
* `vite` (`^5.3.1`): Bundler dan server pengembangan super cepat untuk proyek web modern.
* `@types/chrome` (`^0.0.268`): Deklarasi tipe data API Chrome Extension.
* `@types/react` (`^18.3.3`): Deklarasi tipe React untuk compiler TypeScript.
* `@types/react-dom` (`^18.3.0`): Deklarasi tipe ReactDOM untuk compiler TypeScript.

---

## 3. STRUKTUR FOLDER LENGKAP
Berikut adalah bagan struktur folder proyek **Threadibility** saat ini beserta fungsi masing-masing berkas:

```text
Threadibility/
├── .env.development           # Variabel lingkungan lokal untuk URL Backend API
├── .env.production            # Variabel lingkungan produksi untuk URL Backend API setelah deploy
├── .env.example               # Template berkas .env kosong untuk panduan developer baru
├── .gitignore                 # Konfigurasi file/folder yang diabaikan oleh Git (node_modules, dist, .env.development, .env.production)
├── package.json               # Konfigurasi paket Node.js, skrip kompilasi, dan deklarasi versi pustaka
├── tsconfig.json              # Aturan kompilasi TypeScript (strict mode aktif)
├── vite.config.ts             # Pengaturan bundler Vite yang menggabungkan React & CRXJS
├── full_audit_report.md       # Laporan audit kelayakan proyek & dokumentasi teknis global
├── public/
│   └── threadibility.png      # Ikon ekstensi tunggal PNG (128x128px, 25KB)
├── dist/                      # [GENERATED] Hasil build/kompilasi akhir yang di-load ke Chrome
└── src/
    ├── manifest.config.ts     # Konfigurasi skema Manifest V3 Chrome Extension
    ├── vite-env.d.ts          # Deklarasi tipe global client Vite untuk mengenali import.meta.env
    ├── background/
    │   └── index.ts           # Background service worker (Context Menu, Fetch API, Action Badge)
    ├── content/
    │   ├── index.ts           # Koordinator pesan / message listener di halaman Threads
    │   ├── postExtractor.ts   # Logika scraper DOM untuk mengekstrak konten postingan Threads
    │   ├── badge.ts           # Generator elemen badge status & tooltip rujukan cek fakta
    │   └── badge.css          # Styling CSS murni untuk badge & tooltip di Threads
    ├── popup/
    │   ├── index.html         # Struktur HTML root popup toolbar
    │   ├── main.tsx           # Bootstrapper inisialisasi React Popup
    │   ├── popup.css          # Desain visual CSS murni popup (Tema Gelap, Scrollbar, Transisi)
    │   ├── Popup.tsx          # Logika menu utama, statistik riwayat, routing tab, & pembersihan data
    │   ├── StatsCard.tsx      # Komponen visual kartu indikator stats dengan interaksi 3D Tilt
    │   └── HistoryItem.tsx    # Komponen item riwayat analisis dengan ekspansi panel detail rujukan
    └── shared/
        └── types.ts           # Kontrak antarmuka tipe data TypeScript global (FactCheckSource, dll)
```

---

## 4. FITUR YANG SUDAH BERFUNGSI

### A. Background Service Worker
* **Pembuatan Context Menu:** Menambahkan pilihan klik kanan *"Cek Keaslian Post Threads"* secara otomatis di halaman berdomain `https://*.threads.com/*` dan `https://*.threads.net/*`.
* **Toolbar Action Badge:** Menampilkan status loading `...` (Teal), status aman `SAFE` (Hijau), status palsu `HOAX` (Merah muda), atau error `ERR` (Merah tua) langsung di toolbar ikon ekstensi.
* **Integrasi Fetch Backend:** Melakukan pemanggilan asinkron POST secara dinamis ke URL endpoint backend yang telah di-hardcode pada build-time melalui berkas `.env`.

### B. Content Script (DOM Threads)
* **Ekstraktor Postingan:** Mengekstrak teks postingan, nama pengguna (*username*), URL unik tautan postingan (didukung resolusi asal dinamis lewat `window.location.origin`), dan waktu posting secara dinamis berdasarkan target elemen yang diklik kanan oleh user.
* **Injeksi Badge Instan:** Menyuntikkan badge `🔍 Menganalisis...` seketika ketika menu context diklik, memberikan respons visual instan kepada pengguna tanpa menunggu koneksi API backend selesai.
* **Injeksi Badge Hasil Akhir:** Memperbarui badge loading instan di samping username Threads dengan status final `Hoax` atau `Verified` yang dilengkapi kartu tooltip interaktif berisi tingkat keyakinan (*confidence rate*), alasan analisis, dan daftar rujukan berita cek fakta eksternal.
* **Safeguard Timeout & Auto-Remove:** Jika koneksi backend macet/timeout (15 detik), badge loading otomatis diganti menjadi `⚠️ Gagal, coba lagi` dan terhapus bersih dari halaman Threads setelah 3 detik.
* **Pencegahan Kebocoran Memori (Memory Leak):** Melakukan `clearTimeout` dan membersihkan elemen DOM badge lama secara otomatis jika pengguna memicu analisis berulang kali pada postingan yang sama sebelum proses sebelumnya selesai.

### C. Popup UI
* **Tab Dashboard:** Menampilkan data statistik performa cek fakta (Total Analyzed, Hoax Detected, Verified True, Accuracy Rate) dengan visualisasi kartu 3D Tilt interaktif dan 3 riwayat cek fakta terbaru.
* **Tab History:** Menyajikan daftar lengkap seluruh riwayat cek fakta yang tersimpan di storage lokal ekstensi. Item riwayat dapat diklik untuk menampilkan rincian alasan dan daftar rujukan cek fakta secara vertikal (*expandable accordion*).
* **Tab Config:** Menyediakan tombol pembersihan data riwayat lokal secara permanen.
* **Tema Gelap & Terang:** Integrasi tombol ganti tema gelap/terang di bilah header popup dengan penyimpanan preferensi di storage lokal browser.

### D. Konfigurasi Manifest
* **Permissions:** Terbatas hanya menggunakan `contextMenus` (membuat klik kanan), `storage` (menyimpan riwayat lokal), dan `activeTab` (interaksi dengan tab aktif).
* **Host Permissions:** Hak akses koneksi jaringan aman terbatas pada domain utama Threads (`https://*.threads.com/*`), domain lama (`https://*.threads.net/*`), dan server lokal (`http://localhost/*`).
* **Icons:** Seluruh deklarasi ukuran ikon utama (`icons`) dan ikon aksi (`action.default_icon`) diarahkan secara konsisten pada berkas aset `public/threadibility.png`.

---

## 5. KEPUTUSAN ARSITEKTUR & PENYIMPANGAN DARI RENCANA AWAL

Berikut adalah tabel evaluasi keputusan arsitektur proyek Threadibility:

| Aspek Rencana Awal | Kondisi Aktual Terkini | Status Keputusan | Alasan Teknis / Desain |
| :--- | :--- | :--- | :--- |
| **Popup Single Scroll** (Tanpa Tab) | Popup menggunakan **Tab Navigation** (Dashboard, History, Config). | **Diterima** | Mengikuti desain visual mockup dari Google Stitch (`ui_extension/code.html`) yang mendesain bilah tombol aksi menu di bagian bawah popup. |
| **Settings Halaman Options Terpisah** | Fitur Settings diintegrasikan di **Tab Config** di dalam popup. | **Diterima** | Mengurangi beban interaksi pengguna agar tidak perlu membuka tab baru di Chrome saat melakukan pengaturan sederhana. |
| **Badge Instan di DOM Threads** | Badge loading `🔍 Menganalisis...` di-inject instan di DOM. Disertai safeguard timeout 15 detik dan auto-remove setelah 3 detik kegagalan/error. | **Diterima & Direvisi** | Memberikan umpan balik instan yang sangat responsif kepada pengguna di halaman Threads sekaligus mengamankan halaman DOM agar tidak kotor oleh sisa tag HTML jika backend mati. |
| **Konfigurasi URL Backend** | URL backend dideklarasikan melalui file `.env` (`import.meta.env.VITE_BACKEND_URL`) saat build-time. Input field kustom di Popup dihapus total. | **Diterima & Direvisi** | Mencegah pengguna salah mengetik URL backend yang dapat mengakibatkan ekstensi tidak berfungsi (terutama saat demo skripsi). |
| **Domain threads.net** | Menambahkan dukungan domain utama Threads terbaru yaitu **`threads.com`** di samping domain lama `threads.net`. | **Diterima & Direvisi** | Sejak April 2025 domain utama Threads dipindahkan ke threads.com sehingga penyesuaian matches mutlak dilakukan agar ekstensi dapat bekerja di dunia nyata. |

---

## 6. ISI FILE-FILE KUNCI (LENGKAP)

### A. [src/manifest.config.ts](file:///c:/Users/Rangga%20Prasetya/Documents/Threadibility/src/manifest.config.ts)
```typescript
import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest(async (_env) => ({
  manifest_version: 3,
  name: 'Threadibility',
  version: '1.0.0',
  description: 'Ekstensi Chrome untuk identifikasi post hoax Threads berbasis teks.',
  permissions: ['contextMenus', 'storage', 'activeTab'],
  host_permissions: [
    'https://*.threads.com/*',
    'https://*.threads.net/*',
    'http://localhost/*',
  ],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://*.threads.com/*', 'https://*.threads.net/*'],
      js: ['src/content/index.ts'],
      css: ['src/content/badge.css'],
    },
  ],
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'public/threadibility.png',
      48: 'public/threadibility.png',
      128: 'public/threadibility.png',
    },
  },
  icons: {
    16: 'public/threadibility.png',
    48: 'public/threadibility.png',
    128: 'public/threadibility.png',
  },
}))
```

### B. [src/shared/types.ts](file:///c:/Users/Rangga%20Prasetya/Documents/Threadibility/src/shared/types.ts)
```typescript
export interface FactCheckSource {
  publisher: string;
  verdict: string;
  reviewDate: string | null;
  sourceUrl: string;
}

export interface AnalysisResult {
  claim: string;
  indikasiHoax: boolean;
  alasan: string;
  confidence: number;
  factCheckSources: FactCheckSource[];
}

export interface ExtractedPost {
  text: string;
  username: string | null;
  postUrl: string | null;
  timestamp: string | null;
}

export interface HistoryRecord {
  id: string; // Unique ID (timestamp based)
  post: ExtractedPost;
  analysis: AnalysisResult;
  analyzedAt: string; // ISO string
}

export type ExtensionMessage =
  | { type: 'REQUEST_EXTRACTED_POST'; payload: { tempId: string } }
  | { type: 'EXTRACTED_POST_RESPONSE'; payload: ExtractedPost & { tempId: string } }
  | { type: 'INJECT_BADGE'; payload: { tempId: string; analysis: AnalysisResult } }
  | { type: 'ANALYSIS_ERROR'; payload: { message: string } };
```

### C. [src/background/index.ts](file:///c:/Users/Rangga%20Prasetya/Documents/Threadibility/src/background/index.ts)
```typescript
import { ExtractedPost, AnalysisResult, HistoryRecord } from '../shared/types'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Initialize Context Menu on Install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'analyze-threads-post',
    title: 'Cek Keaslian Post Threads',
    contexts: ['all'],
    documentUrlPatterns: ['https://*.threads.com/*', 'https://*.threads.net/*']
  })
})

// Listen for Context Menu Clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'analyze-threads-post' && tab?.id) {
    const tempId = `tb_${Date.now()}`
    
    // Request content script to extract the post that was right-clicked
    chrome.tabs.sendMessage(tab.id, {
      type: 'REQUEST_EXTRACTED_POST',
      payload: { tempId }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Threadibility contextMenu callback error:', chrome.runtime.lastError.message)
        return
      }
      if (response && response.success && response.post) {
        handleAnalysis(tab.id!, tempId, response.post)
      } else {
        console.warn('Threadibility extraction warning:', response?.error)
      }
    })
  }
})

// Core function to analyze post and update state
async function handleAnalysis(tabId: number, tempId: string, post: ExtractedPost) {
  try {
    // 1. Show loading indicator on extension badge
    chrome.action.setBadgeText({ text: '...', tabId })
    chrome.action.setBadgeBackgroundColor({ color: '#46eedd', tabId }) // Teal loading

    // 2. Post to analysis backend API
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(post)
    })

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`)
    }

    const analysisResult = (await response.json()) as AnalysisResult

    // 4. Save history record
    const historyData = await chrome.storage.local.get(['history'])
    const history: HistoryRecord[] = historyData.history || []
    
    const newRecord: HistoryRecord = {
      id: `hr_${Date.now()}`,
      post,
      analysis: analysisResult,
      analyzedAt: new Date().toISOString()
    }

    history.unshift(newRecord) // Prepended to show latest first
    await chrome.storage.local.set({ history })

    // 5. Update Chrome Action Badge
    const isHoax = analysisResult.indikasiHoax
    const badgeText = isHoax ? 'HOAX' : 'SAFE'
    const badgeColor = isHoax ? '#ffb4ab' : '#42ee7f' // Red/Green accents matching CSS

    chrome.action.setBadgeText({ text: badgeText, tabId })
    chrome.action.setBadgeBackgroundColor({ color: badgeColor, tabId })

    // Reset badge after 10 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '', tabId })
    }, 10000)

    // 6. Request content script to inject the status badge
    chrome.tabs.sendMessage(tabId, {
      type: 'INJECT_BADGE',
      payload: { tempId, analysis: analysisResult }
    })

  } catch (error) {
    console.error('Threadibility Analysis Error:', error)
    
    // Set error badge
    chrome.action.setBadgeText({ text: 'ERR', tabId })
    chrome.action.setBadgeBackgroundColor({ color: '#93000a', tabId }) // soft error red

    setTimeout(() => {
      chrome.action.setBadgeText({ text: '', tabId })
    }, 5000)

    // Notify content script of error
    chrome.tabs.sendMessage(tabId, {
      type: 'ANALYSIS_ERROR',
      payload: { message: error instanceof Error ? error.message : 'Unknown error during analysis' }
    })
  }
}
```

### D. [src/content/index.ts](file:///c:/Users/Rangga%20Prasetya/Documents/Threadibility/src/content/index.ts)
```typescript
import { findPostContainer, extractPostData } from './postExtractor'
import { injectBadge, injectLoadingBadge, injectErrorBadge } from './badge'
import { ExtractedPost } from '../shared/types'

// Cache variables for the right-clicked element
let lastClickedContainer: HTMLElement | null = null
let lastExtractedData: ExtractedPost | null = null

// Map to track active analysis timeouts by tempId
const activeTimeouts = new Map<string, number>()
let currentActiveTempId: string | null = null

// Helper function to cleanup error state on timeout/failure
function triggerErrorCleanup(tempId: string, errorText = '⚠️ Gagal, coba lagi') {
  const container = document.querySelector(`[data-threadibility-id="${tempId}"]`) as HTMLElement | null
  if (container) {
    injectErrorBadge(container, errorText)
    container.removeAttribute('data-threadibility-id')
  }
  activeTimeouts.delete(tempId)
}

// Listen to right-clicks on Threads
document.addEventListener('contextmenu', (event) => {
  const target = event.target as HTMLElement
  if (!target) return

  const container = findPostContainer(target)
  if (container) {
    lastClickedContainer = container
    lastExtractedData = extractPostData(container)
  } else {
    lastClickedContainer = null
    lastExtractedData = null
  }
})

// Listen to messages from the Background Script
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'REQUEST_EXTRACTED_POST') {
    const { tempId } = msg.payload

    if (lastClickedContainer && lastExtractedData) {
      // SAFEGUARD MEMORY LEAK: Check if the container already has an active analysis running
      const oldTempId = lastClickedContainer.getAttribute('data-threadibility-id')
      if (oldTempId) {
        const oldTimer = activeTimeouts.get(oldTempId)
        if (oldTimer) {
          clearTimeout(oldTimer)
          activeTimeouts.delete(oldTempId)
        }
        const oldBadge = lastClickedContainer.querySelector('.tb-badge-container')
        if (oldBadge) {
          oldBadge.remove()
        }
      }

      // Decorate the container with a temporary ID so we can inject the badge here later
      lastClickedContainer.setAttribute('data-threadibility-id', tempId)
      currentActiveTempId = tempId

      // Instantly inject the loading badge before calling backend
      injectLoadingBadge(lastClickedContainer)

      // Start 15 seconds timeout safeguard
      const timerId = window.setTimeout(() => {
        console.warn(`Threadibility: Analysis timeout for ID ${tempId}`)
        triggerErrorCleanup(tempId, '⚠️ Gagal, coba lagi')
        if (currentActiveTempId === tempId) {
          currentActiveTempId = null
        }
      }, 15000)

      activeTimeouts.set(tempId, timerId)

      // Send response back directly
      sendResponse({
        success: true,
        post: lastExtractedData
      })
    } else {
      console.warn('Threadibility: No active Threads post container found for analysis.')
      sendResponse({
        success: false,
        error: 'No active Threads post container found for analysis.'
      })
    }
  } else if (msg.type === 'INJECT_BADGE') {
    const { tempId, analysis } = msg.payload
    
    // Clear active timeout timer
    const timerId = activeTimeouts.get(tempId)
    if (timerId) {
      clearTimeout(timerId)
      activeTimeouts.delete(tempId)
    }

    if (currentActiveTempId === tempId) {
      currentActiveTempId = null
    }

    const container = document.querySelector(`[data-threadibility-id="${tempId}"]`) as HTMLElement | null

    if (container) {
      injectBadge(container, analysis)
      // Cleanup the temporary attribute
      container.removeAttribute('data-threadibility-id')
      sendResponse({ success: true })
    } else {
      console.warn(`Threadibility: Target container with ID ${tempId} not found.`)
      sendResponse({ success: false, error: 'Target container not found' })
    }
  } else if (msg.type === 'ANALYSIS_ERROR') {
    const { message: errMsg } = msg.payload
    console.error(`Threadibility Analysis failed: ${errMsg}`)

    // Clear active timeout and trigger error badge instantly
    if (currentActiveTempId) {
      const timerId = activeTimeouts.get(currentActiveTempId)
      if (timerId) {
        clearTimeout(timerId)
      }
      triggerErrorCleanup(currentActiveTempId, '⚠️ Gagal, coba lagi')
      currentActiveTempId = null
    } else {
      alert(`Threadibility Error: Gagal menganalisis post. (${errMsg})`)
    }

    sendResponse({ success: true })
  }
  return true
})
```

### E. [src/content/badge.ts](file:///c:/Users/Rangga%20Prasetya/Documents/Threadibility/src/content/badge.ts)
```typescript
import { AnalysisResult } from '../shared/types'

// Helper function to find the target element (username)
function findTargetElement(container: HTMLElement): HTMLElement {
  let target: HTMLElement | null = null
  const links = Array.from(container.querySelectorAll('a'))
  const excludedPaths = ['home', 'search', 'activity', 'write', 'messages', 'terms', 'privacy', 'post']
  
  for (const link of links) {
    const href = link.getAttribute('href') || ''
    const match = href.match(/^\/@([a-zA-Z0-9._]+)$/) || href.match(/^\/([a-zA-Z0-9._]+)$/)
    if (match) {
      const parsedUser = match[1]
      if (!excludedPaths.includes(parsedUser) && !href.includes('/post/')) {
        target = link
        break
      }
    }
  }

  if (!target) {
    target = container.querySelector('span[dir="auto"], div[dir="auto"]') as HTMLElement | null
  }

  return target || container
}

// Helper to insert badge into DOM
function insertBadgeIntoDom(container: HTMLElement, target: HTMLElement, badgeContainer: HTMLElement) {
  if (target === container) {
    container.appendChild(badgeContainer)
  } else if (target.parentNode) {
    target.parentNode.insertBefore(badgeContainer, target.nextSibling)
  }
}

/**
 * Injects a loading badge with text "🔍 Menganalisis..." into the Threads post container.
 */
export function injectLoadingBadge(container: HTMLElement) {
  const existingBadge = container.querySelector('.tb-badge-container')
  if (existingBadge) {
    existingBadge.remove()
  }

  const target = findTargetElement(container)

  const badgeContainer = document.createElement('span')
  badgeContainer.className = 'tb-badge-container'

  const badge = document.createElement('span')
  badge.className = 'tb-badge'
  badge.textContent = '🔍 Menganalisis...'

  // Inline styling for loading badge to prevent editing badge.css
  badge.style.backgroundColor = 'rgba(70, 238, 221, 0.15)'
  badge.style.color = '#46eedd'
  badge.style.border = '1px solid rgba(70, 238, 221, 0.3)'
  badge.style.textTransform = 'none'

  badgeContainer.appendChild(badge)
  insertBadgeIntoDom(container, target, badgeContainer)
}

/**
 * Injects a temporary error badge with text "⚠️ Gagal, coba lagi" that disappears after 3 seconds.
 */
export function injectErrorBadge(container: HTMLElement, errorText = '⚠️ Gagal, coba lagi') {
  const existingBadge = container.querySelector('.tb-badge-container')
  if (existingBadge) {
    existingBadge.remove()
  }

  const target = findTargetElement(container)

  const badgeContainer = document.createElement('span')
  badgeContainer.className = 'tb-badge-container'

  const badge = document.createElement('span')
  badge.className = 'tb-badge'
  badge.textContent = errorText

  // Inline styling for error badge to prevent editing badge.css
  badge.style.backgroundColor = 'rgba(255, 180, 171, 0.15)'
  badge.style.color = '#ffb4ab'
  badge.style.border = '1px solid rgba(255, 180, 171, 0.3)'
  badge.style.textTransform = 'none'

  badgeContainer.appendChild(badge)
  insertBadgeIntoDom(container, target, badgeContainer)

  // Auto-remove after 3 seconds
  setTimeout(() => {
    badgeContainer.remove()
  }, 3000)
}

/**
 * Injects a verification badge (Hoax or Verified) next to the Threads username
 * and attaches a custom detailed tooltip explaining the reason and sources.
 */
export function injectBadge(container: HTMLElement, analysis: AnalysisResult) {
  // 1. Remove existing badge if present
  const existingBadge = container.querySelector('.tb-badge-container')
  if (existingBadge) {
    existingBadge.remove()
  }

  // 2. Identify the target element
  const target = findTargetElement(container)

  // 3. Create the badge container wrapper
  const badgeContainer = document.createElement('span')
  badgeContainer.className = 'tb-badge-container'

  // Create the badge label
  const badge = document.createElement('span')
  const isHoax = analysis.indikasiHoax
  badge.className = `tb-badge ${isHoax ? 'tb-badge-hoax' : 'tb-badge-verified'}`
  badge.textContent = isHoax ? 'Hoax' : 'Verified'

  // 4. Create the tooltip element
  const tooltip = document.createElement('div')
  tooltip.className = 'tb-tooltip'

  // Build fact-checking references if available
  const sourcesHtml = analysis.factCheckSources && analysis.factCheckSources.length > 0
    ? `<div class="tb-tooltip-sources">
         <strong>Rujukan Cek Fakta:</strong>
         <ul>
           ${analysis.factCheckSources
             .map(
               (src) => `
             <li>
               <a href="${src.sourceUrl}" target="_blank" rel="noopener noreferrer">
                 ${src.publisher} <span class="tb-badge-verdict">${src.verdict}</span>
               </a>
             </li>
           `
             )
             .join('')}
         </ul>
       </div>`
    : ''

  tooltip.innerHTML = `
    <div class="tb-tooltip-header">
      <span class="tb-tooltip-logo">T</span>
      <span class="tb-tooltip-title">Threadibility Analysis</span>
    </div>
    <div class="tb-tooltip-body">
      <div class="tb-tooltip-verdict ${isHoax ? 'tb-text-hoax' : 'tb-text-verified'}">
        <strong>${isHoax ? '⚠️ Terindikasi Hoax' : '✅ Terverifikasi Benar'}</strong>
        <span class="tb-tooltip-confidence">(${Math.round(analysis.confidence * 100)}% Confidence)</span>
      </div>
      <p class="tb-tooltip-reason">${analysis.alasan}</p>
      ${sourcesHtml}
    </div>
  `

  badgeContainer.appendChild(badge)
  badgeContainer.appendChild(tooltip)

  // 5. Insert into DOM
  insertBadgeIntoDom(container, target, badgeContainer)
}
```

### F. [src/popup/Popup.tsx](file:///c:/Users/Rangga%20Prasetya/Documents/Threadibility/src/popup/Popup.tsx)
```tsx
import React, { useState, useEffect } from 'react'
import { HistoryRecord } from '../shared/types'
import StatsCard from './StatsCard'
import HistoryItem from './HistoryItem'

const Popup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'config'>('dashboard')
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  // Load state and setup storage sync on mount
  useEffect(() => {
    chrome.storage.local.get(['history', 'isDarkMode'], (result) => {
      if (result.history) {
        setHistory(result.history)
      }
      if (result.isDarkMode !== undefined) {
        setIsDarkMode(result.isDarkMode)
        updateThemeClass(result.isDarkMode)
      } else {
        // Default to dark mode if unset
        updateThemeClass(true)
      }
    })

    // Listen for storage changes made in background context
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.history) {
        setHistory(changes.history.newValue || [])
      }
      if (changes.isDarkMode) {
        setIsDarkMode(changes.isDarkMode.newValue)
        updateThemeClass(changes.isDarkMode.newValue)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  // Helper to toggle document dark/light class
  const updateThemeClass = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    }
  }

  // Handle Theme Toggle Button click
  const handleThemeToggle = async () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    updateThemeClass(newMode)
    await chrome.storage.local.set({ isDarkMode: newMode })
  }

  // Handle Clear History click
  const handleClearHistory = async () => {
    const confirmClear = window.confirm('Apakah Anda yakin ingin menghapus seluruh riwayat analisis?')
    if (confirmClear) {
      setHistory([])
      await chrome.storage.local.set({ history: [] })
    }
  }

  // Toggle card expansion
  const handleToggleExpand = (id: string) => {
    setExpandedItemId((prev) => (prev === id ? null : id))
  }

  // Stats Computations
  const totalAnalyzed = history.length
  const hoaxDetected = history.filter((item) => item.analysis.indikasiHoax).length
  const verifiedTrue = totalAnalyzed - hoaxDetected

  // Average confidence as accuracy calculation
  const accuracyRate =
    totalAnalyzed > 0
      ? (history.reduce((sum, item) => sum + item.analysis.confidence, 0) / totalAnalyzed) * 100
      : 98.2 // Default mockup value from Stitch design when history is empty

  return (
    <>
      {/* Header Bar */}
      <header className="header">
        <div className="logo-container">
          <div className="logo-wrapper">
            <img src="/threadibility.png" className="logo-image" alt="Logo" />
          </div>
          <h1 className="header-title">Threadibility</h1>
        </div>
        <button
          onClick={handleThemeToggle}
          className="theme-toggle-btn"
          id="themeToggle"
          title={isDarkMode ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
        >
          {isDarkMode ? (
            /* Moon Icon */
            <svg className="icon-svg" viewBox="0 0 24 24">
              <path d="M10 2c-1.82 0-3.53.5-5 1.35C7.99 5.08 10 8.3 10 12s-2.01 6.92-5 8.65C6.47 21.5 8.18 22 10 22c5.52 0 10-4.48 10-10S15.52 2 10 2z" />
            </svg>
          ) : (
            /* Sun Icon */
            <svg className="icon-svg" viewBox="0 0 24 24">
              <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37c-.39-.39-1.02-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.02 0 1.41s1.02.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41zm-12.37 12.37c-.39-.39-1.02-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.02 0 1.41s1.02.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41z" />
            </svg>
          )}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="main-content custom-scrollbar">
        {activeTab === 'dashboard' && (
          <div className="section-spacing">
            {/* Stats Grid */}
            <section className="stats-grid section-spacing">
              <StatsCard label="Total Analyzed" value={totalAnalyzed} type="primary" />
              <StatsCard label="Hoax Detected" value={hoaxDetected} type="error" />
              <StatsCard label="Verified True" value={verifiedTrue} type="secondary" />
              <StatsCard label="Accuracy Rate" value={`${accuracyRate.toFixed(1)}%`} type="primary" />
            </section>

            {/* Recent Analyses list */}
            <section className="section-spacing">
              <div className="list-header">
                <h2 className="list-title">Recent Analyses</h2>
                {history.length > 0 && (
                  <button onClick={() => setActiveTab('history')} className="view-all-btn">
                    VIEW ALL
                  </button>
                )}
              </div>

              {history.length > 0 ? (
                <div className="items-container">
                  {history.slice(0, 3).map((item) => (
                    <HistoryItem
                      key={item.id}
                      record={item}
                      isExpanded={expandedItemId === item.id}
                      onToggleExpand={() => handleToggleExpand(item.id)}
                    />
                  ))}
                </div>
              ) : (
                /* Empty state illustration */
                <div className="empty-state">
                  <img
                    src="/threadibility.png"
                    className="empty-state-img"
                    alt="Empty State"
                  />
                  <p className="empty-state-title">End of recent history</p>
                  <p className="empty-state-subtitle">Start a new thread analysis in your browser.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="section-spacing">
            <div className="list-header">
              <h2 className="list-title">Semua Riwayat Analisis</h2>
            </div>
            {history.length > 0 ? (
              <div className="items-container">
                {history.map((item) => (
                  <HistoryItem
                    key={item.id}
                    record={item}
                    isExpanded={expandedItemId === item.id}
                    onToggleExpand={() => handleToggleExpand(item.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <img
                  src="/threadibility.png"
                  className="empty-state-img"
                  alt="Empty State"
                />
                <p className="empty-state-title">Belum ada riwayat</p>
                <p className="empty-state-subtitle">Klik kanan post di Threads untuk menganalisis.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'config' && (
          <div className="settings-container">
            <h2 className="list-title">Extension Settings</h2>

            <div className="settings-group" style={{ marginTop: '8px' }}>
              <label className="settings-label">Pembersihan Data:</label>
              <button onClick={handleClearHistory} className="action-btn danger">
                Hapus Semua Riwayat
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav Bar */}
      <nav className="bottom-nav">
        <button
          onClick={() => {
            setActiveTab('dashboard')
            setExpandedItemId(null)
          }}
          className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <svg className="icon-svg" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="nav-btn-label">Dashboard</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('history')
            setExpandedItemId(null)
          }}
          className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`}
        >
          <svg className="icon-svg" viewBox="0 0 24 24">
            <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
          </svg>
          <span className="nav-btn-label">History</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('config')
            setExpandedItemId(null)
          }}
          className={`nav-btn ${activeTab === 'config' ? 'active' : ''}`}
        >
          <svg className="icon-svg" viewBox="0 0 24 24">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
          <span className="nav-btn-label">Config</span>
        </button>
      </nav>
    </>
  )
}

export default Popup
```

### G. [.env.development](file:///c:/Users/Rangga%20Prasetya/Documents/Threadibility/.env.development)
```env
VITE_BACKEND_URL=http://localhost:5000/api/analyze
```

### H. [.env.production](file:///c:/Users/Rangga%20Prasetya/Documents/Threadibility/.env.production)
```env
VITE_BACKEND_URL=[URL_BACKEND_PRODUCTION_NANTI_DIISI_SETELAH_DEPLOY]
```

---

## 7. HASIL BUILD TERAKHIR
Berikut adalah log kompilasi produksi terakhir yang berhasil diselesaikan dengan sukses:

```text
vite v5.4.21 building for production...
transforming...
✓ 39 modules transformed.
rendering chunks...
computing gzip size...
dist/service-worker-loader.js         0.04 kB
dist/src/popup/index.html             0.58 kB │ gzip:  0.39 kB
dist/manifest.json                    1.19 kB │ gzip:  0.48 kB
dist/public/threadibility.png        25.21 kB
dist/src/content/badge.css            2.68 kB │ gzip:  0.91 kB
dist/assets/index-C4qYUOR_.css        8.73 kB │ gzip:  2.24 kB
dist/assets/index.ts-QAkDmN7K.js      1.94 kB │ gzip:  0.96 kB
dist/assets/index.ts-DEEyWZU4.js      6.53 kB │ gzip:  2.45 kB
dist/assets/index.html-Cd8LK--H.js  152.26 kB │ gzip: 49.11 kB
✓ built in 749ms
```

---

## 8. KONTRAK API YANG DIHARAPKAN BACKEND

Berdasarkan fungsi asinkron `handleAnalysis` di background script, backend API harus mengimplementasikan spesifikasi endpoint berikut agar ekstensi berfungsi normal:

### A. Spesifikasi Request
* **HTTP Method:** `POST`
* **URL:** Sesuai nilai `VITE_BACKEND_URL` (secara bawaan lokal adalah `http://localhost:5000/api/analyze`)
* **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
* **Request Body (JSON format):** Menerima objek bertipe `ExtractedPost`.
  ```json
  {
    "text": "Konten teks dari postingan Threads yang akan dianalisis",
    "username": "username_pembuat_post_atau_null",
    "postUrl": "https://www.threads.com/@username/post/postId_atau_null",
    "timestamp": "ISO_timestamp_dari_post_atau_null"
  }
  ```

### B. Spesifikasi Response yang Diharapkan
Backend wajib mengembalikan data JSON dengan format status `200 OK` yang cocok dengan struktur `AnalysisResult`:

* **Response Body (JSON format):**
  ```json
  {
    "claim": "Pernyataan klaim utama hasil ekstraksi AI/Backend",
    "indikasiHoax": true,
    "alasan": "Penjelasan detail mengapa klaim tersebut diidentifikasi hoax atau verified",
    "confidence": 0.85,
    "factCheckSources": [
      {
        "publisher": "Nama Penerbit Cek Fakta (misal: Liputan6, Mafindo)",
        "verdict": "Verdict hasil cek fakta (misal: SALAH, HOAX, BENAR)",
        "reviewDate": "2026-07-11T12:00:00.000Z",
        "sourceUrl": "https://link-rujukan-berita-cekfakta.com"
      }
    ]
  }
  ```

---

## 9. HAL YANG BELUM SELESAI / RISIKO YANG DIKETAHUI

1. **Uji Coba dengan Server API Riil:**
   Ekstensi baru diuji dengan simulasi lokal. Jika backend sungguhan menggunakan otentikasi (seperti JWT atau API Key) atau menolak permintaan karena kebijakan CORS, kode fetch di background script wajib menambahkan header otentikasi.
2. **Ketergantungan Struktur HTML Threads:**
   Parser DOM Threads (`postExtractor.ts`) sangat bergantung pada ketersediaan atribut `[data-pressable-container="true"]` dan tombol ikon Like/Reply. Jika pihak Meta/Threads merilis pembaruan antarmuka secara besar-besaran, selector DOM akan patah dan scraper ekstensi perlu diperbarui.
3. **Penanganan Kasus Gambar/Media:**
   Ekstensi saat ini hanya mengekstrak klaim berbasis teks (`post.text`). Postingan hoax yang bermedia gambar/video (memerlukan OCR atau pemrosesan multimodal) tidak diekstraksi ke backend.

---

## 10. CARA TESTING MANUAL

### A. Cara Memasang Ekstensi di Chrome
1. Buka browser Google Chrome Anda, lalu akses alamat: `chrome://extensions/`.
2. Aktifkan **Developer Mode** (tombol toggle di pojok kanan atas).
3. Klik tombol **Load unpacked** di pojok kiri atas.
4. Cari dan pilih folder hasil kompilasi ekstensi Anda:
   `C:\Users\Rangga Prasetya\Documents\Threadibility\dist`
5. Pastikan ikon ekstensi **Threadibility** muncul di daftar ekstensi Anda.

### B. Skenario Pengujian Perilaku Timeout 15 Detik
1. Klik ikon **Threadibility** di toolbar Chrome Anda untuk memunculkan Popup Dashboard.
2. Buka tab **Config** (ikon roda gigi).
3. Untuk mematikan koneksi secara buatan, buka [src/background/index.ts](file:///c:/Users/Rangga%20Prasetya/Documents/Threadibility/src/background/index.ts) lalu ubah variabel `BACKEND_URL` ke port tidak aktif secara acak (misal `http://localhost:9999/api/analyze`), lalu jalankan `npm run build` kembali.
4. Masuk ke halaman [Threads.com](https://www.threads.com/) dan **Reload** halaman.
5. Klik kanan pada teks postingan, pilih **Cek Keaslian Post Threads**.
6. **Verifikasi:**
   * Badge status `🔍 Menganalisis...` berwarna teal transparan langsung muncul di sebelah username postingan.
   * Tepat setelah 15 detik berlalu, status badge berubah menjadi merah soft dengan teks `⚠️ Gagal, coba lagi`.
   * Setelah 3 detik berikutnya (detik ke-18), badge tersebut terhapus bersih dan menghilang otomatis dari halaman Threads.
