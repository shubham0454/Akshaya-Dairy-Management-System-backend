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

module.exports = async (req, res) => {
  try {
    const application = await getApp();
    application(req, res);
  } catch (err) {
    console.error('Serverless handler error:', err.message, err.stack);
    let msg = 'Internal server error';
    if (process.env.NODE_ENV !== 'production') {
      msg = err.message || String(err);
    } else if (err.message && (err.message.includes('MongoDB') || err.message.includes('MONGODB_URI') || err.message.includes('connection'))) {
      msg = 'Database connection failed. Set MONGODB_URI in Vercel Environment Variables.';
    }
    res.status(500).json({
      success: false,
      message: msg,
    });
  }
};
