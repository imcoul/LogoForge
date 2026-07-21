export interface ModelEntry {
  id: string;
  name: string;
  envKey: string;
  endpoint: string;
  defaultModelName: string;
  capabilities: string[];
  recommendedTasks: string[];
  fallbackOrder: number;
  featureFlagKey: string;
}

export const modelRegistry: Record<string, ModelEntry> = {
  stepfun: {
    id: 'stepfun',
    name: 'StepFun 3.7',
    envKey: 'STEPFUN_API_KEY',
    endpoint: 'https://api.stepfun.com/v1/chat/completions',
    defaultModelName: 'step-3.7-flash',
    capabilities: ['text', 'vision', 'fast'],
    recommendedTasks: ['Drafting', 'Fast response', 'Standard chat'],
    fallbackOrder: 1,
    featureFlagKey: 'ENABLE_STEPFUN'
  },
  poolside: {
    id: 'poolside',
    name: 'Poolside Laguna M.1',
    envKey: 'POOLSIDE_API_KEY',
    endpoint: 'https://api.poolside.ai/v1/chat/completions',
    defaultModelName: 'laguna-m.1',
    capabilities: ['text', 'code-generation'],
    recommendedTasks: ['Code assistant', 'Algorithms', 'Reasoning'],
    fallbackOrder: 2,
    featureFlagKey: 'ENABLE_POOLSIDE'
  },
  tencent: {
    id: 'tencent',
    name: 'Tencent Hy3',
    envKey: 'TENCENT_API_KEY',
    endpoint: 'https://api.hunyuan.tencent.com/v1/chat/completions',
    defaultModelName: 'hy3',
    capabilities: ['text', 'vision', 'chat'],
    recommendedTasks: ['Creative writing', 'High contextual depth', 'Symmetry suggestions'],
    fallbackOrder: 3,
    featureFlagKey: 'ENABLE_TENCENT'
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini 3.1 Pro',
    envKey: 'GEMINI_API_KEY',
    endpoint: '', // Uses native GoogleGenAI client
    defaultModelName: 'gemini-3.1-pro-preview',
    capabilities: ['text', 'vision', 'json-schema', 'function-calling'],
    recommendedTasks: ['Advanced vectorizing', 'Complex layout hierarchy', 'Theme generator'],
    fallbackOrder: 0,
    featureFlagKey: 'ENABLE_GEMINI'
  }
};
