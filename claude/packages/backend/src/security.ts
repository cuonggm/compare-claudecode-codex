import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { config } from './config.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

interface RateBucket {
  count: number;
  resetAt: number;
}

export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
  next();
};

export function createWriteRateLimiter(): RequestHandler {
  const buckets = new Map<string, RateBucket>();

  return (req, res, next) => {
    if (!WRITE_METHODS.has(req.method)) {
      next();
      return;
    }

    const now = Date.now();
    const user = (req as Request & { user?: { id: string } }).user;
    const key = `${user?.id ?? req.ip ?? 'unknown'}:${req.method}`;
    const current = buckets.get(key);
    const bucket = current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + config.rateLimitWindowMs };

    bucket.count += 1;
    buckets.set(key, bucket);

    if (buckets.size > 1000) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
      }
    }

    if (bucket.count > config.rateLimitMaxWrites) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        error: 'Quá nhiều thao tác ghi trong thời gian ngắn. Vui lòng thử lại sau.',
      });
      return;
    }

    next();
  };
}

export function apiNotFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Không tìm thấy endpoint ${req.method} ${req.originalUrl}.` });
}

export const apiErrorHandler: ErrorRequestHandler = (err, _req, res, _next: NextFunction) => {
  if (res.headersSent) return;

  const isJsonSyntaxError = err instanceof SyntaxError && 'body' in err;
  if (isJsonSyntaxError) {
    res.status(400).json({ error: 'JSON không hợp lệ.' });
    return;
  }

  console.error('[kilnflow] unhandled API error', err);
  res.status(500).json({ error: 'Lỗi máy chủ nội bộ.' });
};
