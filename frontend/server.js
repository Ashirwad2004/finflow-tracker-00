import './load-env.js';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { paymentRouter } from './server/payments/routes.js';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Set Security and Content-Security-Policy headers
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Content-Security-Policy", "default-src 'self' * 'unsafe-inline' 'unsafe-eval' data: blob:;");
  
  // Intercept res.setHeader to ensure charset=utf-8 is appended for text, JS, and JSON
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

// Proxy /api/v1 requests to the FastAPI backend (http://backend:8000 or http://localhost:8000 depending on environment)
app.use('/api/v1', (req, res) => {
  const isDocker = fs.existsSync('/.dockerenv');
  const backendHost = process.env.BACKEND_HOST || (isDocker ? 'backend' : 'localhost');
  const backendPort = process.env.BACKEND_PORT || '8000';
  
  const options = {
    hostname: backendHost,
    port: backendPort,
    path: `/api/v1${req.url}`,
    method: req.method,
    headers: req.headers
  };

  // Remove the host header so Node uses the target hostname
  if (options.headers && options.headers.host) {
    delete options.headers.host;
  }

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  // If the request has a body (POST/PUT/PATCH), pipe it; otherwise end the request immediately
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    req.pipe(proxyReq, { end: true });
  } else {
    proxyReq.end();
  }

  proxyReq.on('error', (err) => {
    console.error(`Proxy error for /api/v1 (${backendHost}:${backendPort}):`, err.message);
    res.status(502).send('Bad Gateway');
  });
});

// Body parser configuration with raw body capture for signature validation
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true }));

// Register Payments API Router
app.use('/api/payments', paymentRouter);


// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Web App: http://localhost:${PORT}`);
    console.log(`Payments API: http://localhost:${PORT}/api/payments`);
});

export default app;