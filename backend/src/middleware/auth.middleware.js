import { timingSafeEqual } from 'node:crypto';

export function apiKeyAuth(expectedApiKey) {
  return (req, res, next) => {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required.' });
    }
    if (!safeEqual(apiKey, expectedApiKey)) {
      return res.status(403).json({ error: 'API key is invalid.' });
    }
    return next();
  };
}

function extractApiKey(req) {
  const headerKey = req.get('x-api-key')?.trim();
  if (headerKey) return headerKey;
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function safeEqual(received, expected) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}
