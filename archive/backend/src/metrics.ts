import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// Default registry and default metrics
client.collectDefaultMetrics({ prefix: 'scrollu_' });

export const httpRequestDuration = new client.Histogram({
  name: 'scrollu_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 5]
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => {
    end({ status_code: String(res.statusCode) });
  });
  next();
}

export function metricsHandler(req: Request, res: Response) {
  res.set('Content-Type', client.register.contentType);
  res.end(client.register.metrics());
}


