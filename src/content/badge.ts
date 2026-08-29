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
  console.log('[Threadibility] insertBadgeIntoDom called. container:', container, 'target:', target, 'badgeContainer:', badgeContainer)
  if (target === container) {
    container.appendChild(badgeContainer)
    console.log('[Threadibility] Badge successfully injected directly to container')
  } else if (target.parentNode) {
    target.parentNode.insertBefore(badgeContainer, target.nextSibling)
    console.log('[Threadibility] Badge successfully injected next to target username element')
  } else {
    console.warn('[Threadibility] insertBadgeIntoDom failed: target.parentNode is null')
  }
}

/**
 * Injects a loading badge with text "🔍 Menganalisis..." into the Threads post container.
 */
export function injectLoadingBadge(container: HTMLElement) {
  console.log('[Threadibility] injectLoadingBadge called. container exists:', !!container)
  const existingBadge = container.querySelector('.tb-badge-container')
  if (existingBadge) {
    console.log('[Threadibility] Removing existing loading/final badge container before injecting new loading badge')
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
  console.log('[Threadibility] injectErrorBadge called. container exists:', !!container, 'errorText:', errorText)
  const existingBadge = container.querySelector('.tb-badge-container')
  if (existingBadge) {
    console.log('[Threadibility] Removing existing badge container before injecting error badge')
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
  console.log('[Threadibility] injectBadge called. container exists:', !!container, 'analysis:', analysis)
  // 1. Remove existing badge if present
  const existingBadge = container.querySelector('.tb-badge-container')
  if (existingBadge) {
    console.log('[Threadibility] Removing existing badge container before injecting final result badge')
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
