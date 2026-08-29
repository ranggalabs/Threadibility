import { ExtractedPost } from '../shared/types'

/**
 * Finds the Threads post container from the right-clicked element.
 * Selector: [data-pressable-container="true"]
 * Fallback: Traverse ancestors to find one containing both Like and Reply SVGs.
 */
export function findPostContainer(target: HTMLElement): HTMLElement | null {
  // 1. Primary selector: closest container
  let container = target.closest('[data-pressable-container="true"]') as HTMLElement | null

  // 2. Fallback: Search ancestor containing Like and Reply buttons
  if (!container) {
    let current: HTMLElement | null = target
    while (current && current !== document.body) {
      const hasLike = current.querySelector('svg[aria-label="Like"]') || current.querySelector('svg[aria-label="Suka"]')
      const hasReply = current.querySelector('svg[aria-label="Reply"]') || current.querySelector('svg[aria-label="Balas"]')
      
      if (hasLike && hasReply) {
        container = current
        break
      }
      current = current.parentElement
    }
  }

  return container
}

/**
 * Extracts post details (text, username, post URL, timestamp) from a post container.
 */
export function extractPostData(container: HTMLElement): ExtractedPost {
  // 1. Extract Username
  // Threads profile URLs are generally "/@username" or "/username" (excluding common paths)
  let username: string | null = null
  const links = Array.from(container.querySelectorAll('a'))
  const excludedPaths = ['home', 'search', 'activity', 'write', 'messages', 'terms', 'privacy', 'post']
  
  for (const link of links) {
    const href = link.getAttribute('href') || ''
    const match = href.match(/^\/@([a-zA-Z0-9._]+)$/) || href.match(/^\/([a-zA-Z0-9._]+)$/)
    if (match) {
      const parsedUser = match[1]
      if (!excludedPaths.includes(parsedUser) && !href.includes('/post/')) {
        username = parsedUser
        break
      }
    }
  }

  // Fallback for username: search for elements with bold styling or typical username text
  if (!username) {
    const usernameEl = container.querySelector('span[style*="font-weight: 600"], span[style*="font-weight: 700"]')
    if (usernameEl) {
      username = usernameEl.textContent?.trim() || null
    }
  }

  // 2. Extract Post URL
  let postUrl: string | null = null
  const postLinkEl = container.querySelector('a[href*="/post/"]') as HTMLAnchorElement | null
  if (postLinkEl) {
    const href = postLinkEl.getAttribute('href')
    if (href) {
      postUrl = href.startsWith('http') ? href : `${window.location.origin}${href}`
    }
  }

  // 3. Extract Timestamp
  let timestamp: string | null = null
  const timeEl = container.querySelector('time')
  if (timeEl) {
    timestamp = timeEl.getAttribute('datetime') || timeEl.textContent?.trim() || null
  }

  if (!timestamp) {
    // Search links or spans for short relative times like "2h", "15m", "1d"
    const textElements = Array.from(container.querySelectorAll('span, a'))
    for (const el of textElements) {
      const text = el.textContent?.trim() || ''
      if (/^\d+[hdmwy]$/.test(text) || /^\d+\s*(hr|min|day|sec|yr)s?\s*ago$/i.test(text)) {
        timestamp = text
        break
      }
    }
  }

  // 4. Extract Post Body Text
  let text = ''
  // In React Native Web, text is inside elements with dir="auto"
  const candidates = Array.from(container.querySelectorAll('span[dir="auto"], div[dir="auto"]'))
  
  const bodyCandidates = candidates.filter((el) => {
    const txt = el.textContent?.trim() || ''
    if (!txt) return false
    // Exclude username matches
    if (username && (txt === username || txt === `@${username}`)) return false
    // Exclude relative timestamp
    if (timestamp && txt === timestamp) return false
    // Exclude action buttons
    const lowerTxt = txt.toLowerCase()
    if (['reply', 'repost', 'like', 'share', 'view activity', 'balas', 'suka'].includes(lowerTxt)) return false
    // Exclude digit counts (like number of replies/likes)
    if (/^\d+$/.test(txt)) return false
    return true
  })

  if (bodyCandidates.length > 0) {
    // The main post body is typically the longest element amongst candidates
    const longest = bodyCandidates.reduce((acc, curr) => {
      return (curr.textContent?.length || 0) > (acc.textContent?.length || 0) ? curr : acc
    }, bodyCandidates[0])
    text = longest.textContent?.trim() || ''
  }

  // Ultimate fallback if text extraction fails: clean up full text content
  if (!text) {
    const rawText = container.textContent || ''
    text = rawText.trim()
  }

  return {
    text,
    username: username ? `@${username.replace('@', '')}` : null,
    postUrl,
    timestamp
  }
}
