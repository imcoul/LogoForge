const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf8');

// The strategy components are currently under: activeTab === 'competitor' ? ( ... )
// and activeTab === 'sonic' ? ( ... )
// Let's grab them.

function extractBlock(startStr, endStr) {
  const startIdx = content.indexOf(startStr);
  if (startIdx === -1) return null;
  const endIdx = content.indexOf(endStr, startIdx);
  if (endIdx === -1) return null;
  return content.substring(startIdx + startStr.length, endIdx);
}

const guideBlock = extractBlock(`) : activeTab === 'guide' ? (`, `) : activeTab === 'precision' ? (`);
const mockupsBlock = extractBlock(`) : activeTab === 'mockups' ? (`, `) : activeTab === 'competitor' ? (`);
const ecosystemBlock = extractBlock(`) : activeTab === 'ecosystem' ? (`, `) : activeTab === 'refine' ? (`);

const competitorBlock = extractBlock(`) : activeTab === 'competitor' ? (`, `) : activeTab === 'draw' ? (`);
const sonicBlock = extractBlock(`) : activeTab === 'sonic' ? (`, `) : activeTab === 'comments' ? (`);
const refineBlock = extractBlock(`) : activeTab === 'refine' ? (`, `) : activeTab === 'sonic' ? (`);

// We need to inject these blocks into the new workspaces layout.
// Find the placeholders in the new workspaces block.

const identityPlaceholderGuidelines = `{identitySubTab === 'guidelines' && (
                            <div className="text-sm">Guidelines integration...</div>
                          )}`;
const identityPlaceholderMockups = `{identitySubTab === 'mockups' && (
                            <div className="text-sm">Mockups integration...</div>
                          )}`;
const identityPlaceholderCollateral = `{identitySubTab === 'collateral' && (
                            <div className="text-sm">Ecosystem integration...</div>
                          )}`;
                          
const strategyPlaceholderRivals = `{strategySubTab === 'rivals' && (
                             <div className="text-sm">Competitors...</div>
                           )}`;
const strategyPlaceholderSonic = `{strategySubTab === 'sonic' && (
                             <div className="text-sm">Sonic audio synth...</div>
                           )}`;
                           
const sandboxPlaceholderRefine = `{sandboxSubTab === 'refine' && (
                            <div className="text-sm text-neutral-500">
                              AI prompt console and refinement cards go here.
                            </div>
                          )}`;

if (guideBlock) content = content.replace(identityPlaceholderGuidelines, `{identitySubTab === 'guidelines' && (\n` + guideBlock.trim() + `\n)}`);
if (mockupsBlock) content = content.replace(identityPlaceholderMockups, `{identitySubTab === 'mockups' && (\n` + mockupsBlock.trim() + `\n)}`);
if (ecosystemBlock) content = content.replace(identityPlaceholderCollateral, `{identitySubTab === 'collateral' && (\n` + ecosystemBlock.trim() + `\n)}`);

if (competitorBlock) content = content.replace(strategyPlaceholderRivals, `{strategySubTab === 'rivals' && (\n` + competitorBlock.trim() + `\n)}`);
if (sonicBlock) content = content.replace(strategyPlaceholderSonic, `{strategySubTab === 'sonic' && (\n` + sonicBlock.trim() + `\n)}`);

if (refineBlock) {
  // modify refine block slightly to remove the absolute positioning if any, though it might be fine
  content = content.replace(sandboxPlaceholderRefine, `{sandboxSubTab === 'refine' && (\n` + refineBlock.trim() + `\n)}`);
}

fs.writeFileSync('./src/App.tsx', content);
console.log("Extraction and insertion complete.");
