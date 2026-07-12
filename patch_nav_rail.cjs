const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `        <button 
          onClick={() => setIsWhacanudoOpen(true)}
          className="p-3 rounded-xl transition-all hover:bg-white dark:hover:bg-zinc-900/20 group relative"
          title="What can you do?"
        >`,
  `        <button 
          onClick={() => setIsWhacanudoOpen(true)}
          className="p-3 rounded-xl transition-all hover:bg-neutral-50 dark:hover:bg-zinc-900 group relative"
          title="What can you do?"
        >`
);

code = code.replace(
  `        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-3 rounded-xl transition-all text-neutral-500 hover:text-white dark:hover:text-amber-400 cursor-pointer"
          title="Toggle Theme"
        >`,
  `        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-3 rounded-xl transition-all text-neutral-500 hover:text-black dark:hover:text-amber-400 hover:bg-neutral-50 dark:hover:bg-zinc-900 cursor-pointer"
          title="Toggle Theme"
        >`
);

code = code.replace(
  `        <button 
          onClick={() => setView('settings')}
          className={\`p-3 rounded-xl transition-all \${view === 'settings' ? 'bg-white dark:bg-zinc-900/20 text-white' : 'text-neutral-500 dark:text-zinc-400 hover:text-white hover:bg-white dark:bg-zinc-900/10'}\`}
          title="Settings"
        >`,
  `        <button 
          onClick={() => setView('settings')}
          className={\`p-3 rounded-xl transition-all \${view === 'settings' ? 'bg-indigo-50 dark:bg-zinc-800 text-brand-lead dark:text-indigo-400' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-zinc-900'}\`}
          title="Settings"
        >`
);

fs.writeFileSync('src/App.tsx', code);
