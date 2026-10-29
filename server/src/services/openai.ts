import { ExtractedPost, ModelBenchmarkResult } from '../types.js';
import { SYSTEM_PROMPT, buildUserPrompt } from '../prompts.js';
import { parseAnalysisResult } from './parseHelper.js';

export async function analyzeWithOpenAI(
  post: ExtractedPost,
  apiKey: string,
  modelName: string = 'gpt-5.2',
  temperature: number = 0.2,
  baseUrl?: string
): Promise<ModelBenchmarkResult> {
  const startTime = Date.now();

  if (!apiKey || !apiKey.trim()) {
    return {
      provider: 'openai',
      modelName,
      latencyMs: 0,
      success: false,
      error: 'OpenAI API Key belum dikonfigurasi. Silakan isi token di Dashboard.'
    };
  }

  try {
    const userPrompt = buildUserPrompt(post.text, post.username, post.postUrl, post.timestamp);
    const trimmedKey = apiKey.trim();

    // Detect 9Router vs MAIA Router vs official OpenAI
    const is9RouterKey = trimmedKey.startsWith('sk-') && trimmedKey.includes('-') && trimmedKey.split('-').length >= 3;
    const isMaiaKey = !trimmedKey.startsWith('sk-proj-') && trimmedKey.length < 40 && !is9RouterKey;
    
    let defaultBaseUrl = 'https://api.openai.com/v1';
    if (is9RouterKey) {
      defaultBaseUrl = 'http://localhost:20128/v1';
    } else if (isMaiaKey) {
      defaultBaseUrl = 'https://api.maiarouter.ai/v1';
    }

    const effectiveBaseUrl = baseUrl || defaultBaseUrl;
    const endpoint = effectiveBaseUrl.endsWith('/chat/completions') 
      ? effectiveBaseUrl 
      : `${effectiveBaseUrl.replace(/\/+$/, '')}/chat/completions`;

    // For router, ensure model has openai/ prefix if needed
    const isRouter = effectiveBaseUrl.includes('maiarouter') || effectiveBaseUrl.includes('router') || effectiveBaseUrl.includes(':20128');
    const effectiveModel = isRouter && !modelName.includes('/') && !is9RouterKey ? `openai/${modelName}` : modelName;

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
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = `OpenAI API Error (${response.status}): ${response.statusText}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) errorMsg = `OpenAI: ${parsed.error.message}`;
      } catch {}
      return {
        provider: 'openai',
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
      provider: 'openai',
      modelName,
      latencyMs,
      success: true,
      analysis
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      provider: 'openai',
      modelName,
      latencyMs,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown OpenAI error'
    };
  }
}
