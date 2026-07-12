const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `                ) : activeTab === 'preview' ? (
                  <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 flex flex-col items-center justify-center gap-8 m-auto w-full py-12">`,
  `                ) : activeTab === 'preview' ? (
                  <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 flex flex-col items-center justify-center gap-8 m-auto w-full py-4 md:py-12">`
);

code = code.replace(
  `                ) : activeTab === 'guide' ? (
                  <motion.div key="guide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-12 max-w-4xl mx-auto w-full">`,
  `                ) : activeTab === 'guide' ? (
                  <motion.div key="guide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-4 md:p-12 pb-24 md:pb-12 max-w-4xl mx-auto w-full">`
);

// precision is already p-6 md:p-12

code = code.replace(
  `                ) : activeTab === 'mockups' ? (
                  <motion.div key="mockups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-12 max-w-4xl mx-auto w-full">`,
  `                ) : activeTab === 'mockups' ? (
                  <motion.div key="mockups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-4 md:p-12 pb-24 md:pb-12 max-w-4xl mx-auto w-full">`
);

code = code.replace(
  `                ) : activeTab === 'refine' ? (
                  <motion.div key="refine" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-12 max-w-4xl mx-auto w-full">
                    <div className="flex items-center justify-between mb-8">`,
  `                ) : activeTab === 'refine' ? (
                  <motion.div key="refine" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-4 md:p-12 pb-24 md:pb-12 max-w-4xl mx-auto w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">`
);

code = code.replace(
  `                ) : activeTab === 'sonic' ? (
                  <motion.div key="sonic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-12 max-w-4xl mx-auto w-full">`,
  `                ) : activeTab === 'sonic' ? (
                  <motion.div key="sonic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-4 md:p-12 pb-24 md:pb-12 max-w-4xl mx-auto w-full">`
);

code = code.replace(
  `                ) : activeTab === 'comments' ? (
                  <motion.div key="comments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-12 max-w-3xl mx-auto w-full flex flex-col h-full">`,
  `                ) : activeTab === 'comments' ? (
                  <motion.div key="comments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-4 md:p-12 pb-24 md:pb-12 max-w-3xl mx-auto w-full flex flex-col h-full">`
);

fs.writeFileSync('src/App.tsx', code);
