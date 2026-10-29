// =========================================================
// Threadibility — Console Script (GPT-5.2, Gemini 3.1 Pro, Claude Sonnet 4.6)
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const headerActiveModel = document.getElementById('headerActiveModel');
  const saveConfigBtn = document.getElementById('saveConfigBtn');
  const runComparisonBtn = document.getElementById('runComparisonBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const toast = document.getElementById('toast');

  // Input Fields
  const openaiKeyInput = document.getElementById('openaiKeyInput');
  const geminiKeyInput = document.getElementById('geminiKeyInput');
  const claudeKeyInput = document.getElementById('claudeKeyInput');
  const nineRouterKeyInput = document.getElementById('nineRouterKeyInput');
  const nineRouterModelInput = document.getElementById('nineRouterModelInput');
  const nineRouterBaseUrlInput = document.getElementById('nineRouterBaseUrlInput');
  const btnTestNineRouter = document.getElementById('btnTestNineRouter');
  const nineRouterTestStatus = document.getElementById('nineRouterTestStatus');

  // Status Badges
  const openaiStatusBadge = document.getElementById('openaiStatusBadge');
  const geminiStatusBadge = document.getElementById('geminiStatusBadge');
  const claudeStatusBadge = document.getElementById('claudeStatusBadge');
  const nineRouterStatusBadge = document.getElementById('nineRouterStatusBadge');

  // Model Cards
  const cards = {
    openai: document.getElementById('cardOpenai'),
    gemini: document.getElementById('cardGemini'),
    claude: document.getElementById('cardClaude'),
    nineRouter: document.getElementById('cardNineRouter')
  };

  // Test Area Elements
  const testPostText = document.getElementById('testPostText');
  const testUsername = document.getElementById('testUsername');
  const testPostUrl = document.getElementById('testPostUrl');
  const sampleHoaxBtn = document.getElementById('sampleHoaxBtn');
  const sampleFactBtn = document.getElementById('sampleFactBtn');

  // Comparison Results Elements
  const comparisonResultArea = document.getElementById('comparisonResultArea');
  const consensusTitle = document.getElementById('consensusTitle');
  const consensusDesc = document.getElementById('consensusDesc');
  const consensusBadge = document.getElementById('consensusBadge');

  let currentActiveProvider = 'openai';

  const MODEL_NAMES = {
    openai: 'GPT-5.2',
    gemini: 'Gemini 3.1 Pro',
    claude: 'Claude Sonnet 4.6',
    nineRouter: '9Router (OpenCode)'
  };

  // 1. Password Visibility Toggle
  document.querySelectorAll('.btn-toggle-vis').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = 'Tutup';
        } else {
          input.type = 'password';
          btn.textContent = 'Lihat';
        }
      }
    });
  });

  // 2. Active Model Selection via Card Footer Button
  document.querySelectorAll('.btn-select-model').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const provider = btn.getAttribute('data-provider');
      if (provider) {
        setActiveModelUi(provider);
      }
    });
  });

  function setActiveModelUi(provider) {
    currentActiveProvider = provider;
    Object.keys(cards).forEach((key) => {
      const card = cards[key];
      const btn = card.querySelector('.btn-select-model');
      const text = btn.querySelector('.selection-text');

      if (key === provider) {
        card.classList.add('active');
        text.textContent = 'Sedang aktif';
      } else {
        card.classList.remove('active');
        text.textContent = 'Jadikan model aktif';
      }
    });

    if (headerActiveModel) {
      headerActiveModel.textContent = MODEL_NAMES[provider] || provider;
    }
  }

  // 3. Notification Toast Helper
  function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    setTimeout(() => {
      toast.className = 'toast';
    }, 3500);
  }

  // 4. Fetch & Render Current Configuration
  async function fetchConfig() {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error('Gagal memuat konfigurasi');
      const data = await res.json();

      setActiveModelUi(data.activeModel || 'openai');

      // Status badges & masked placeholders
      if (data.openaiApiKeySet) {
        openaiStatusBadge.textContent = 'Tersimpan';
        openaiStatusBadge.classList.add('configured');
        openaiKeyInput.placeholder = data.openaiApiKeyMasked || '••••••••';
      } else {
        openaiStatusBadge.textContent = 'Belum diatur';
        openaiStatusBadge.classList.remove('configured');
        openaiKeyInput.placeholder = 'sk-...';
      }

      if (data.geminiApiKeySet) {
        geminiStatusBadge.textContent = 'Tersimpan';
        geminiStatusBadge.classList.add('configured');
        geminiKeyInput.placeholder = data.geminiApiKeyMasked || '••••••••';
      } else {
        geminiStatusBadge.textContent = 'Belum diatur';
        geminiStatusBadge.classList.remove('configured');
        geminiKeyInput.placeholder = 'AIzaSy...';
      }

      if (data.claudeApiKeySet) {
        claudeStatusBadge.textContent = 'Tersimpan';
        claudeStatusBadge.classList.add('configured');
        claudeKeyInput.placeholder = data.claudeApiKeyMasked || '••••••••';
      } else {
        claudeStatusBadge.textContent = 'Belum diatur';
        claudeStatusBadge.classList.remove('configured');
        claudeKeyInput.placeholder = 'sk-ant-...';
      }

      if (data.nineRouterApiKeySet) {
        nineRouterStatusBadge.textContent = 'Port 20128 Aktif';
        nineRouterStatusBadge.classList.add('configured');
        nineRouterKeyInput.placeholder = data.nineRouterApiKeyMasked || '••••••••';
      } else {
        nineRouterStatusBadge.textContent = 'Belum diatur';
        nineRouterStatusBadge.classList.remove('configured');
        nineRouterKeyInput.placeholder = 'sk-e528...';
      }

      if (data.nineRouterApiKeyRaw && !nineRouterKeyInput.value) {
        nineRouterKeyInput.value = data.nineRouterApiKeyRaw;
      }
      if (data.nineRouterModel) {
        nineRouterModelInput.value = data.nineRouterModel;
      }
      if (data.nineRouterBaseUrl) {
        nineRouterBaseUrlInput.value = data.nineRouterBaseUrl;
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal terhubung ke server konfigurasi.', 'error');
    }
  }

  // 5. Save Configuration
  saveConfigBtn.addEventListener('click', async () => {
    saveConfigBtn.disabled = true;
    saveConfigBtn.textContent = 'Menyimpan...';

    const payload = {
      activeModel: currentActiveProvider,
      openaiModel: 'gpt-5.2',
      geminiModel: 'gemini-3.1-pro',
      claudeModel: 'claude-sonnet-4.6',
      nineRouterModel: nineRouterModelInput.value.trim() || 'opencode-go/glm-5.2',
      nineRouterBaseUrl: nineRouterBaseUrlInput.value.trim() || 'http://localhost:20128/v1'
    };

    if (openaiKeyInput.value.trim()) payload.openaiApiKey = openaiKeyInput.value.trim();
    if (geminiKeyInput.value.trim()) payload.geminiApiKey = geminiKeyInput.value.trim();
    if (claudeKeyInput.value.trim()) payload.claudeApiKey = claudeKeyInput.value.trim();
    if (nineRouterKeyInput.value.trim()) payload.nineRouterApiKey = nineRouterKeyInput.value.trim();

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menyimpan konfigurasi');

      showToast('Konfigurasi token dan model aktif berhasil diperbarui.');
      openaiKeyInput.value = '';
      geminiKeyInput.value = '';
      claudeKeyInput.value = '';
      await fetchConfig();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveConfigBtn.disabled = false;
      saveConfigBtn.textContent = 'Simpan konfigurasi';
    }
  });

  // 5b. Test 9Router Connection
  if (btnTestNineRouter) {
    btnTestNineRouter.addEventListener('click', async () => {
      btnTestNineRouter.disabled = true;
      btnTestNineRouter.textContent = 'Menguji...';
      nineRouterTestStatus.style.display = 'block';
      nineRouterTestStatus.className = 'test-feedback warning';
      nineRouterTestStatus.textContent = 'Menguji koneksi ke port 20128 & model OpenCode...';

      try {
        const res = await fetch('/api/test-9router', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: nineRouterKeyInput.value.trim() || undefined,
            baseUrl: nineRouterBaseUrlInput.value.trim() || 'http://localhost:20128/v1',
            modelName: nineRouterModelInput.value.trim() || 'opencode-go/glm-5.2'
          })
        });

        const data = await res.json();
        if (data.success) {
          nineRouterTestStatus.className = 'test-feedback success';
          nineRouterTestStatus.textContent = `✅ ${data.message} ${data.sampleResponse ? 'Balasan: "' + data.sampleResponse + '"' : ''}`;
          showToast('Koneksi 9Router sukses!');
        } else if (data.serverUp && !data.modelReady) {
          nineRouterTestStatus.className = 'test-feedback warning';
          nineRouterTestStatus.textContent = `⚠️ ${data.message}`;
          showToast('9Router aktif, tapi provider belum terkoneksi.', 'warning');
        } else {
          nineRouterTestStatus.className = 'test-feedback error';
          nineRouterTestStatus.textContent = `❌ ${data.message}`;
          showToast('Koneksi 9Router gagal.', 'error');
        }
      } catch (err) {
        nineRouterTestStatus.className = 'test-feedback error';
        nineRouterTestStatus.textContent = `❌ Gagal menghubungi endpoint uji: ${err.message}`;
      } finally {
        btnTestNineRouter.disabled = false;
        btnTestNineRouter.textContent = '⚡ Uji Koneksi';
      }
    });
  }

  // 6. Sample Text Fillers
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

  // 7. Run 3-Model Comparison Benchmark
  runComparisonBtn.addEventListener('click', async () => {
    const text = testPostText.value.trim();
    if (!text) {
      showToast('Masukkan teks postingan yang akan diuji.', 'error');
      testPostText.focus();
      return;
    }

    runComparisonBtn.disabled = true;
    runComparisonBtn.textContent = 'Memproses 3 model...';
    comparisonResultArea.classList.remove('hidden');

    ['Openai', 'Gemini', 'Claude'].forEach((p) => {
      document.getElementById(`cmpLatency${p}`).textContent = 'Memproses...';
      const verdict = document.getElementById(`cmpVerdict${p}`);
      verdict.className = 'verdict-tag';
      verdict.textContent = 'Sedang menganalisis...';
      document.getElementById(`cmpConfidence${p}`).textContent = '-';
      document.getElementById(`cmpBar${p}`).style.width = '0%';
      document.getElementById(`cmpClaim${p}`).textContent = 'Memproses ekstraksi...';
      document.getElementById(`cmpReason${p}`).textContent = 'Menunggu keluaran model...';
      document.getElementById(`cmpSources${p}`).innerHTML = '';
    });

    try {
      const res = await fetch('/api/compare', {
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
      if (!res.ok) throw new Error(data.error || 'Gagal memproses perbandingan');

      renderComparisonResults(data.results);
      await fetchStats();
      await fetchHistory();
      showToast('Analisis komparasi selesai.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      runComparisonBtn.disabled = false;
      runComparisonBtn.textContent = 'Bandingkan 3 model';
    }
  });

  function renderComparisonResults(results) {
    const providers = [
      { key: 'openai', suffix: 'Openai' },
      { key: 'gemini', suffix: 'Gemini' },
      { key: 'claude', suffix: 'Claude' }
    ];

    let hoaxCount = 0;
    let verifiedCount = 0;

    providers.forEach(({ key, suffix }) => {
      const res = results[key];
      const latencyBadge = document.getElementById(`cmpLatency${suffix}`);
      const verdictBanner = document.getElementById(`cmpVerdict${suffix}`);
      const confText = document.getElementById(`cmpConfidence${suffix}`);
      const confBar = document.getElementById(`cmpBar${suffix}`);
      const claimText = document.getElementById(`cmpClaim${suffix}`);
      const reasonText = document.getElementById(`cmpReason${suffix}`);
      const sourcesBox = document.getElementById(`cmpSources${suffix}`);

      if (!res.success || !res.analysis) {
        latencyBadge.textContent = 'Error';
        verdictBanner.className = 'verdict-tag error';
        verdictBanner.textContent = 'Gagal memproses';
        claimText.textContent = '-';
        reasonText.textContent = res.error || 'Terjadi kendala pada pemanggilan model.';
        confText.textContent = '0%';
        confBar.style.width = '0%';
        sourcesBox.innerHTML = '';
        return;
      }

      const a = res.analysis;
      latencyBadge.textContent = `${res.latencyMs} ms`;

      if (a.indikasiHoax) {
        hoaxCount++;
        verdictBanner.className = 'verdict-tag hoax';
        verdictBanner.textContent = 'Terindikasi hoaks';
        confBar.className = 'meter-fill hoax';
      } else {
        verifiedCount++;
        verdictBanner.className = 'verdict-tag verified';
        verdictBanner.textContent = 'Terverifikasi benar';
        confBar.className = 'meter-fill verified';
      }

      const confPercent = Math.round(a.confidence * 100);
      confText.textContent = `${confPercent}% (${a.confidence.toFixed(2)})`;
      confBar.style.width = `${confPercent}%`;

      claimText.textContent = a.claim || '-';
      reasonText.textContent = a.alasan || '-';

      if (a.factCheckSources && a.factCheckSources.length > 0) {
        sourcesBox.innerHTML = `
          <div class="result-section">
            <span class="section-heading">Rujukan fakta:</span>
            ${a.factCheckSources
              .map(
                (s) => `
              <div class="source-item-row">
                <a href="${s.sourceUrl}" target="_blank" rel="noopener noreferrer">${s.publisher}</a>
                <span class="source-verdict-pill">${s.verdict}</span>
              </div>
            `
              )
              .join('')}
          </div>
        `;
      } else {
        sourcesBox.innerHTML = '';
      }
    });

    const totalValid = hoaxCount + verifiedCount;
    if (totalValid > 0) {
      if (hoaxCount === totalValid) {
        consensusBadge.textContent = 'Sepakat bulat';
        consensusTitle.textContent = `Ketiga model mengklasifikasikan postingan ini sebagai HOAKS (${hoaxCount}/${totalValid})`;
        consensusDesc.textContent = 'GPT-5.2, Gemini 3.1 Pro, dan Claude Sonnet 4.6 memberikan vonis yang konsisten.';
      } else if (verifiedCount === totalValid) {
        consensusBadge.textContent = 'Sepakat bulat';
        consensusTitle.textContent = `Ketiga model mengklasifikasikan postingan ini sebagai TERVERIFIKASI (${verifiedCount}/${totalValid})`;
        consensusDesc.textContent = 'Tidak ditemukan indikasi disinformasi oleh ketiga model evaluasi.';
      } else {
        consensusBadge.textContent = 'Divergensi';
        consensusTitle.textContent = `Terdapat perbedaan vonis: ${hoaxCount} menilai hoaks, ${verifiedCount} menilai terverifikasi`;
        consensusDesc.textContent = 'Perbedaan perspektif analisis ini dapat dicatat sebagai temuan komparasi pada pembahasan skripsi.';
      }
    }
  }

  // 8. Fetch & Render Stats Strip
  async function fetchStats() {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) return;
      const stats = await res.json();

      document.getElementById('statTotalAnalyzed').textContent = stats.total;
      document.getElementById('statHoaxCount').textContent = stats.hoax;
      document.getElementById('statVerifiedCount').textContent = stats.verified;

      if (stats.breakdown) {
        const b = stats.breakdown;
        document.getElementById('statLatOpenai').textContent = `${b.openai?.avgLatencyMs || 0} ms`;
        document.getElementById('statLatGemini').textContent = `${b.gemini?.avgLatencyMs || 0} ms`;
        document.getElementById('statLatClaude').textContent = `${b.claude?.avgLatencyMs || 0} ms`;
      }
    } catch (err) {
      console.error(err);
    }
  }

  // 9. Fetch & Render History Table
  async function fetchHistory() {
    try {
      const res = await fetch('/api/history?limit=30');
      if (!res.ok) return;
      const history = await res.json();

      const tbody = document.getElementById('historyTableBody');
      if (!history || history.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="table-empty">Belum ada data pengujian yang tercatat.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = history
        .map((item) => {
          const isHoax = item.result?.indikasiHoax;
          const conf = Math.round((item.result?.confidence || 0) * 100);
          const date = new Date(item.timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: 'numeric',
            month: 'short'
          });

          const modelDisplayName = MODEL_NAMES[item.provider] || item.modelName;

          return `
          <tr>
            <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim);">${date}</td>
            <td style="font-weight: 500; color: var(--text-primary);">${modelDisplayName}</td>
            <td>${item.post.username || '@unknown'}</td>
            <td style="max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${(item.post.text || '').replace(/"/g, '&quot;')}">
              ${item.post.text || '-'}
            </td>
            <td>
              <span class="badge-row ${isHoax ? 'hoax' : 'verified'}">
                ${isHoax ? 'Hoaks' : 'Terverifikasi'}
              </span>
            </td>
            <td style="font-family: var(--font-mono);">${conf}%</td>
            <td style="font-family: var(--font-mono); font-size: 11px;">${item.latencyMs} ms</td>
          </tr>
        `;
        })
        .join('');
    } catch (err) {
      console.error(err);
    }
  }

  // 10. Clear History
  clearHistoryBtn.addEventListener('click', async () => {
    if (!confirm('Hapus seluruh riwayat pengujian?')) return;

    try {
      const res = await fetch('/api/history', { method: 'DELETE' });
      if (res.ok) {
        showToast('Riwayat data berhasil dibersihkan.');
        await fetchStats();
        await fetchHistory();
      }
    } catch (err) {
      showToast('Gagal membersihkan riwayat.', 'error');
    }
  });

  // Initial Load
  fetchConfig();
  fetchStats();
  fetchHistory();
});
