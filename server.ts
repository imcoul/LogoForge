import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import { Client } from "@notionhq/client";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(cookieParser());

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
