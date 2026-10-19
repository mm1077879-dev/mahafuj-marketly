import './src/server/config/env';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './src/server/routes/apiRoutes';
import { connectDB } from './src/server/config/db';
import { seedDatabaseIfEmpty } from './src/server/seed/seedData';
import { backfillLegacyIds } from './src/server/seed/backfillLegacyIds';
import { errorHandler } from './src/server/middleware/errorHandler';
import { handleGoogleCallback, handleFacebookCallback } from './src/server/controllers/authController';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve generated images from /src/assets/images
app.use('/src/assets/images', express.static(path.resolve(__dirname, 'src/assets/images')));

// Technical SEO Directives
app.get('/robots.txt', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public/robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public/sitemap.xml'));
});


// Mount OAuth popup callback handlers
app.get(['/auth/callback/google', '/auth/callback/google/'], handleGoogleCallback);
app.get(['/auth/callback/facebook', '/auth/callback/facebook/'], handleFacebookCallback);
app.get(['/auth/callback', '/auth/callback/'], handleGoogleCallback);

// Mount API Routes
app.use('/api', apiRoutes);

// API Error Handler
app.use('/api', errorHandler);

// API 404: unknown API endpoints must return JSON, never the SPA HTML
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

async function startServer() {
  try {
    // Initialize Database
    await connectDB();
    await seedDatabaseIfEmpty();
    await backfillLegacyIds();

    if (process.env.NODE_ENV === 'production') {
      const distPath = path.resolve(__dirname, 'dist');
      const fs = await import('fs');
      if (!fs.existsSync(path.join(distPath, 'index.html'))) {
        console.error(
          `Fatal: production build output not found at ${distPath}. Run "npm run build" before starting the server in production mode.`
        );
        process.exit(1);
      }
      app.use(express.static(distPath));
      app.get('*', (req, res, next) => {
        // Static assets (JS/CSS/images) must 404 instead of returning the SPA HTML
        if (path.extname(req.path)) {
          return next();
        }
        res.sendFile(path.resolve(distPath, 'index.html'), (err) => {
          if (err) next(err);
        });
      });
    } else {
      // In dev mode, mount Vite middlewares
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Marketly Full-Stack Commerce Engine listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Fatal server startup error:', error);
    process.exitCode = 1;
  }
}

startServer();
