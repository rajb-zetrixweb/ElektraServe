import { AppError } from '../errors/app-error.js';

export function notFoundHandler(_req, res) {
  return res.status(404).json({ error: 'Route not found.' });
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof AppError) {
    return res.status(error.status).json({
      error: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large.' });
  }
  console.error(error);
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
}
