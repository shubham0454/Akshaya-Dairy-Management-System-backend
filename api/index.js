/**
 * Vercel serverless entry: connect DB once, then forward all requests to Express app.
 * Uses process.cwd() so dist/ is found in Vercel's deployment root.
 */
const path = require('path');

const root = process.cwd();
const distPath = path.join(root, 'dist');

let app;
let dbPromise;

function loadApp() {
  try {
    const appModule = require(path.join(distPath, 'app'));
    return appModule.default || appModule;
  } catch (e) {
    console.error('Load app failed:', e.message, 'cwd=', root, 'distPath=', distPath);
    throw e;
  }
}

function loadConnectDB() {
  try {
    const dbModule = require(path.join(distPath, 'config', 'database'));
    return dbModule.default || dbModule;
  } catch (e) {
    console.error('Load database config failed:', e.message);
    throw e;
  }
}

async function getApp() {
  if (!dbPromise) {
    const connectDB = loadConnectDB();
    dbPromise = connectDB().catch((err) => {
      dbPromise = null;
      console.error('MongoDB connect error:', err.message);
      throw err;
    });
  }
  await dbPromise;
  if (!app) {
    app = loadApp();
  }
  return app;
}

const TIMEOUT_MS = 25000;

module.exports = async (req, res) => {
  if (!process.env.MONGODB_URI && process.env.VERCEL) {
    console.error('MONGODB_URI is not set in Vercel Environment Variables');
    return res.status(503).json({
      success: false,
      message: 'Server misconfigured: MONGODB_URI not set. Add it in Vercel Project Settings → Environment Variables.',
    });
  }
  try {
    const application = await getApp();
    // Wait for Express to finish the response; otherwise the serverless function may exit before res.send()
    await new Promise((resolve, reject) => {
      const onDone = () => {
        clearTimeout(timer);
        res.removeListener('finish', onDone);
        res.removeListener('close', onDone);
        res.removeListener('error', onError);
        resolve();
      };
      const onError = (e) => {
        clearTimeout(timer);
        reject(e);
      };
      const timer = setTimeout(() => {
        res.removeListener('finish', onDone);
        res.removeListener('close', onDone);
        res.removeListener('error', onError);
        if (!res.headersSent) {
          res.status(504).json({ success: false, message: 'Request timeout' });
        }
        resolve();
      }, TIMEOUT_MS);
      res.on('finish', onDone);
      res.on('close', onDone);
      res.on('error', onError);
      try {
        application(req, res);
      } catch (e) {
        onError(e);
      }
    });
  } catch (err) {
    console.error('Serverless handler error:', err.message, err.stack);
    let msg = 'Internal server error';
    const m = err.message || '';
    if (m.includes('MongoDB') || m.includes('MONGODB_URI') || m.includes('connection')) {
      msg = 'Database connection failed. Set MONGODB_URI in Vercel Environment Variables.';
    } else if (m.includes('Cannot find module') || m.includes('MODULE_NOT_FOUND')) {
      msg = 'Build or deployment issue: dist not found. Ensure buildCommand runs and includeFiles includes dist.';
    } else if (process.env.VERCEL_ENV !== 'production' || m) {
      msg = m.slice(0, 200);
    }
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: msg });
    }
  }
};
