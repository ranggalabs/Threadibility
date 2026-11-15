// =========================================================
// Threadibility — Konsol Pengujian (Google AI Overview + klasifikasi aturan)
// =========================================================

const DASAR_LABEL = {
  ai_overview: 'Ringkasan Google AI Overview',
  pencarian: 'Hasil pencarian Google dan berita',
  ciri_teks: 'Ciri teks unggahan'
};

document.addEventListener('DOMContentLoaded', () => {
  const runTestBtn = document.getElementById('runTestBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const toast = document.getElementById('toast');
  const testPostText = document.getElementById('testPostText');
  const testUsername = document.getElementById('testUsername');
  const testPostUrl = document.getElementById('testPostUrl');
  const sampleHoaxBtn = document.getElementById('sampleHoaxBtn');
  const sampleFactBtn = document.getElementById('sampleFactBtn');
  const resultArea = document.getElementById('resultArea');

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    setTimeout(() => {
      toast.className = 'toast';
    }, 3500);
  }

  // Contoh teks
  sampleHoaxBtn.addEventListener('click', () => {
    testPostText.value = 'Mulai besok pagi seluruh pengguna internet di Indonesia akan dikenakan pajak kuota digital sebesar 25% langsung dipotong dari pulsa sesuai surat edaran Menkominfo nomor 402/2026. Sebarkan sebelum akun Anda dibekukan!';
    testUsername.value = '@viral_news_id';
    testPostUrl.value = 'https://www.threads.com/@viral_news_id/post/C4m9Kx0L';
  });

  sampleFactBtn.addEventListener('click', () => {
    testPostText.value = 'Badan Meteorologi, Klimatologi, dan Geofisika (BMKG) mengimbau masyarakat di pesisir selatan Jawa untuk mewaspadai potensi gelombang tinggi mencapai 2,5 hingga 4 meter selama tiga hari ke depan akibat fenomena angin muson.';
    testUsername.value = '@infobmkg_resmi';
    testPostUrl.value = 'https://www.threads.com/@infobmkg_resmi/post/C9b8Xy1z';
  });

  // Uji satu klaim
  runTestBtn.addEventListener('click', async () => {
    const text = testPostText.value.trim();
    if (!text) {
      showToast('Masukkan teks postingan yang akan diuji.', 'error');
      testPostText.focus();
      return;
    }

    runTestBtn.disabled = true;
    runTestBtn.textContent = 'Menelusuri...';
    resultArea.classList.remove('hidden');
    document.getElementById('resLatency').textContent = 'Memproses...';
    const verdict = document.getElementById('resVerdict');
    verdict.className = 'verdict-tag';
    verdict.textContent = 'Sedang menganalisis...';
    document.getElementById('resClaim').textContent = '-';
    document.getElementById('resReason').textContent = 'Menunggu hasil penelusuran...';
    document.getElementById('resBasis').textContent = '-';
    document.getElementById('resSources').innerHTML = '';

    const started = Date.now();
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          username: testUsername.value.trim() || null,
          postUrl: testPostUrl.value.trim() || null,
          timestamp: new Date().toISOString()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses analisis');

      renderResult(data, Date.now() - started);
      await Promise.all([fetchStats(), fetchHistory()]);
      showToast('Analisis selesai.');
    } catch (err) {
      verdict.className = 'verdict-tag error';
      verdict.textContent = 'Gagal memproses';
      document.getElementById('resLatency').textContent = 'Error';
      document.getElementById('resReason').textContent = err.message;
      showToast(err.message, 'error');
    } finally {
      runTestBtn.disabled = false;
      runTestBtn.textContent = 'Analisis klaim';
    }
  });

  function renderResult(a, elapsedMs) {
    const verdict = document.getElementById('resVerdict');

    document.getElementById('resLatency').textContent = `${elapsedMs} ms`;
    if (a.indikasiHoax) {
      verdict.className = 'verdict-tag hoax';
      verdict.textContent = 'Terindikasi hoaks';
    } else {
      verdict.className = 'verdict-tag verified';
      verdict.textContent = 'Tidak terindikasi hoaks';
    }

    document.getElementById('resClaim').textContent = a.claim || '-';
    document.getElementById('resReason').textContent = a.alasan || '-';
    document.getElementById('resBasis').textContent = DASAR_LABEL[a.dasar] || '-';

    const box = document.getElementById('resSources');
    if (a.factCheckSources && a.factCheckSources.length > 0) {
      box.innerHTML = `
        <div class="result-section">
          <span class="section-heading">Rujukan:</span>
          ${a.factCheckSources
            .map(
              (s) => `
            <div class="source-item-row">
              <a href="${escapeHtml(s.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.title || s.publisher)}</a>
              <span class="source-verdict-pill">${escapeHtml(s.publisher)} · ${escapeHtml(s.verdict)}</span>
            </div>
          `
            )
            .join('')}
        </div>`;
    } else {
      box.innerHTML = '';
    }
  }

  // Statistik
  async function fetchStats() {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) return;
      const stats = await res.json();
      document.getElementById('statTotalAnalyzed').textContent = stats.total;
      document.getElementById('statHoaxCount').textContent = stats.hoax;
      document.getElementById('statNotFlaggedCount').textContent = stats.notFlagged;
      document.getElementById('statAvgLatency').textContent = stats.total > 0 ? `${stats.avgLatencyMs} ms` : '- ms';
      const c = stats.confusion;
      const pct = (v) => (v === null || v === undefined ? '-' : `${(v * 100).toFixed(1)}%`);
      document.getElementById('cmTP').textContent = c.tp;
      document.getElementById('cmFN').textContent = c.fn;
      document.getElementById('cmFP').textContent = c.fp;
      document.getElementById('cmTN').textContent = c.tn;
      document.getElementById('cmN').textContent = c.n;
      document.getElementById('cmAcc').textContent = pct(c.accuracy);
      document.getElementById('cmPre').textContent = pct(c.precision);
      document.getElementById('cmRec').textContent = pct(c.recall);
      document.getElementById('cmF1').textContent = pct(c.f1);
      const rows = Object.keys(DASAR_LABEL)
        .map((k) => {
          const m = stats.confusionPerDasar && stats.confusionPerDasar[k];
          if (!m || m.n === 0) return '';
          return `<tr><td>${DASAR_LABEL[k]}</td><td>${m.n}</td><td>${pct(m.accuracy)}</td><td>${pct(m.precision)}</td><td>${pct(m.recall)}</td><td>${pct(m.f1)}</td></tr>`;
        })
        .join('');
      document.getElementById('cmDasarBody').innerHTML =
        rows || '<tr><td colspan="6" class="table-empty">Belum ada data berlabel.</td></tr>';
    } catch (err) {
      console.error(err);
    }
  }

  // Riwayat
  async function fetchHistory() {
    try {
      const res = await fetch('/api/history?limit=30');
      if (!res.ok) return;
      const history = await res.json();

      const tbody = document.getElementById('historyTableBody');
      if (!history || history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Belum ada data pengujian yang tercatat.</td></tr>';
        return;
      }

      tbody.innerHTML = history
        .map((item) => {
          const isHoax = item.result?.indikasiHoax;
          const date = new Date(item.timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: 'numeric',
            month: 'short'
          });
          const text = item.post.text || '-';
          return `
          <tr>
            <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim);">${escapeHtml(date)}</td>
            <td>${escapeHtml(item.post.username || '@unknown')}</td>
            <td style="max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(text)}">${escapeHtml(text)}</td>
            <td>
              <span class="badge-row ${isHoax ? 'hoax' : 'verified'}">${isHoax ? 'Hoaks' : 'Tidak terindikasi'}</span>
            </td>
            <td>${escapeHtml(DASAR_LABEL[item.result?.dasar] || '-')}</td>
            <td>
              <select class="label-select" data-id="${escapeHtml(item.id)}" aria-label="Label sebenarnya">
                <option value=""${!item.label ? ' selected' : ''}>Belum dilabeli</option>
                <option value="HOAX"${item.label === 'HOAX' ? ' selected' : ''}>Hoaks</option>
                <option value="BUKAN_HOAX"${item.label === 'BUKAN_HOAX' ? ' selected' : ''}>Bukan hoaks</option>
              </select>
            </td>
            <td style="font-family: var(--font-mono); font-size: 11px;">${item.latencyMs} ms</td>
          </tr>`;
        })
        .join('');
    } catch (err) {
      console.error(err);
    }
  }

  document.getElementById('historyTableBody').addEventListener('change', async (e) => {
    const sel = e.target.closest('.label-select');
    if (!sel) return;
    try {
      const res = await fetch(`/api/history/${encodeURIComponent(sel.dataset.id)}/label`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: sel.value || null })
      });
      if (!res.ok) throw new Error('Gagal menyimpan label');
      await fetchStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  clearHistoryBtn.addEventListener('click', async () => {
    if (!confirm('Hapus seluruh riwayat pengujian?')) return;
    try {
      const res = await fetch('/api/history', { method: 'DELETE' });
      if (res.ok) {
        showToast('Riwayat data berhasil dibersihkan.');
        await Promise.all([fetchStats(), fetchHistory()]);
      }
    } catch (err) {
      showToast('Gagal membersihkan riwayat.', 'error');
    }
  });

  fetchStats();
  fetchHistory();
});
