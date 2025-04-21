import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { fetchSwaggerDocs, parseSwaggerDoc } from "./services/swagger-parser";
import { storage } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Check if we should ingest Swagger documentation
    try {
      // Check if we have API categories already
      const categories = await storage.getApiCategories();
      
      if (categories.length === 0) {
        log('No API categories found. Fetching Swagger documentation...');
        
        // Use MINDAT_API_KEY from environment variables
        const apiKey = process.env.MINDAT_API_KEY;
        
        if (!apiKey) {
          log('MINDAT_API_KEY not found in environment variables. Skipping Swagger ingestion.');
          return;
        }
        
        try {
          const swaggerDoc = await fetchSwaggerDocs(apiKey);
          log('Swagger documentation fetched. Processing...');
          
          const processedCategories = await parseSwaggerDoc(swaggerDoc);
          log(`Successfully imported ${processedCategories.length} API categories with endpoints.`);
        } catch (error: any) {
          log(`Error ingesting Swagger documentation: ${error.message || error}`);
        }
      } else {
        log(`Found ${categories.length} existing API categories. Skipping Swagger ingestion.`);
      }
    } catch (error: any) {
      log(`Error checking API categories: ${error.message || error}`);
    }
  });
})();
