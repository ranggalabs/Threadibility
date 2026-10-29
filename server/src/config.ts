import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { ModelConfig, ModelProvider } from './types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default Configuration
const DEFAULT_CONFIG: ModelConfig = {
  activeModel: 'openai',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  claudeApiKey: process.env.CLAUDE_API_KEY || '',
  nineRouterApiKey: process.env.NINE_ROUTER_API_KEY || 'sk-e5284dbf7511360f-bqw0y2-8f0a1d4f',
  nineRouterBaseUrl: process.env.NINE_ROUTER_BASE_URL || 'http://localhost:20128/v1',
  nineRouterModel: process.env.NINE_ROUTER_MODEL || 'opencode-go/glm-5.2',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-5.2',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.1-pro',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4.6',
  temperature: 0.2
};

let currentConfig: ModelConfig = loadConfig();

function loadConfig(): ModelConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_CONFIG,
        ...parsed
      };
    }
  } catch (error) {
    console.error('[Threadibility Config] Error reading config.json, using defaults:', error);
  }
  return { ...DEFAULT_CONFIG };
}

export function getConfig(): ModelConfig {
  return { ...currentConfig };
}

export function saveConfig(updates: Partial<ModelConfig>): ModelConfig {
  currentConfig = {
    ...currentConfig,
    ...updates
  };

  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), 'utf-8');
    console.log('[Threadibility Config] Configuration updated successfully.');
  } catch (error) {
    console.error('[Threadibility Config] Failed to save config to file:', error);
  }

  return { ...currentConfig };
}

/**
 * Returns safe config for UI (masks secret keys)
 */
export function getSafeConfig() {
  const maskKey = (key: string) => {
    if (!key) return '';
    const trimmed = key.trim();
    if (trimmed.length <= 8) return '••••••••';
    return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-4)}`;
  };

  return {
    activeModel: currentConfig.activeModel,
    openaiApiKeySet: Boolean(currentConfig.openaiApiKey && currentConfig.openaiApiKey.trim()),
    geminiApiKeySet: Boolean(currentConfig.geminiApiKey && currentConfig.geminiApiKey.trim()),
    claudeApiKeySet: Boolean(currentConfig.claudeApiKey && currentConfig.claudeApiKey.trim()),
    nineRouterApiKeySet: Boolean(currentConfig.nineRouterApiKey && currentConfig.nineRouterApiKey.trim()),
    openaiApiKeyMasked: maskKey(currentConfig.openaiApiKey),
    geminiApiKeyMasked: maskKey(currentConfig.geminiApiKey),
    claudeApiKeyMasked: maskKey(currentConfig.claudeApiKey),
    nineRouterApiKeyMasked: maskKey(currentConfig.nineRouterApiKey || ''),
    nineRouterApiKeyRaw: currentConfig.nineRouterApiKey || '',
    nineRouterBaseUrl: currentConfig.nineRouterBaseUrl || 'http://localhost:20128/v1',
    nineRouterModel: currentConfig.nineRouterModel || 'opencode-go/glm-5.2',
    openaiModel: currentConfig.openaiModel,
    geminiModel: currentConfig.geminiModel,
    claudeModel: currentConfig.claudeModel,
    temperature: currentConfig.temperature
  };
}
