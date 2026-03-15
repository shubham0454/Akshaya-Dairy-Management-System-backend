import mongoose from 'mongoose';
import logger from '../utils/logger';

/**
 * mongodb+srv URIs must not include a port (port is resolved via SRV).
 * Remove :port from the authority (part before the path) to avoid MongoParseError.
 */
function sanitizeMongoUri(uri: string): string {
  uri = (uri || '').trim();
  if (!uri.startsWith('mongodb+srv://')) return uri;
  // Authority is everything before the first "/" that starts the path (e.g. ...net/akshaya_dairy)
  const pathSlash = uri.indexOf('/', 14); // 14 = length of "mongodb+srv://"
  if (pathSlash === -1) return uri;
  const authority = uri.slice(0, pathSlash);
  const pathAndQuery = uri.slice(pathSlash);
  // Remove :port when it looks like host:port (after .mongodb.net, .net, etc.)
  let authorityNoPort = authority.replace(/\.(mongodb\.net|net|com|org):\d+$/i, '.$1');
  // If URI has @ (user:pass@host), safe to strip trailing :port from authority
  if (authority.includes('@') && /:\d+$/.test(authorityNoPort)) {
    authorityNoPort = authorityNoPort.replace(/:(\d+)$/, '');
  }
  let result = authorityNoPort + pathAndQuery;
  // Remove port from query string (srv URIs must not specify port)
  result = result.replace(/&port=\d+/g, '').replace(/\?port=\d+/, '?');
  if (result.includes('??')) result = result.replace(/\?\?+/, '?');
  return result;
}

const connectDB = async (): Promise<void> => {
  try {
    let mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/akshaya_dairy';
    mongoURI = sanitizeMongoUri(mongoURI);
    if (process.env.NODE_ENV === 'development' && mongoURI.startsWith('mongodb+srv://')) {
      const redacted = mongoURI.replace(/:\/\/[^/]+/, '://***'); // hide credentials
      logger.info('MongoDB URI (sanitized): ' + redacted.slice(0, 90));
    }

    const options = {
      // Remove deprecated options, use modern defaults
    };

    await mongoose.connect(mongoURI, options);

    logger.info('MongoDB connected successfully', {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Handle process termination
    if (process.env.VERCEL !== '1') {
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      });
    }
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    }
    throw error;
  }
};

export default connectDB;

