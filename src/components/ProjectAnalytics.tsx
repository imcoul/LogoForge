import React from 'react';
import { useAppStore } from '../store';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export const ProjectAnalytics = () => {
  const projects = useAppStore(state => state.projects);
  const total = projects.length;
  const active = projects.filter(p => !p.archived).length;
  const archived = projects.filter(p => p.archived).length;
  
  const stageCounts = projects.reduce((acc, p) => {
    acc[p.stage] = (acc[p.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stageData = Object.entries(stageCounts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316'];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-neutral-200 dark:border-zinc-800 shadow-sm">
      <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-6">Project Analytics</h2>
      
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-neutral-50 dark:bg-zinc-950 p-4 rounded-2xl border border-neutral-100 dark:border-zinc-800">
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold">Total</p>
          <p className="text-2xl font-black text-neutral-900 dark:text-white">{total}</p>
        </div>
        <div className="bg-neutral-50 dark:bg-zinc-950 p-4 rounded-2xl border border-neutral-100 dark:border-zinc-800">
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold">Active</p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{active}</p>
        </div>
        <div className="bg-neutral-50 dark:bg-zinc-950 p-4 rounded-2xl border border-neutral-100 dark:border-zinc-800">
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold">Archived</p>
          <p className="text-2xl font-black text-neutral-400 dark:text-zinc-500">{archived}</p>
        </div>
      </div>

      <h3 className="text-sm font-bold text-neutral-700 dark:text-zinc-300 mb-4">Stage Progress</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={stageData}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {stageData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
