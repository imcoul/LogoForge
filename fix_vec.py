import re

with open('src/components/VectorizePreviewModal.tsx', 'r') as f:
    c = f.read()

# remove AnimatePresence and motion.divs
c = re.sub(r'<AnimatePresence>.*?<motion\.div[^>]*id="r2v-preview-modal-container"[^>]*>', 
           r'<Modal isOpen={isOpen} onClose={onClose} titleId="vectorize-title" className="max-w-4xl max-h-[90dvh]" hideCloseButton={true}>\n<div className="flex flex-col h-full overflow-hidden">', 
           c, flags=re.DOTALL)

c = re.sub(r'</motion\.div>\s*</motion\.div>\s*</AnimatePresence>', 
           r'</div>\n    </Modal>', 
           c, flags=re.DOTALL)

with open('src/components/VectorizePreviewModal.tsx', 'w') as f:
    f.write(c)
