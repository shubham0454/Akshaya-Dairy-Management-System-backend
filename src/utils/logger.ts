import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';
const isVercel = process.env.VERCEL === '1';

const transports: winston.transport[] = [];

// File transports only when not on Vercel (serverless filesystem is read-only)
if (!isVercel) {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
    })
  );
}

// Console: in production on Vercel, or in dev with pretty format
transports.push(
  new winston.transports.Console({
    format:
      process.env.NODE_ENV !== 'production'
        ? winston.format.combine(winston.format.colorize(), winston.format.simple())
        : winston.format.combine(winston.format.timestamp(), winston.format.json()),
  })
);

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'akshaya-dairy' },
  transports,
});

export default logger;

