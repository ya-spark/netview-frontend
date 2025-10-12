import { logger } from "./utils/logger-init";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { interceptApi } from "./middleware/api-interceptor";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Use new API interceptor middleware for all API requests
app.use('/api', interceptApi);

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error to rotating logger
    logger.error(`[${status}] ${message} - ${err.stack || ''}`, 'error-handler');

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

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    logger.info(`Server started on port ${port}`, 'server');
    logger.info(`Log configuration: Max total size=${process.env.LOG_MAX_TOTAL_SIZE_MB || '1'}MB, Max file size=${process.env.LOG_MAX_FILE_SIZE_MB || '0.5'}MB`, 'server');
  });
})();
