import { ExtractedPost, ModelBenchmarkResult } from '../types.js';
import { SYSTEM_PROMPT, buildUserPrompt } from '../prompts.js';
import { parseAnalysisResult } from './parseHelper.js';

export async function analyzeWithClaude(
  post: ExtractedPost,
  apiKey: string,
  modelName: string = 'claude-sonnet-4.6',
  temperature: number = 0.2,
  baseUrl?: string
): Promise<ModelBenchmarkResult> {
  const startTime = Date.now();

  if (!apiKey || !apiKey.trim()) {
    return {
      provider: 'claude',
      modelName,
      latencyMs: 0,
      success: false,
      error: 'Anthropic Claude API Key belum dikonfigurasi. Silakan isi token di Dashboard.'
    };
  }

  try {
    const userPrompt = buildUserPrompt(post.text, post.username, post.postUrl, post.timestamp);
    const trimmedKey = apiKey.trim();

    // Auto-detect 9Router (local proxy on port 20128) vs MAIA Router vs Anthropic
    const is9RouterKey = trimmedKey.startsWith('sk-') && trimmedKey.includes('-') && trimmedKey.split('-').length >= 3;
    const isMaiaKey = trimmedKey.startsWith('sk-') && !trimmedKey.startsWith('sk-ant-') && !is9RouterKey;
    
    let defaultBaseUrl: string | undefined = undefined;
    if (is9RouterKey) {
      defaultBaseUrl = 'http://localhost:20128/v1';
    } else if (isMaiaKey) {
      defaultBaseUrl = 'https://api.maiarouter.ai/v1';
    }

    const effectiveBaseUrl = baseUrl || defaultBaseUrl;
    const isRouter = Boolean(effectiveBaseUrl && (effectiveBaseUrl.includes('/chat/completions') || effectiveBaseUrl.includes('router') || effectiveBaseUrl.includes(':20128') || effectiveBaseUrl.includes('/v1')));
    
    // Model identifier formatting
    const sanitizedModel = modelName.replace(/\./g, '-');
    const effectiveModel = isRouter && !modelName.includes('/') && !is9RouterKey ? `anthropic/${sanitizedModel}` : modelName;

    let response: Response;

    if (isRouter) {
      const endpoint = effectiveBaseUrl!.endsWith('/chat/completions') ? effectiveBaseUrl! : `${effectiveBaseUrl!.replace(/\/+$/, '')}/chat/completions`;
      response = await fetch(endpoint, {
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
    } else {
      // Standard Anthropic Messages API
      const endpoint = baseUrl ? `${baseUrl.replace(/\/+$/, '')}/messages` : 'https://api.anthropic.com/v1/messages';
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': trimmedKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 1024,
          temperature,
          system: SYSTEM_PROMPT,
          messages: [
            { role: 'user', content: userPrompt }
          ]
        })
      });
    }

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = `Claude API Error (${response.status}): ${response.statusText}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) errorMsg = `Claude: ${parsed.error.message}`;
      } catch {}
      return {
        provider: 'claude',
        modelName,
        latencyMs,
        success: false,
        error: errorMsg
      };
    }

    const data = (await response.json()) as any;
    const content = data.content?.[0]?.text || data.choices?.[0]?.message?.content || '';
    const analysis = parseAnalysisResult(content, post.text.slice(0, 100));

    return {
      provider: 'claude',
      modelName,
      latencyMs,
      success: true,
      analysis
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      provider: 'claude',
      modelName,
      latencyMs,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Claude error'
    };
  }
}
