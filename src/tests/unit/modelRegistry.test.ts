import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import geminiRouter from '../../server/geminiRouter';

vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    models = {
      generateContent: vi.fn().mockImplementation(async (req) => {
        return { text: '{"op": "test", "nodeId": "1"}' };
      })
    };
    constructor(options: any) {}
  }
  return {
    GoogleGenAI: MockGoogleGenAI,
    Type: {}
  };
});

const app = express();
app.use(express.json());
app.use('/api/gemini', geminiRouter);

describe('Model Registry & Fallback Router Tests', () => {
  beforeEach(() => {
    vi.stubEnv('STEPFUN_API_KEY', 'valid_stepfun_key');
    vi.stubEnv('ENABLE_STEPFUN', 'true');
    vi.stubEnv('GEMINI_API_KEY', 'valid_gemini_key');
    // Mock global fetch
    global.fetch = vi.fn().mockImplementation(async (url, options) => {
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"op": "stepfun_action", "nodeId": "step_1"}' } }]
        })
      } as any;
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('A. Custom model routing based on preference header', async () => {
    const response = await request(app)
      .post('/api/gemini/interpreter')
      .set('x-model-preference', 'stepfun')
      .send({ userCommand: 'test', sceneGraph: {} });

    expect(response.status).toBe(200);
    expect(response.body.op).toBe('stepfun_action');
    expect(response.body._meta.model.id).toBe('stepfun');
  });

  it('B. Feature Flag gate - routes to fallback if disabled', async () => {
    vi.stubEnv('ENABLE_STEPFUN', 'false');

    const response = await request(app)
      .post('/api/gemini/interpreter')
      .set('x-model-preference', 'stepfun')
      .send({ userCommand: 'test', sceneGraph: {} });

    // Since stepfun is disabled, it should fallback to Gemini
    expect(response.status).toBe(200);
    expect(response.body.op).toBe('test');
    expect(response.body._meta.model.id).toBe('gemini');
  });

  it('C. Key check fallback - falls back to Gemini if custom key is missing', async () => {
    vi.stubEnv('STEPFUN_API_KEY', '');

    const response = await request(app)
      .post('/api/gemini/interpreter')
      .set('x-model-preference', 'stepfun')
      .send({ userCommand: 'test', sceneGraph: {} });

    expect(response.status).toBe(200);
    expect(response.body.op).toBe('test');
    expect(response.body._meta.model.id).toBe('gemini');
  });
});
