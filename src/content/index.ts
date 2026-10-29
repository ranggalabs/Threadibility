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
  console.log('[Threadibility] Contextmenu triggered on target:', target)

  const container = findPostContainer(target)
  console.log('[Threadibility] findPostContainer result:', container)
  if (container) {
    lastClickedContainer = container
    lastExtractedData = extractPostData(container)
    console.log('[Threadibility] extractPostData result:', lastExtractedData)
  } else {
    lastClickedContainer = null
    lastExtractedData = null
  }
})

// Listen to messages from the Background Script
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'REQUEST_EXTRACTED_POST') {
    const { tempId } = msg.payload
    console.log('[Threadibility] Received REQUEST_EXTRACTED_POST. lastClickedContainer:', lastClickedContainer, 'lastExtractedData:', lastExtractedData)

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
      console.log('[Threadibility] Calling injectLoadingBadge for container:', lastClickedContainer, 'tempId:', tempId)
      injectLoadingBadge(lastClickedContainer)

      // Start 75 seconds timeout safeguard (web search + AI reasoning can be slow)
      const timerId = window.setTimeout(() => {
        console.warn(`Threadibility: Analysis timeout for ID ${tempId}`)
        triggerErrorCleanup(tempId, '⚠️ Gagal, coba lagi')
        if (currentActiveTempId === tempId) {
          currentActiveTempId = null
        }
      }, 75000)

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
      console.log('[Threadibility] Calling injectBadge for container:', container, 'tempId:', tempId, 'analysis:', analysis)
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
      console.log('[Threadibility] Handling ANALYSIS_ERROR for currentActiveTempId:', currentActiveTempId)
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
