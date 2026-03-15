/**
 * Vercel serverless entry: connect DB once, then forward all requests to Express app.
 */
const path = require('path');

let app;
let dbPromise;

async function getApp() {
  if (!dbPromise) {
    const connectDB = require(path.join(__dirname, '..', 'dist', 'config', 'database')).default;
    dbPromise = connectDB().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  await dbPromise;
  if (!app) {
    app = require(path.join(__dirname, '..', 'dist', 'app')).default;
  }
  return app;
}

module.exports = async (req, res) => {
  try {
    const application = await getApp();
    application(req, res);
  } catch (err) {
    console.error('Serverless handler error:', err);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
  }
};
