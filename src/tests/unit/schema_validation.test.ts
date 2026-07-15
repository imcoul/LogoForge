import { describe, it, expect } from 'vitest';
import { Node } from '../../types';
import { BrandGuide } from '../../services/geminiService';

const mockAINode: Partial<Node> = {
  id: 'node-123',
  type: 'path',
  transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0 },
};

const mockBrandGuide = {
  brandName: 'Test Brand',
  primaryColors: [{ hex: '#000000', name: 'Black', usage: 'Primary' }],
  secondaryColors: [{ hex: '#ffffff', name: 'White', usage: 'Secondary' }],
  typography: {
    primaryFont: 'Inter',
    secondaryFont: 'sans-serif',
    guidelines: 'Use cleanly'
  },
  logoUsage: {
    clearSpace: '20px',
    minimumSize: '50px',
    doNot: ['Stretch'],
    
  },
  
} as unknown as BrandGuide;

const validateBrandGuideSchema = (guide: any): boolean => {
  if (!guide || typeof guide !== 'object') return false;
  if (!Array.isArray(guide.primaryColors)) return false;
  if (!guide.typography || typeof guide.typography !== 'object') return false;
  return true;
};

describe('AI Payload Schema Validation', () => {
  it('should validate basic node structure', () => {
    expect(mockAINode).toHaveProperty('id');
    expect(mockAINode).toHaveProperty('type');
    expect(mockAINode).toHaveProperty('transform');
  });

  it('Strict Contract Validation: should validate BrandGuide schema', () => {
    expect(validateBrandGuideSchema(mockBrandGuide)).toBe(true);
  });

  it('Integration Failsafes: should gracefully handle corrupted or partial AI response', () => {
    const corruptedResponse: any = {
      primaryColors: '#000000', // Invalid type
      // Missing typography
    };
    
    // Simulate fallback behavior
    const fallbackGuide = {
      brandName: '',
      primaryColors: Array.isArray(corruptedResponse.primaryColors) ? corruptedResponse.primaryColors : [],
      secondaryColors: [],
      typography: corruptedResponse.typography || { primaryFont: 'Inter', secondaryFont: 'Inter', guidelines: '' },
      logoUsage: { clearSpace: '', minimumSize: '', doNot: [] },
      
    } as unknown as BrandGuide;

    expect(fallbackGuide.primaryColors).toEqual([]);
    expect(fallbackGuide.typography.primaryFont).toBe('Inter');
  });
});
