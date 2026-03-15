/**
 * Vercel serverless entry: connect DB once, then forward all requests to Express app.
 * Build: npm run build:vercel (outputs to api/dist). Use static require so Vercel bundles dist.
 */
let app;
let dbPromise;

async function getApp() {
  if (!dbPromise) {
    const connectDB = require('./dist/config/database').default;
    dbPromise = connectDB().catch((err) => {
      dbPromise = null;
      console.error('MongoDB connect error:', err.message);
      throw err;
    });
  }
  await dbPromise;
  if (!app) {
    const appModule = require('./dist/app');
    app = appModule.default || appModule;
  }
  return app;
}

const TIMEOUT_MS = 25000;

function sendError(res, status, msg) {
  try {
    if (!res.headersSent) res.status(status).json({ success: false, message: msg });
  } catch (_) {}
}

module.exports = async (req, res) => {
  try {
    if (!process.env.MONGODB_URI && process.env.VERCEL) {
      console.error('MONGODB_URI is not set in Vercel Environment Variables');
      return res.status(503).json({
        success: false,
        message: 'Server misconfigured: MONGODB_URI not set. Add it in Vercel Project Settings → Environment Variables.',
      });
    }
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
    const m = (err && err.message) || '';
    if (m.includes('MongoDB') || m.includes('MONGODB_URI') || m.includes('connection')) {
      msg = 'Database connection failed. Set MONGODB_URI in Vercel Environment Variables.';
    } else if (m.includes('Cannot find module') || m.includes('MODULE_NOT_FOUND')) {
      msg = 'Build issue: api/dist missing. Check buildCommand is "npm run build:vercel".';
    } else if (m) {
      msg = m.slice(0, 300);
    }
    sendError(res, 500, msg);
  }
};
