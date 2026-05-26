import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini Setup
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey === "MY_GEMINI_API_KEY") {
    console.warn("⚠️ GEMINI_API_KEY is not configured or using placeholder value. AI features will fail.");
  }

  const ai = new GoogleGenAI({
    apiKey: geminiKey || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes
  app.post("/api/gemini/insight", async (req, res) => {
    try {
      if (!geminiKey || geminiKey === "MY_GEMINI_API_KEY") {
        throw new Error("Gemini API key is not configured. Please add GEMINI_API_KEY to Settings > Secrets.");
      }

      const { prompt, storeContext } = req.body;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are TableMaître AI, a restaurant management expert. 
        Given the following store context: ${JSON.stringify(storeContext)}
        Provide a concise, 1-2 sentence operational insight or recommendation for a restaurant manager.
        Focus on efficiency, occupancy, or staffing.
        Prompt: ${prompt}`,
      });

      res.json({ insight: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      
      // Check for permission/scope errors specifically to guide the user
      const isAuthError = 
        error?.message?.includes("PERMISSION_DENIED") || 
        error?.message?.includes("API_KEY_INVALID") ||
        error?.message?.includes("insufficient authentication scopes");

      if (isAuthError) {
        return res.status(403).json({ 
          error: "Authentication failed. Please ensure your Gemini API key is correctly configured in Settings > Secrets.",
          details: error.message 
        });
      }

      res.status(500).json({ error: error.message || "Failed to generate insight" });
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
