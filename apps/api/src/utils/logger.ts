import winston from 'winston';

export const createLogger = () => {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    defaultMeta: { service: 'arbi-api' },
    transports: [
      // Write to all logs with level 'info' and below to 'combined.log'
      new winston.transports.File({ filename: 'logs/combined.log' }),
      // Write all logs with level 'error' and below to 'error.log'
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    ],
  });

  // If not in production, also log to the console
  if (process.env.NODE_ENV !== 'production') {
    logger.add(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      })
    );
  }

  return logger;
};
