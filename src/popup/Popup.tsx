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
