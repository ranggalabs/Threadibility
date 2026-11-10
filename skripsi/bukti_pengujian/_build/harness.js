"use strict";
(() => {
  // ../../src/content/postExtractor.ts
  function findPostContainer(target) {
    let container = target.closest('[data-pressable-container="true"]');
    if (!container) {
      let current = target;
      while (current && current !== document.body) {
        const hasLike = current.querySelector('svg[aria-label="Like"]') || current.querySelector('svg[aria-label="Suka"]');
        const hasReply = current.querySelector('svg[aria-label="Reply"]') || current.querySelector('svg[aria-label="Balas"]');
        if (hasLike && hasReply) {
          container = current;
          break;
        }
        current = current.parentElement;
      }
    }
    return container;
  }
  function extractPostData(container) {
    let username = null;
    const links = Array.from(container.querySelectorAll("a"));
    const excludedPaths = ["home", "search", "activity", "write", "messages", "terms", "privacy", "post"];
    for (const link of links) {
      const href = link.getAttribute("href") || "";
      const match = href.match(/^\/@([a-zA-Z0-9._]+)$/) || href.match(/^\/([a-zA-Z0-9._]+)$/);
      if (match) {
        const parsedUser = match[1];
        if (!excludedPaths.includes(parsedUser) && !href.includes("/post/")) {
          username = parsedUser;
          break;
        }
      }
    }
    if (!username) {
      const usernameEl = container.querySelector('span[style*="font-weight: 600"], span[style*="font-weight: 700"]');
      if (usernameEl) {
        username = usernameEl.textContent?.trim() || null;
      }
    }
    let postUrl = null;
    const postLinkEl = container.querySelector('a[href*="/post/"]');
    if (postLinkEl) {
      const href = postLinkEl.getAttribute("href");
      if (href) {
        postUrl = href.startsWith("http") ? href : `${window.location.origin}${href}`;
      }
    }
    let timestamp = null;
    const timeEl = container.querySelector("time");
    if (timeEl) {
      timestamp = timeEl.getAttribute("datetime") || timeEl.textContent?.trim() || null;
    }
    if (!timestamp) {
      const textElements = Array.from(container.querySelectorAll("span, a"));
      for (const el of textElements) {
        const text2 = el.textContent?.trim() || "";
        if (/^\d+[hdmwy]$/.test(text2) || /^\d+\s*(hr|min|day|sec|yr)s?\s*ago$/i.test(text2)) {
          timestamp = text2;
          break;
        }
      }
    }
    let text = "";
    const candidates = Array.from(container.querySelectorAll('span[dir="auto"], div[dir="auto"]'));
    const bodyCandidates = candidates.filter((el) => {
      const txt = el.textContent?.trim() || "";
      if (!txt) return false;
      if (username && (txt === username || txt === `@${username}`)) return false;
      if (timestamp && txt === timestamp) return false;
      const lowerTxt = txt.toLowerCase();
      if (["reply", "repost", "like", "share", "view activity", "balas", "suka"].includes(lowerTxt)) return false;
      if (/^\d+$/.test(txt)) return false;
      return true;
    });
    if (bodyCandidates.length > 0) {
      const longest = bodyCandidates.reduce((acc, curr) => {
        return (curr.textContent?.length || 0) > (acc.textContent?.length || 0) ? curr : acc;
      }, bodyCandidates[0]);
      text = longest.textContent?.trim() || "";
    }
    if (!text) {
      const rawText = container.textContent || "";
      text = rawText.trim();
    }
    return {
      text,
      username: username ? `@${username.replace("@", "")}` : null,
      postUrl,
      timestamp
    };
  }

  // ../../src/content/badge.ts
  function findTargetElement(container) {
    let target = null;
    const links = Array.from(container.querySelectorAll("a"));
    const excludedPaths = ["home", "search", "activity", "write", "messages", "terms", "privacy", "post"];
    for (const link of links) {
      const href = link.getAttribute("href") || "";
      const match = href.match(/^\/@([a-zA-Z0-9._]+)$/) || href.match(/^\/([a-zA-Z0-9._]+)$/);
      if (match) {
        const parsedUser = match[1];
        if (!excludedPaths.includes(parsedUser) && !href.includes("/post/")) {
          target = link;
          break;
        }
      }
    }
    if (!target) {
      target = container.querySelector('span[dir="auto"], div[dir="auto"]');
    }
    return target || container;
  }
  function insertBadgeIntoDom(container, target, badgeContainer) {
    console.log("[Threadibility] insertBadgeIntoDom called. container:", container, "target:", target, "badgeContainer:", badgeContainer);
    if (target === container) {
      container.appendChild(badgeContainer);
      console.log("[Threadibility] Badge successfully injected directly to container");
    } else if (target.parentNode) {
      target.parentNode.insertBefore(badgeContainer, target.nextSibling);
      console.log("[Threadibility] Badge successfully injected next to target username element");
    } else {
      console.warn("[Threadibility] insertBadgeIntoDom failed: target.parentNode is null");
    }
  }
  function injectLoadingBadge(container) {
    console.log("[Threadibility] injectLoadingBadge called. container exists:", !!container);
    const existingBadge = container.querySelector(".tb-badge-container");
    if (existingBadge) {
      console.log("[Threadibility] Removing existing loading/final badge container before injecting new loading badge");
      existingBadge.remove();
    }
    const target = findTargetElement(container);
    const badgeContainer = document.createElement("span");
    badgeContainer.className = "tb-badge-container";
    const badge = document.createElement("span");
    badge.className = "tb-badge";
    badge.textContent = "\u{1F50D} Menganalisis...";
    badge.style.backgroundColor = "rgba(70, 238, 221, 0.15)";
    badge.style.color = "#46eedd";
    badge.style.border = "1px solid rgba(70, 238, 221, 0.3)";
    badge.style.textTransform = "none";
    badgeContainer.appendChild(badge);
    insertBadgeIntoDom(container, target, badgeContainer);
  }
  function injectErrorBadge(container, errorText = "\u26A0\uFE0F Gagal, coba lagi") {
    console.log("[Threadibility] injectErrorBadge called. container exists:", !!container, "errorText:", errorText);
    const existingBadge = container.querySelector(".tb-badge-container");
    if (existingBadge) {
      console.log("[Threadibility] Removing existing badge container before injecting error badge");
      existingBadge.remove();
    }
    const target = findTargetElement(container);
    const badgeContainer = document.createElement("span");
    badgeContainer.className = "tb-badge-container";
    const badge = document.createElement("span");
    badge.className = "tb-badge";
    badge.textContent = errorText;
    badge.style.backgroundColor = "rgba(255, 180, 171, 0.15)";
    badge.style.color = "#ffb4ab";
    badge.style.border = "1px solid rgba(255, 180, 171, 0.3)";
    badge.style.textTransform = "none";
    badgeContainer.appendChild(badge);
    insertBadgeIntoDom(container, target, badgeContainer);
    setTimeout(() => {
      badgeContainer.remove();
    }, 3e3);
  }
  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function injectBadge(container, analysis) {
    console.log("[Threadibility] injectBadge called. container exists:", !!container, "analysis:", analysis);
    const existingBadge = container.querySelector(".tb-badge-container");
    if (existingBadge) {
      console.log("[Threadibility] Removing existing badge container before injecting final result badge");
      existingBadge.remove();
    }
    const target = findTargetElement(container);
    const badgeContainer = document.createElement("span");
    badgeContainer.className = "tb-badge-container";
    const badge = document.createElement("span");
    const isHoax = analysis.indikasiHoax;
    badge.className = `tb-badge ${isHoax ? "tb-badge-hoax" : "tb-badge-verified"}`;
    badge.textContent = isHoax ? "Hoax" : "Verified";
    const tooltip = document.createElement("div");
    tooltip.className = "tb-tooltip";
    const sourcesHtml = analysis.factCheckSources && analysis.factCheckSources.length > 0 ? `<div class="tb-tooltip-sources">
         <strong>Rujukan Cek Fakta:</strong>
         <ul>
           ${analysis.factCheckSources.map(
      (src) => `
             <li>
               <a href="${src.sourceUrl}" target="_blank" rel="noopener noreferrer">
                                   ${src.title ? `<span class="tb-source-title">${escapeHtml(src.title)}</span>` : ""}
                  <span class="tb-source-meta">${escapeHtml(src.publisher)}${src.reviewDate ? ` \xB7 ${escapeHtml(String(src.reviewDate))}` : ""}</span>
                  <span class="tb-badge-verdict">${escapeHtml(src.verdict)}</span>
               </a>
             </li>
           `
    ).join("")}
         </ul>
       </div>` : "";
    tooltip.innerHTML = `
    <div class="tb-tooltip-header">
      <span class="tb-tooltip-logo">T</span>
      <span class="tb-tooltip-title">Threadibility Analysis</span>
    </div>
    <div class="tb-tooltip-body">
      <div class="tb-tooltip-verdict ${isHoax ? "tb-text-hoax" : "tb-text-verified"}">
        <strong>${isHoax ? "\u26A0\uFE0F Terindikasi Hoax" : "\u2705 Terverifikasi Benar"}</strong>
        <span class="tb-tooltip-confidence">(${Math.round(analysis.confidence * 100)}% Confidence)</span>
      </div>
      <p class="tb-tooltip-reason">${analysis.alasan}</p>
      ${sourcesHtml}
    </div>
  `;
    badgeContainer.appendChild(badge);
    badgeContainer.appendChild(tooltip);
    insertBadgeIntoDom(container, target, badgeContainer);
  }

  // _build/harness.ts
  window.TB = { findPostContainer, extractPostData, injectBadge, injectLoadingBadge, injectErrorBadge };
})();
