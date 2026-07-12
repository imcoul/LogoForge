// AccessibilityScore.tsx - WCAG AA & AAA Color Contrast Audit Module
import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, HelpCircle, Eye } from 'lucide-react';

interface AccessibilityScoreProps {
  primaryColors: { hex: string; name: string }[];
  bgColors: { hex: string; name: string }[];
}

interface ContrastAudit {
  primaryName: string;
  primaryHex: string;
  bgName: string;
  bgHex: string;
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
}

// Convert sRGB channel to relative luminance component
const sRGBtoLuminance = (colorVal: number) => {
  const norm = colorVal / 255;
  return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
};

// Calculate relative luminance of a Hex color
const calculateLuminance = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return 0;
  
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);

  const rLum = sRGBtoLuminance(r);
  const gLum = sRGBtoLuminance(g);
  const bLum = sRGBtoLuminance(b);

  return 0.2126 * rLum + 0.7152 * gLum + 0.0722 * bLum;
};

// Calculate contrast ratio between two hex colors
const calculateContrastRatio = (hex1: string, hex2: string) => {
  const lum1 = calculateLuminance(hex1);
  const lum2 = calculateLuminance(hex2);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
};

export const AccessibilityScore: React.FC<AccessibilityScoreProps> = ({
  primaryColors = [],
  bgColors = []
}) => {
  const [audits, setAudits] = useState<ContrastAudit[]>([]);
  const [overallScore, setOverallScore] = useState<number>(100);

  useEffect(() => {
    // If we don't have enough colors, build fallback audits
    const activePrims = primaryColors.length > 0 ? primaryColors : [{ hex: '#4F46E5', name: 'Default Prim' }];
    const activeBgs = bgColors.length > 0 ? bgColors : [{ hex: '#FFFFFF', name: 'Default Canvas' }];

    const results: ContrastAudit[] = [];
    let scoreSum = 0;

    activePrims.forEach((prim) => {
      activeBgs.forEach((bg) => {
        try {
          const ratio = calculateContrastRatio(prim.hex, bg.hex);
          
          const aaNormal = ratio >= 4.5;
          const aaLarge = ratio >= 3.0;
          const aaaNormal = ratio >= 7.0;
          const aaaLarge = ratio >= 4.5;

          results.push({
            primaryName: prim.name,
            primaryHex: prim.hex,
            bgName: bg.name,
            bgHex: bg.hex,
            ratio: parseFloat(ratio.toFixed(2)),
            aaNormal,
            aaLarge,
            aaaNormal,
            aaaLarge
          });

          // Compute penalty points if contrast is sub-par
          let pairScore = 100;
          if (!aaNormal) pairScore -= 30;
          if (!aaLarge) pairScore -= 20;
          if (!aaaNormal) pairScore -= 10;
          scoreSum += pairScore;
        } catch (e) {
          console.error(e);
        }
      });
    });

    setAudits(results);
    if (results.length > 0) {
      setOverallScore(Math.max(10, Math.round(scoreSum / results.length)));
    }
  }, [primaryColors, bgColors]);

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent (WCAG AAA Pass)', color: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200' };
    if (score >= 70) return { label: 'Good (WCAG AA Pass)', color: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200' };
    if (score >= 50) return { label: 'Partial Compliance', color: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200' };
    return { label: 'Action Required (Fails WCAG AA)', color: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200' };
  };

  const scoreMeta = getScoreBadge(overallScore);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-neutral-800 dark:text-zinc-200 flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" size={18} />
            Accessibility Audit Center
          </h3>
          <p className="text-xs text-neutral-500">Automated color contrast evaluation aligned with W3C WCAG guidelines</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Contrast Score</span>
            <span className="text-2xl font-mono font-extrabold text-neutral-900 dark:text-white">{overallScore}/100</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center">
            <span className={`text-lg font-bold font-mono ${overallScore >= 70 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
              {overallScore >= 90 ? 'AAA' : overallScore >= 70 ? 'AA' : 'F'}
            </span>
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-2xl border ${scoreMeta.color} text-xs font-bold flex items-center gap-2.5`}>
        {overallScore >= 70 ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
        <span>{scoreMeta.label}</span>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Calculated Color Combinations</h4>
        
        <div className="space-y-3">
          {audits.map((audit, idx) => (
            <div key={idx} className="p-4 bg-neutral-50 dark:bg-zinc-900/40 border border-neutral-200/50 dark:border-zinc-800/50 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-full border border-neutral-200" style={{ backgroundColor: audit.primaryHex }} title={audit.primaryName} />
                    <div className="w-6 h-6 rounded-full border border-neutral-200" style={{ backgroundColor: audit.bgHex }} title={audit.bgName} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-800 dark:text-zinc-200">
                      {audit.primaryName} vs {audit.bgName}
                    </span>
                    <span className="text-[10px] text-neutral-500 block font-mono">
                      {audit.primaryHex.toUpperCase()} on {audit.bgHex.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-neutral-400">Ratio:</span>
                  <span className="text-sm font-mono font-bold text-neutral-800 dark:text-zinc-100 bg-white dark:bg-zinc-950 px-2.5 py-1 rounded-xl border border-neutral-200 dark:border-zinc-800">
                    {audit.ratio}:1
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-950 rounded-lg border border-neutral-100 dark:border-zinc-900">
                  <span className="text-neutral-500">AA Normal</span>
                  <span className={`font-mono font-bold ${audit.aaNormal ? 'text-green-600' : 'text-red-500'}`}>
                    {audit.aaNormal ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-950 rounded-lg border border-neutral-100 dark:border-zinc-900">
                  <span className="text-neutral-500">AA Large</span>
                  <span className={`font-mono font-bold ${audit.aaLarge ? 'text-green-600' : 'text-red-500'}`}>
                    {audit.aaLarge ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-950 rounded-lg border border-neutral-100 dark:border-zinc-900">
                  <span className="text-neutral-500">AAA Normal</span>
                  <span className={`font-mono font-bold ${audit.aaaNormal ? 'text-green-600' : 'text-red-500'}`}>
                    {audit.aaaNormal ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-950 rounded-lg border border-neutral-100 dark:border-zinc-900">
                  <span className="text-neutral-500">AAA Large</span>
                  <span className={`font-mono font-bold ${audit.aaaLarge ? 'text-green-600' : 'text-red-500'}`}>
                    {audit.aaaLarge ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              </div>

              {audit.ratio < 4.5 && (
                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/30 dark:border-amber-900/30">
                  ⚠️ <strong>Contrast Hint:</strong> To meet WCAG AA requirements for standard text, consider darkening the primary {audit.primaryName} ({audit.primaryHex}) or adjusting the background shade.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
