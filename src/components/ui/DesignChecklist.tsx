import React, { useState } from 'react';
import { CheckCircle, Check, Info, RefreshCw } from 'lucide-react';
import { Tooltip } from './Tooltip';

export const DesignChecklist = () => {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  
  const items = [
    { 
      id: 'scalability', 
      label: 'Scalability', 
      desc: 'Logo remains legible when scaled down to 16x16px (favicon size).',
      tip: 'Avoid ultra-thin lines, intricate patterns, or tiny secondary text. Try viewing the design as a small browser tab icon.' 
    },
    { 
      id: 'contrast', 
      label: 'High Contrast', 
      desc: 'Passes WCAG AA contrast ratio (at least 4.5:1) against primary backgrounds.',
      tip: 'Check your foreground and background color hex codes. Adjust shades or values to maximize distinction.' 
    },
    { 
      id: 'monochrome', 
      label: 'Monochrome Readability', 
      desc: 'Design holds up perfectly in pure black and pure white.',
      tip: 'Do not rely entirely on color hue to separate elements. Ensure overlapping elements have distinct light/dark value contrasts.' 
    },
    { 
      id: 'balance', 
      label: 'Visual Balance', 
      desc: 'Optical weight is balanced; no single element overpowers the composition.',
      tip: 'Try squinting or blurring your vision. If one element or area pops out disproportionately, adjust scale or spacing.' 
    },
    { 
      id: 'simplicity', 
      label: 'Simplicity', 
      desc: 'Removes unnecessary details to remain memorable and easy to reproduce.',
      tip: 'Experiment with removing single lines or decoration details. If the brand message still carries, leave them out.' 
    },
  ];

  const toggleCheck = (id: string) => setChecks(prev => ({ ...prev, [id]: !prev[id] }));
  const resetChecks = () => setChecks({});
  const hasChecks = Object.values(checks).some(checked => checked);

  return (
    <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-neutral-200 dark:border-zinc-800 mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <h3 className="text-xl font-bold font-display flex items-center gap-2">
          <CheckCircle size={20} className="text-brand-lead"/> Design Best Practices
        </h3>
        <button 
          onClick={resetChecks}
          disabled={!hasChecks}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 self-start sm:self-auto ${
            hasChecks 
              ? 'text-neutral-600 dark:text-zinc-400 hover:text-brand-lead dark:hover:text-brand-lead hover:bg-neutral-50 dark:hover:bg-zinc-800 cursor-pointer' 
              : 'text-neutral-300 dark:text-zinc-700 cursor-not-allowed opacity-50'
          }`}
        >
          <RefreshCw size={12} />
          Reset All
        </button>
      </div>
      <p className="text-sm text-neutral-500 mb-6">Verify your logo against professional industry standards. Hover or tap the info icon for quick tips.</p>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 dark:border-zinc-800 hover:border-brand-lead transition-colors cursor-pointer" onClick={() => toggleCheck(item.id)}>
            <div className="flex items-center gap-4">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${checks[item.id] ? 'bg-brand-lead border-brand-lead text-white' : 'border-neutral-300 dark:border-zinc-700'}`}>
                {checks[item.id] && <Check size={14} />}
              </div>
              <span className={`font-bold transition-colors ${checks[item.id] ? 'text-neutral-400 dark:text-zinc-500 line-through font-medium' : ''}`}>
                {item.label}
              </span>
            </div>
            
            <Tooltip
              content={
                <>
                  <p className="font-semibold text-neutral-200 dark:text-zinc-100 mb-1">{item.desc}</p>
                  <p className="text-brand-service font-medium">💡 Fix Tip: {item.tip}</p>
                </>
              }
              trigger={
                <button className="p-1.5 text-neutral-400 hover:text-brand-lead dark:text-zinc-500 dark:hover:text-brand-lead transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-800">
                  <Info size={16} />
                </button>
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
};


