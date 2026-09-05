import './load-env.js';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3000;

// Security & Header configurations
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';"
  );

  const originalSetHeader = res.setHeader;
  res.setHeader = function (name, value) {
    if (name.toLowerCase() === 'content-type' && typeof value === 'string') {
      if (
        (value.startsWith('text/') || value.startsWith('application/javascript') || value.startsWith('application/json')) &&
        !value.toLowerCase().includes('charset')
      ) {
        value = `${value}; charset=utf-8`;
      }
    }
    return originalSetHeader.call(this, name, value);
  };

  next();
});

// Proxy API requests to FastAPI backend
const isDocker = fs.existsSync('/.dockerenv');
const backendHost = process.env.BACKEND_HOST || (isDocker ? 'backend' : 'localhost');
const backendPort = process.env.BACKEND_PORT || '8000';

const forwardToBackend = (targetPrefix) => (req, res) => {
  const targetPath = targetPrefix ? `${targetPrefix}${req.url}` : req.originalUrl;
  const options = {
    hostname: backendHost,
    port: backendPort,
    path: targetPath,
    method: req.method,
    headers: req.headers,
  };

  if (options.headers && options.headers.host) {
    delete options.headers.host;
  }

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    req.pipe(proxyReq, { end: true });
  } else {
    proxyReq.end();
  }

  proxyReq.on('error', (err) => {
    console.error(`Proxy error for ${req.originalUrl} -> ${backendHost}:${backendPort}:`, err.message);
    res.status(502).json({ error: 'Backend Service Unavailable', details: err.message });
  });
};

app.use('/api/v1', forwardToBackend('/api/v1'));
app.use('/health', forwardToBackend(''));

// Serve static files from React production build directory
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1d',
  etag: true,
}));

// SPA catchall handler
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[Frontend Production Host] Listening on port ${PORT}`);
  console.log(`[Frontend SPA] http://localhost:${PORT}`);
  console.log(`[Backend Proxy Target] http://${backendHost}:${backendPort}/api/v1`);
});

export default app;