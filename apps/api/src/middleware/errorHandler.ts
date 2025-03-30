import { Request, Response, NextFunction } from 'express';

import { createLogger } from '../utils/logger';

const logger = createLogger();

export class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Determine status code and error message
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  
  // Format the error response
  const errorResponse = {
    error: {
      message: err.message || 'Internal Server Error',
      status: statusCode,
    },
  };

  // Add stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error.stack = err.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};
