import { ExtractedPost, ModelBenchmarkResult } from '../types.js';
import { SYSTEM_PROMPT, buildUserPrompt } from '../prompts.js';
import { parseAnalysisResult } from './parseHelper.js';

export async function analyzeWithGemini(
  post: ExtractedPost,
  apiKey: string,
  modelName: string = 'gemini-3.1-pro',
  temperature: number = 0.2,
  baseUrl?: string
): Promise<ModelBenchmarkResult> {
  const startTime = Date.now();

  if (!apiKey || !apiKey.trim()) {
    return {
      provider: 'gemini',
      modelName,
      latencyMs: 0,
      success: false,
      error: 'Google Gemini API Key belum dikonfigurasi. Silakan isi token di Dashboard.'
    };
  }

  try {
    const userPrompt = buildUserPrompt(post.text, post.username, post.postUrl, post.timestamp);
    const trimmedKey = apiKey.trim();

    // If key starts with sk- (router key), route via OpenAI-compatible endpoint
    const isRouterKey = trimmedKey.startsWith('sk-');
    if (isRouterKey || (baseUrl && (baseUrl.includes('router') || baseUrl.includes(':20128')))) {
      const is9RouterKey = trimmedKey.startsWith('sk-') && trimmedKey.includes('-') && trimmedKey.split('-').length >= 3;
      const defaultBase = is9RouterKey ? 'http://localhost:20128/v1' : 'https://api.maiarouter.ai/v1';
      const routerBase = baseUrl || defaultBase;
      const endpoint = routerBase.endsWith('/chat/completions')
        ? routerBase
        : `${routerBase.replace(/\/+$/, '')}/chat/completions`;

      const effectiveModel = !modelName.includes('/') && !is9RouterKey ? `google/${modelName}` : modelName;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${trimmedKey}`,
          'User-Agent': 'curl/8.7.1'
        },
        body: JSON.stringify({
          model: effectiveModel,
          temperature,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ]
        })
      });

      const latencyMs = Date.now() - startTime;
      if (!response.ok) {
        const errText = await response.text();
        let errorMsg = `Gemini Router Error (${response.status}): ${response.statusText}`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error?.message) errorMsg = `Gemini: ${parsed.error.message}`;
        } catch {}
        return {
          provider: 'gemini',
          modelName,
          latencyMs,
          success: false,
          error: errorMsg
        };
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content || '';
      const analysis = parseAnalysisResult(content, post.text.slice(0, 100));
      return {
        provider: 'gemini',
        modelName,
        latencyMs,
        success: true,
        analysis
      };
    }

    // Official Google Gemini API (AI Studio key starting with AIza...)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${trimmedKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
          {
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature
        }
      })
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = `Gemini API Error (${response.status}): ${response.statusText}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) errorMsg = `Gemini: ${parsed.error.message}`;
      } catch {}
      return {
        provider: 'gemini',
        modelName,
        latencyMs,
        success: false,
        error: errorMsg
      };
    }

    const data = (await response.json()) as any;
    const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const analysis = parseAnalysisResult(textPart, post.text.slice(0, 100));

    return {
      provider: 'gemini',
      modelName,
      latencyMs,
      success: true,
      analysis
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      provider: 'gemini',
      modelName,
      latencyMs,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Gemini error'
    };
  }
}
