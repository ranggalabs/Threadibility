import { ExtractedPost, ModelBenchmarkResult } from '../types.js';
import { SYSTEM_PROMPT, buildUserPrompt } from '../prompts.js';
import { parseAnalysisResult } from './parseHelper.js';
import { searchFactCheckSources } from './webSearch.js';

export async function analyzeWithNineRouter(
  post: ExtractedPost,
  apiKey: string,
  modelName: string = 'oc/muse-spark-1.3-contributor-free',
  temperature: number = 0.2,
  baseUrl: string = 'http://localhost:20128/v1'
): Promise<ModelBenchmarkResult> {
  const startTime = Date.now();

  if (!apiKey || !apiKey.trim()) {
    return {
      provider: 'nineRouter',
      modelName,
      latencyMs: 0,
      success: false,
      error: '9Router API Key belum dikonfigurasi. Silakan isi token 9Router di Dashboard.'
    };
  }

  // Perform multi-source live fact check search (yielding 5+ references)
  const searchInfo = await searchFactCheckSources(post.text, post.postUrl);

  try {
    const userPrompt = buildUserPrompt(
      post.text,
      post.username,
      post.postUrl,
      post.timestamp,
      searchInfo.summaryContext
    );

    const trimmedKey = apiKey.trim();
    const effectiveBase = (baseUrl || 'http://localhost:20128/v1').trim();
    const endpoint = effectiveBase.endsWith('/chat/completions')
      ? effectiveBase
      : `${effectiveBase.replace(/\/+$/, '')}/chat/completions`;

    // Normalize muse-spark model name for 9Router
    let effectiveModel = modelName.trim();
    if (effectiveModel.includes('muse-spark') && !effectiveModel.includes('/')) {
      effectiveModel = `oc/${effectiveModel}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trimmedKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: effectiveModel,
        temperature,
        max_tokens: 2500,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ]
      })
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = `9Router Error (${response.status}): ${response.statusText}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) {
          errorMsg = `9Router: ${parsed.error.message}`;
          if (parsed.error.message.includes('No active credentials')) {
            errorMsg += ' (Buka dashboard 9Router di http://localhost:20128 dan pastikan provider OpenCode aktif).';
          }
        }
      } catch {}
      return {
        provider: 'nineRouter',
        modelName: effectiveModel,
        latencyMs,
        success: false,
        error: errorMsg
      };
    }

    const data = (await response.json()) as any;
    const content = (data.choices?.[0]?.message?.content || data.content?.[0]?.text || '').trim();
    
    if (!content) {
      return {
        provider: 'nineRouter',
        modelName: effectiveModel,
        latencyMs,
        success: false,
        error: `Model '${effectiveModel}' merespons dengan konten teks kosong.`
      };
    }

    // Parse result and ensure at least 5 factCheckSources from searchInfo
    const analysis = parseAnalysisResult(content, post.text.slice(0, 100), searchInfo.sources);

    return {
      provider: 'nineRouter',
      modelName: effectiveModel,
      latencyMs,
      success: true,
      analysis
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      provider: 'nineRouter',
      modelName,
      latencyMs,
      success: false,
      error: error instanceof Error ? error.message : 'Koneksi ke 9Router gagal. Pastikan 9Router berjalan di port 20128.'
    };
  }
}

/**
 * Diagnostic test utility to check if 9Router is reachable and if the provider/model works
 */
export async function testNineRouterConnection(
  apiKey: string,
  baseUrl: string = 'http://localhost:20128/v1',
  modelName: string = 'oc/muse-spark-1.3-contributor-free'
): Promise<{
  success: boolean;
  status: number;
  message: string;
  serverUp: boolean;
  modelReady: boolean;
  sampleResponse?: string;
}> {
  const effectiveBase = (baseUrl || 'http://localhost:20128/v1').trim().replace(/\/+$/, '');
  const trimmedKey = (apiKey || '').trim();

  let effectiveModel = modelName.trim();
  if (effectiveModel.includes('muse-spark') && !effectiveModel.includes('/')) {
    effectiveModel = `oc/${effectiveModel}`;
  }

  // Step 1: Health / models ping
  let serverUp = false;
  try {
    const pingRes = await fetch(`${effectiveBase}/models`, {
      headers: { Authorization: `Bearer ${trimmedKey}` },
      signal: AbortSignal.timeout(3000)
    });
    serverUp = pingRes.status === 200 || pingRes.status === 401;
  } catch {
    serverUp = false;
  }

  if (!serverUp) {
    return {
      success: false,
      status: 0,
      serverUp: false,
      modelReady: false,
      message: `Tidak dapat menghubungi 9Router di ${effectiveBase}. Pastikan 9Router sedang berjalan di port 20128.`
    };
  }

  // Step 2: Test completion with at least 50 max_tokens
  try {
    const compRes = await fetch(`${effectiveBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trimmedKey}`
      },
      body: JSON.stringify({
        model: effectiveModel,
        messages: [{ role: 'user', content: 'Halo' }],
        max_tokens: 500
      }),
      signal: AbortSignal.timeout(12000)
    });

    if (compRes.ok) {
      const data = (await compRes.json()) as any;
      const reply = data.choices?.[0]?.message?.content || 'Model merespons sukses';
      return {
        success: true,
        status: 200,
        serverUp: true,
        modelReady: true,
        sampleResponse: reply.trim() || 'Koneksi siap',
        message: `Koneksi 9Router sukses! Model '${effectiveModel}' aktif dan siap digunakan.`
      };
    }

    const errText = await compRes.text();
    let parsedMsg = errText;
    try {
      const parsed = JSON.parse(errText);
      if (parsed.error?.message) parsedMsg = parsed.error.message;
    } catch {}

    if (parsedMsg.includes('No active credentials')) {
      return {
        success: false,
        status: compRes.status,
        serverUp: true,
        modelReady: false,
        message: `9Router aktif dan token valid, tetapi provider '${effectiveModel.split('/')[0]}' belum aktif di 9Router. Buka http://localhost:20128 lalu aktifkan provider tersebut.`
      };
    }

    return {
      success: false,
      status: compRes.status,
      serverUp: true,
      modelReady: false,
      message: `9Router status ${compRes.status}: ${parsedMsg}`
    };
  } catch (error: any) {
    return {
      success: false,
      status: 500,
      serverUp: true,
      modelReady: false,
      message: `Error saat pengujian model: ${error.message}`
    };
  }
}
