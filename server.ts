import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import { Client } from "@notionhq/client";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import cors from "cors";
import geminiRouter from "./src/server/geminiRouter.ts";
import backupRouter from "./src/server/backupRouter.ts";

dotenv.config();

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const PORT = 3000;

  // Strict CORS configuration
  const allowedOrigins = [
    process.env.APP_URL, // Production/Staging URL
    "http://localhost:3000",
    "http://localhost:5173"
  ].filter(Boolean) as string[];

  app.use(cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.run.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));

  app.use(express.json({ limit: "50mb" }));
  app.use(cookieParser());
  
  // Basic CSRF protection: require exact origin for state-changing API requests
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'OPTIONS' && req.path.startsWith('/api/')) {
      const origin = req.headers.origin;
      const appUrl = process.env.APP_URL;
      
      // If we have an APP_URL and an origin, they must match
      if (appUrl && origin && origin !== appUrl && !origin.includes('localhost')) {
        return res.status(403).json({ error: "Forbidden: Invalid origin (CSRF protection)" });
      }
    }
    next();
  });
  
  const geminiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, 
    legacyHeaders: false, 
    message: { error: "Too many requests to the AI proxy, please try again later." },
    validate: { default: false }
  });

  app.use("/api/gemini", geminiLimiter, geminiRouter);
  app.use("/api/backup", backupRouter);

  // OAuth endpoint for URL
  app.get("/api/oauth/notion/url", (req, res) => {
    const redirectUri = `${process.env.APP_URL}/api/oauth/notion/callback`;
    const clientId = process.env.NOTION_CLIENT_ID;
    
    if (!clientId) {
      return res.status(500).json({ error: "NOTION_CLIENT_ID is not configured" });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      owner: "user",
      redirect_uri: redirectUri,
    });

    res.json({ url: `https://api.notion.com/v1/oauth/authorize?${params.toString()}` });
  });

  // OAuth callback
  app.get(["/api/oauth/notion/callback", "/api/oauth/notion/callback/"], async (req, res) => {
    const { code } = req.query;
    const redirectUri = `${process.env.APP_URL}/api/oauth/notion/callback`;

    try {
      if (!code) throw new Error("No code provided");

      const clientId = process.env.NOTION_CLIENT_ID;
      const clientSecret = process.env.NOTION_CLIENT_SECRET;

      const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      
      const response = await fetch("https://api.notion.com/v1/oauth/token", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Basic ${encoded}`,
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error_description || "Failed to exchange token");
      }

      // Normally we would store this token securely associated with a user.
      // Since there is no user database in this single-user tool, we'll set it as a secure cookie.
      res.cookie("notion_access_token", data.access_token, {
        secure: true,
        sameSite: "none",
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      res.cookie("notion_workspace_name", data.workspace_name || "Workspace", {
        secure: true,
        sameSite: "none",
        httpOnly: false, // allow client to read
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', workspace: '${data.workspace_name || "Workspace"}' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      res.send(`
        <html>
          <body>
            <p>Authentication failed: ${error.message}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR' }, '*');
              }
            </script>
          </body>
        </html>
      `);
    }
  });

  // Export to Notion endpoint
  app.post("/api/notion/export", async (req, res) => {
    const token = req.cookies.notion_access_token;
    if (!token) {
      return res.status(401).json({ error: "Not authenticated with Notion" });
    }

    const { projectName, description, colors } = req.body;

    try {
      const notion = new Client({ auth: token });
      
      // We will search for a user's page to attach to, or create at the root
      // Usually integrations are added to specific pages by the user during the OAuth flow.
      // We need to fetch pages the integration has access to.
      const searchRes = await notion.search({
        filter: { property: 'object', value: 'page' },
        page_size: 1,
      });

      if (searchRes.results.length === 0) {
         return res.status(400).json({ error: "No pages found that the integration has access to. Please ensure you shared a page with the integration during setup." });
      }

      const parentPageId = searchRes.results[0].id;

      const newPage = await notion.pages.create({
        parent: { page_id: parentPageId },
        properties: {
          title: {
            title: [
              {
                text: { content: `${projectName} - Brand Guidelines` }
              }
            ]
          }
        },
        children: [
          {
            object: 'block',
            type: 'heading_1',
            heading_1: { rich_text: [{ type: 'text', text: { content: 'Brand Strategy' } }] }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ type: 'text', text: { content: description || "No description provided." } }] }
          },
          {
            object: 'block',
            type: 'heading_2',
            heading_2: { rich_text: [{ type: 'text', text: { content: 'Colors' } }] }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                { type: 'text', text: { content: Array.isArray(colors) ? colors.join(", ") : "No colors generated yet." } }
              ]
            }
          }
        ]
      });

      res.json({ success: true, url: (newPage as any).url });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to export to Notion" });
    }
  });

  // POST /api/export/pptx - Server-side PPTX generation
  app.post("/api/export/pptx", async (req, res) => {
    try {
      const { projectName, description, brandGuide, colors } = req.body;
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      
      pptx.layout = "LAYOUT_16x9";
      
      // Slide 1: Cover
      const slide1 = pptx.addSlide();
      slide1.background = { color: "0F172A" }; // Slate Dark background
      
      slide1.addText(projectName || "Forgel Brand Deck", {
        x: 1.0,
        y: 2.2,
        w: 11.3,
        h: 1.5,
        fontSize: 48,
        bold: true,
        color: "FFFFFF",
        fontFace: "Arial"
      });
      
      slide1.addText("AUTHORITATIVE BRAND IDENTITY SPECIFICATIONS", {
        x: 1.0,
        y: 3.8,
        w: 11.3,
        h: 0.5,
        fontSize: 14,
        color: "818CF8", // Indigo accent
        fontFace: "Courier New",
        bold: true
      });

      slide1.addText(description || "Generated via Forgel Branding Forge Studio", {
        x: 1.0,
        y: 4.8,
        w: 11.3,
        h: 1.0,
        fontSize: 16,
        color: "94A3B8",
        fontFace: "Arial"
      });

      // Slide 2: Brand Strategy
      const slide2 = pptx.addSlide();
      slide2.background = { color: "F8FAFC" };
      slide2.addText("1. Strategic Vision & Brand Voice", {
        x: 0.8,
        y: 0.8,
        w: 11.7,
        h: 0.6,
        fontSize: 28,
        bold: true,
        color: "1E293B"
      });

      const voiceTone = brandGuide?.brandVoice?.tone || "Professional, Clean";
      const voiceDesc = brandGuide?.brandVoice?.description || description || "No brand philosophy configured.";
      const keywords = brandGuide?.brandVoice?.keywords || [];

      slide2.addText(`Brand Voice & Tone: ${voiceTone}\n\nPhilosophy:\n${voiceDesc}\n\nKey Attributes: ${keywords.join(", ")}`, {
        x: 0.8,
        y: 1.8,
        w: 11.7,
        h: 4.5,
        fontSize: 16,
        color: "334155",
        fontFace: "Arial"
      });

      // Slide 3: Colors
      const slide3 = pptx.addSlide();
      slide3.background = { color: "F8FAFC" };
      slide3.addText("2. Color Palette Specification", {
        x: 0.8,
        y: 0.8,
        w: 11.7,
        h: 0.6,
        fontSize: 28,
        bold: true,
        color: "1E293B"
      });

      const colorsList = Array.isArray(colors) ? colors : (brandGuide?.primaryColors?.map((c: any) => c.hex) || ["#4F46E5", "#0F172A", "#64748B"]);
      
      slide3.addText("Active Core Color Swatches:", {
        x: 0.8,
        y: 1.6,
        w: 11.7,
        h: 0.4,
        fontSize: 18,
        bold: true,
        color: "475569"
      });

      colorsList.forEach((hex: string, idx: number) => {
        if (idx < 5) {
          const xPos = 0.8 + idx * 2.4;
          // Color block shape
          slide3.addShape("rect", {
            x: xPos,
            y: 2.2,
            w: 2.0,
            h: 2.0,
            fill: { color: hex.replace("#", "") }
          });
          // Description
          slide3.addText(hex.toUpperCase(), {
            x: xPos,
            y: 4.4,
            w: 2.0,
            h: 0.8,
            fontSize: 14,
            bold: true,
            color: "1E293B",
            align: "center",
            fontFace: "Courier New"
          });
        }
      });

      // Slide 4: Typography
      const slide4 = pptx.addSlide();
      slide4.background = { color: "F8FAFC" };
      slide4.addText("3. Typography Guidelines", {
        x: 0.8,
        y: 0.8,
        w: 11.7,
        h: 0.6,
        fontSize: 28,
        bold: true,
        color: "1E293B"
      });

      const primaryFont = brandGuide?.typography?.primaryFont || "Inter";
      const secondaryFont = brandGuide?.typography?.secondaryFont || "Courier Prime";
      const typoRules = brandGuide?.typography?.guidelines || "Apply ample margins and focus visual attention on standard hierarchies.";

      slide4.addText(`Primary Font: ${primaryFont}\nSecondary Font: ${secondaryFont}\n\nTypographic Guidelines:\n${typoRules}`, {
        x: 0.8,
        y: 1.8,
        w: 11.7,
        h: 4.5,
        fontSize: 16,
        color: "334155",
        fontFace: "Arial"
      });

      const buffer = await pptx.write("nodebuffer" as any);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
      res.setHeader("Content-Disposition", `attachment; filename=${projectName.toLowerCase().replace(/\s+/g, "-")}-guidelines.pptx`);
      res.send(buffer);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Failed to generate PPTX document: " + err.message });
    }
  });

  // POST /api/export/png - Server-side SVG-to-PNG generation
  app.post("/api/export/png", async (req, res) => {
    try {
      const { svgContent, projectName } = req.body;
      const sharp = (await import("sharp")).default;
      
      const pngBuffer = await sharp(Buffer.from(svgContent))
        .png()
        .toBuffer();
        
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", `attachment; filename=${projectName.toLowerCase().replace(/\s+/g, "-")}.png`);
      res.send(pngBuffer);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Failed to generate PNG image: " + err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Track rooms and active connections for real-time CRDT/Collaboration sync
  interface SessionUser {
    id: string;
    username: string;
    color: string;
    ws: any;
    cursor?: { x: number; y: number };
  }

  const rooms: Record<string, {
    projectState: any;
    users: SessionUser[];
    conflictsLog: string[];
  }> = {};

  const { WebSocketServer } = await import("ws");
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    try {
      const url = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
      if (url.pathname === "/ws-collab" || url.pathname === "/ws-collab/") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      }
    } catch (e) {
      console.error("[Collab Server] Error during upgrade handler:", e);
    }
  });

  wss.on("connection", (ws: any) => {
    let currentRoomId: string | null = null;
    let userId: string | null = null;

    ws.on("error", (err: any) => {
      console.error(`[Collab Server] Socket error for user ${userId || "unknown"}:`, err);
    });

    ws.on("message", (messageStr: string) => {
      try {
        const msg = JSON.parse(messageStr);
        
        if (msg.type === "join") {
          const { roomId, username, projectState, authToken } = msg;
          
          // Verify authentication token if required by environment
          const requiredToken = process.env.WS_AUTH_TOKEN;
          if (requiredToken && authToken !== requiredToken) {
            ws.send(JSON.stringify({ type: "error", message: "Unauthorized: Invalid or missing auth token." }));
            ws.close();
            return;
          }

          currentRoomId = roomId;
          userId = msg.userId || Math.random().toString(36).substring(2, 9);
          
          if (!rooms[roomId]) {
            rooms[roomId] = {
              projectState: projectState || null,
              users: [],
              conflictsLog: []
            };
          }
          
          const colors = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];
          const userColor = colors[rooms[roomId].users.length % colors.length];

          const newUser: SessionUser = {
            id: userId!,
            username: username || "Anonymous Co-Editor",
            color: userColor,
            ws
          };

          rooms[roomId].users.push(newUser);

          ws.send(JSON.stringify({
            type: "welcome",
            userId,
            color: userColor,
            projectState: rooms[roomId].projectState,
            activeUsers: rooms[roomId].users.map(u => ({ id: u.id, username: u.username, color: u.color }))
          }));

          broadcastToRoom(roomId, ws, {
            type: "user_joined",
            user: { id: userId, username: newUser.username, color: userColor },
            activeUsers: rooms[roomId].users.map(u => ({ id: u.id, username: u.username, color: u.color }))
          });

          console.log(`[Collab] User ${newUser.username} joined room ${roomId}.`);
        }

        else if (msg.type === "sync" && currentRoomId) {
          const { projectState } = msg;
          const room = rooms[currentRoomId];
          
          if (room) {
            const incomingComments = projectState?.comments || [];
            const existingComments = room.projectState?.comments || [];
            
            const mergedComments = [...existingComments];
            incomingComments.forEach((c: any) => {
              if (!mergedComments.some(mc => mc.id === c.id)) {
                mergedComments.push(c);
              }
            });

            room.projectState = {
              ...projectState,
              comments: mergedComments
            };

            broadcastToRoom(currentRoomId, ws, {
              type: "sync",
              projectState: room.projectState,
              senderId: userId
            });
          }
        }

        else if (msg.type === "cursor" && currentRoomId) {
          const { x, y } = msg;
          const room = rooms[currentRoomId];
          if (room) {
            const user = room.users.find(u => u.id === userId);
            if (user) {
              user.cursor = { x, y };
              broadcastToRoom(currentRoomId, ws, {
                type: "cursor",
                userId,
                username: user.username,
                color: user.color,
                x,
                y
              });
            }
          }
        }

        else if (msg.type === "ghost_sync" && currentRoomId) {
          const { ghostData } = msg;
          broadcastToRoom(currentRoomId, ws, {
            type: "ghost_sync",
            senderId: userId,
            ghostData
          });
        }
        else if (msg.type === "comment" && currentRoomId) {
          const { comment } = msg;
          const room = rooms[currentRoomId];
          if (room && room.projectState) {
            if (!room.projectState.comments) room.projectState.comments = [];
            room.projectState.comments.push(comment);

            broadcastToRoom(currentRoomId, null, {
              type: "sync",
              projectState: room.projectState,
              senderId: "system"
            });
          }
        }
      } catch (e) {
        console.error("WS Message Error:", e);
      }
    });

    ws.on("close", () => {
      if (currentRoomId && userId) {
        const room = rooms[currentRoomId];
        if (room) {
          room.users = room.users.filter(u => u.id !== userId);
          console.log(`[Collab] User left room ${currentRoomId}. Remaining: ${room.users.length}`);

          broadcastToRoom(currentRoomId, null, {
            type: "user_left",
            userId,
            activeUsers: room.users.map(u => ({ id: u.id, username: u.username, color: u.color }))
          });
        }
      }
    });
  });

  function broadcastToRoom(roomId: string, senderWs: any, payload: any) {
    const room = rooms[roomId];
    if (room) {
      const dataStr = JSON.stringify(payload);
      room.users.forEach(user => {
        if (user.ws !== senderWs && user.ws.readyState === 1) { // 1 is OPEN in ws
          user.ws.send(dataStr);
        }
      });
    }
  }
}

startServer();
