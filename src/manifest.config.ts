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
