import os
import re

def process_file(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r') as f:
        content = f.read()

    # Add Modal import if not present
    if "import { Modal }" not in content:
        content = re.sub(r'(import React.*?\n)', r'\1import { Modal } from "./ui/Modal";\n', content, count=1)

    # 1. ForgeAcademy
    if "ForgeAcademy" in filepath:
        content = re.sub(
            r'<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">\s*<div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl max-w-3xl w-full max-h-\[85vh\] flex flex-col shadow-2xl overflow-hidden ">',
            r'<Modal isOpen={isOpen} onClose={onClose} titleId="forge-academy-title" className="max-w-3xl max-h-[85dvh] flex flex-col" hideCloseButton={true}>\n<div className="flex flex-col h-full">',
            content
        )
        content = re.sub(
            r'</div>\s*</div>\s*\);\s*};\s*$',
            r'</div>\n    </Modal>\n  );\n};\n',
            content
        )

    # 2. FigmaExportModal
    if "FigmaExportModal" in filepath:
        content = re.sub(
            r'<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">\s*<div className="bg-white dark:bg-zinc-950 w-full max-w-4xl h-\[90vh\] rounded-3xl border border-neutral-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">',
            r'<Modal isOpen={isOpen} onClose={onClose} titleId="figma-export-title" className="max-w-4xl max-h-[90dvh]" hideCloseButton={true}>\n<div className="flex flex-col h-full">',
            content
        )
        content = re.sub(
            r'</div>\s*</div>\s*\);\s*};\s*$',
            r'</div>\n    </Modal>\n  );\n};\n',
            content
        )

    # 3. InteractiveMockupViewer
    if "InteractiveMockupViewer" in filepath:
        content = re.sub(
            r'<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md">\s*<div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-\[90vh\] animate-in fade-in zoom-in-95 duration-200">',
            r'<Modal isOpen={isOpen} onClose={onClose} titleId="mockup-viewer-title" className="max-w-5xl max-h-[90dvh]" hideCloseButton={true}>\n<div className="flex flex-col h-full">',
            content
        )
        content = re.sub(
            r'</div>\s*</div>\s*\);\s*};\s*$',
            r'</div>\n    </Modal>\n  );\n};\n',
            content
        )

    # 4. VectorizePreviewModal
    if "VectorizePreviewModal" in filepath:
        content = re.sub(
            r'<AnimatePresence>\s*\{isOpen && \(\s*<motion\.div\s*initial={{ opacity: 0 }}\s*animate={{ opacity: 1 }}\s*exit={{ opacity: 0 }}\s*className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md"\s*>\s*<motion\.div\s*initial={{ scale: 0\.95, opacity: 0, y: 10 }}\s*animate={{ scale: 1, opacity: 1, y: 0 }}\s*exit={{ scale: 0\.95, opacity: 0, y: 10 }}\s*className="bg-white dark:bg-zinc-950 w-full max-w-6xl rounded-3xl border border-neutral-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden max-h-\[90vh\]"\s*onClick=\{\(e\) => e\.stopPropagation\(\)\}\s*>',
            r'<Modal isOpen={isOpen} onClose={onClose} titleId="vectorize-title" className="max-w-6xl max-h-[90dvh]" hideCloseButton={true}>\n<div className="flex flex-col h-full">',
            content
        )
        content = re.sub(
            r'</motion\.div>\s*</motion\.div>\s*\)\}\s*</AnimatePresence>',
            r'</div>\n    </Modal>',
            content
        )

    with open(filepath, 'w') as f:
        f.write(content)

for f in ['src/components/ForgeAcademy.tsx', 'src/components/FigmaExportModal.tsx', 'src/components/InteractiveMockupViewer.tsx', 'src/components/VectorizePreviewModal.tsx']:
    process_file(f)
