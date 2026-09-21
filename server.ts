import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { createComplianceRouter, apiErrorHandler } from "./server/complianceRoutes";
import { createGeminiService } from "./server/gemini";
import { createFirebaseAdminDeps } from "./server/firebaseAdmin";

dotenv.config();

const app = express();
const PORT = 3000;

// Compliance payloads are small text; a tight cap limits abuse.
app.use(express.json({ limit: "100kb" }));

// Lazy GoogleGenAI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. Gemini features will fail.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Demo shortcut for local development only. Off unless explicitly enabled, and never in production.
const demoApiEnabled = process.env.ENABLE_DEMO_API === "true" && process.env.NODE_ENV === "development";
if (process.env.ENABLE_DEMO_API === "true" && !demoApiEnabled) {
  console.warn("ENABLE_DEMO_API is ignored unless NODE_ENV=development.");
}

// Authenticated, rate-limited, server-authoritative compliance API
app.use(
  createComplianceRouter({
    ...createFirebaseAdminDeps(),
    ai: createGeminiService(getGeminiClient),
    demoApiEnabled,
  })
);
app.use("/api", apiErrorHandler);

// Start server with Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.resolve(__dirname, "../dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "../dist/index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
