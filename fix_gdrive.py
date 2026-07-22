import re

with open('src/components/GoogleDriveIntegration.tsx', 'r') as f:
    c = f.read()

# Make sure Modal is imported
if 'import { Modal }' not in c:
    c = c.replace("import { useToast } from './Toast';", "import { useToast } from './Toast';\nimport { Modal } from './ui/Modal';")

# replace return ( <div... ) with return ( <Modal...
c = re.sub(
    r'return \(\s*<div className="fixed inset-0 bg-black/60 z-modal flex items-center justify-center p-4 backdrop-blur-sm">\s*<motion\.div.*?className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full h-\[80vh\] flex flex-col overflow-hidden shadow-2xl text-neutral-800 dark:text-zinc-100".*?>',
    r'return (\n    <Modal isOpen={isOpen} onClose={onClose} titleId="gdrive-title" className="max-w-2xl w-full flex flex-col p-0 overflow-hidden shadow-2xl h-[80vh] md:h-[600px]">',
    c, flags=re.DOTALL
)

c = re.sub(r'</motion\.div>\s*</div>\s*\);\s*};\s*$', r'</Modal>\n  );\n};\n', c)

with open('src/components/GoogleDriveIntegration.tsx', 'w') as f:
    f.write(c)
print("Done")
