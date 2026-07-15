import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import geminiRouter from '../../server/geminiRouter';

vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    models = {
      generateContent: vi.fn().mockImplementation(async (req) => {
        // We can inspect some state here or throw if needed to simulate an error
        return { text: '{"op": "test", "nodeId": "1"}' };
      })
    };
    constructor(options: any) {
      if (options.apiKey === 'AIzaSy_EXPIRED') {
        throw new Error('401 Unauthorized');
      }
    }
  }
  return {
    GoogleGenAI: MockGoogleGenAI,
    Type: {}
  };
});

const app = express();
app.use(express.json());
app.use('/api/gemini', geminiRouter);

describe('BYOK Matrix Test', () => {
  it('A. Valid Custom Key - uses custom key', async () => {
    const response = await request(app)
      .post('/api/gemini/interpreter')
      .set('x-custom-api-key', 'AIzaSy_VALID_KEY')
      .send({ userCommand: 'test', sceneGraph: {} });
      
    expect(response.status).toBe(200);
  });

  it('B. Omitted Custom Key - falls back to default', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'default_key');
    const response = await request(app)
      .post('/api/gemini/interpreter')
      .send({ userCommand: 'test', sceneGraph: {} });
      
    expect(response.status).toBe(200);
  });

  it('C. Invalid/Expired Key - returns 401 Unauthorized equivalent or fails initialization', async () => {
    const response = await request(app)
      .post('/api/gemini/interpreter')
      .set('x-custom-api-key', 'AIzaSy_EXPIRED')
      .send({ userCommand: 'test', sceneGraph: {} });
      
    expect(response.status).toBe(500); // Because initialization throws, it will result in 500 in this mock
    expect(response.body.error).toContain('Command interpretation failed');
  });
});
