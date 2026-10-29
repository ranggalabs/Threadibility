import React from 'react'
import { HistoryRecord } from '../shared/types'

interface HistoryItemProps {
  record: HistoryRecord
  isExpanded: boolean
  onToggleExpand: () => void
}

const HistoryItem: React.FC<HistoryItemProps> = ({ record, isExpanded, onToggleExpand }) => {
  const { post, analysis, analyzedAt } = record
  const isHoax = analysis.indikasiHoax
  const confidencePercent = Math.round(analysis.confidence * 100)

  // Relative Time Formatter helper
  const getRelativeTime = (isoString: string): string => {
    try {
      const date = new Date(isoString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      if (diffMs < 0) return 'baru saja'

      const diffSec = Math.floor(diffMs / 1000)
      if (diffSec < 60) return 'baru saja'

      const diffMin = Math.floor(diffSec / 60)
      if (diffMin < 60) return `${diffMin}m lalu`

      const diffHr = Math.floor(diffMin / 60)
      if (diffHr < 24) return `${diffHr}j lalu`

      const diffDays = Math.floor(diffHr / 24)
      if (diffDays === 1) return 'kemarin'
      if (diffDays < 7) return `${diffDays}h lalu`

      return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
    } catch {
      return 'baru saja'
    }
  }

  // Prevent click on link from triggering card expand
  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div className="history-item" onClick={onToggleExpand}>
      {/* Header Row */}
      <div className="item-header">
        <span className={`status-badge ${isHoax ? 'badge-hoax' : 'badge-verified'}`}>
          {isHoax ? 'Hoax' : 'Verified'}
        </span>
        <span className="item-time">{getRelativeTime(analyzedAt)}</span>
      </div>

      {/* Post Text Preview */}
      <p className={`item-text-preview ${isExpanded ? 'expanded' : ''}`}>
        {post.text || 'Tidak ada teks post.'}
      </p>

      {/* Sub-metadata Line */}
      <p className="item-meta">
        {post.username || '@unknown'} • {confidencePercent}% confidence
      </p>

      {/* Expanded Details Section */}
      {isExpanded && (
        <div className="item-details" onClick={handleLinkClick}>
          {/* Post URL if available */}
          {post.postUrl && (
            <div className="confidence-section" style={{ marginBottom: '8px' }}>
              <a
                href={post.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="view-all-btn"
                style={{ fontSize: '10px' }}
              >
                Lihat Post Asli di Threads ↗
              </a>
            </div>
          )}

          {/* Confidence Slider bar */}
          <div className="confidence-section">
            <div className="confidence-header">
              <span>Tingkat Keyakinan (Confidence)</span>
              <span>{confidencePercent}%</span>
            </div>
            <div className="confidence-bar-bg">
              <div
                className={`confidence-bar-fill ${isHoax ? 'hoax' : 'verified'}`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
          </div>

          {/* Alasan / Reasoning */}
          <h4 className="details-label">Alasan Analisis:</h4>
          <p className="details-content">{analysis.alasan || 'Tidak ada alasan rinci.'}</p>

          {/* Fact Check Sources */}
          {analysis.factCheckSources && analysis.factCheckSources.length > 0 && (
            <>
              <h4 className="details-label" style={{ marginTop: '8px' }}>
                Sumber Rujukan Cek Fakta:
              </h4>
              <ul className="sources-list">
                {analysis.factCheckSources.map((source, index) => (
                  <li key={index}>
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>{source.title || source.publisher}</span>
                      <span className="source-verdict">
                        {source.title ? `${source.publisher} · ` : ''}
                        {source.verdict}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default HistoryItem
