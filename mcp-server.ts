import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getDoc, doc, setDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Load config
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any;
try {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error("Failed to load firebase-applet-config.json for MCP server:", e);
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Tools definition
const TOOLS = [
  {
    name: "list-active-brands",
    description: "Lists all active, unarchived brand projects created in Forgel OS.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "get-brand-guide",
    description: "Retrieves the full brand guidelines (pillars, colors, typography, voice) for a specific brand by ID.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "The unique ID of the brand project. If omitted, the most recently updated brand is returned."
        }
      }
    }
  },
  {
    name: "update-brand-logo",
    description: "Updates the SVG source markup of the logo for a specific brand in the database.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "The unique ID of the brand project."
        },
        svgSource: {
          type: "string",
          description: "The new valid raw XML SVG string for the logo."
        }
      },
      required: ["projectId", "svgSource"]
    }
  }
];

// JSON-RPC input parsing
let buffer = '';
process.stdin.on('data', async (chunk) => {
  buffer += chunk.toString();
  let lineEnd;
  while ((lineEnd = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, lineEnd).trim();
    buffer = buffer.slice(lineEnd + 1);
    if (line) {
      try {
        const request = JSON.parse(line);
        await handleRequest(request);
      } catch (e) {
        sendError(null, -32700, "Parse error: " + (e instanceof Error ? e.message : String(e)));
      }
    }
  }
});

function sendResponse(id: any, result: any) {
  process.stdout.write(JSON.stringify({
    jsonrpc: "2.0",
    id,
    result
  }) + '\n');
}

function sendError(id: any, code: number, message: string) {
  process.stdout.write(JSON.stringify({
    jsonrpc: "2.0",
    id,
    error: { code, message }
  }) + '\n');
}

async function handleRequest(request: any) {
  const { jsonrpc, id, method, params } = request;
  if (jsonrpc !== "2.0") {
    return sendError(id, -32600, "Invalid Request: expected jsonrpc 2.0");
  }

  try {
    switch (method) {
      case "initialize":
        return sendResponse(id, {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "forgel-mcp-server",
            version: "1.0.0"
          }
        });

      case "tools/list":
      case "listTools":
        return sendResponse(id, { tools: TOOLS });

      case "tools/call":
      case "callTool": {
        const { name, arguments: args } = params || {};
        const result = await executeTool(name, args);
        return sendResponse(id, result);
      }

      default:
        return sendError(id, -32601, `Method not found: ${method}`);
    }
  } catch (err: any) {
    return sendError(id, -32603, err.message || String(err));
  }
}

async function executeTool(name: string, args: any): Promise<any> {
  switch (name) {
    case "list-active-brands": {
      const qSnapshot = await getDocs(collection(db, 'projects'));
      const list: any[] = [];
      qSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: data.id,
          name: data.name,
          stage: data.stage,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          archived: !!data.archived,
          tags: data.tags || []
        });
      });
      
      const sorted = list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(sorted, null, 2)
          }
        ]
      };
    }

    case "get-brand-guide": {
      const { projectId } = args || {};
      let targetId = projectId;

      if (!targetId) {
        // Find latest updated brand project
        const qSnapshot = await getDocs(collection(db, 'projects'));
        const list: any[] = [];
        qSnapshot.forEach((docSnap) => {
          list.push(docSnap.data());
        });
        if (list.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No brand projects found in database."
              }
            ]
          };
        }
        const sorted = list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        targetId = sorted[0].id;
      }

      const docSnap = await getDoc(doc(db, 'projects', targetId));
      if (!docSnap.exists()) {
        return {
          content: [
            {
              type: "text",
              text: `Project with ID "${targetId}" not found.`
            }
          ]
        };
      }

      const pData = docSnap.data();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              id: pData.id,
              name: pData.name,
              stage: pData.stage,
              description: pData.description,
              brandGuide: pData.brandGuide || null,
              svgSource: pData.svgSource || null,
              driveFileId: pData.driveFileId || null
            }, null, 2)
          }
        ]
      };
    }

    case "update-brand-logo": {
      const { projectId, svgSource } = args || {};
      if (!projectId) {
        throw new Error("Missing required argument: projectId");
      }
      if (!svgSource) {
        throw new Error("Missing required argument: svgSource");
      }

      const docRef = doc(db, 'projects', projectId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Project with ID "${projectId}" not found.`);
      }

      const now = Date.now();
      await setDoc(docRef, {
        svgSource,
        updatedAt: now
      }, { merge: true });

      return {
        content: [
          {
            type: "text",
            text: `Successfully updated brand logo SVG for project "${projectId}". Timestamp: ${now}.`
          }
        ]
      };
    }

    default:
      throw new Error(`Tool not found: ${name}`);
  }
}
