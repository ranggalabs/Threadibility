import { ExtractedPost, AnalysisResult, HistoryRecord } from '../shared/types'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
console.log("[Threadibility] BACKEND_URL yang dipakai:", BACKEND_URL);

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
  console.log('[Threadibility] contextMenus.onClicked triggered. info:', info, 'tab:', tab)
  if (info.menuItemId === 'analyze-threads-post' && tab?.id) {
    const tempId = `tb_${Date.now()}`
    
    // Request content script to extract the post that was right-clicked
    console.log('[Threadibility] Sending REQUEST_EXTRACTED_POST message to tab.id:', tab.id, 'tempId:', tempId)
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
    console.log('[Threadibility] Sending INJECT_BADGE message to tabId:', tabId, 'tempId:', tempId, 'analysis:', analysisResult)
    chrome.tabs.sendMessage(tabId, {
      type: 'INJECT_BADGE',
      payload: { tempId, analysis: analysisResult }
    })

  } catch (error) {
    console.error('[Threadibility] handleAnalysis error occurred:', error)
    
    // Set error badge
    chrome.action.setBadgeText({ text: 'ERR', tabId })
    chrome.action.setBadgeBackgroundColor({ color: '#93000a', tabId }) // soft error red

    setTimeout(() => {
      chrome.action.setBadgeText({ text: '', tabId })
    }, 5000)

    // Notify content script of error
    console.log('[Threadibility] Sending ANALYSIS_ERROR message to tabId:', tabId, 'error:', error)
    chrome.tabs.sendMessage(tabId, {
      type: 'ANALYSIS_ERROR',
      payload: { message: error instanceof Error ? error.message : 'Unknown error during analysis' }
    })
  }
}
