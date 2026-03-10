// Test login via the Vite proxy (port 5173)
const http = require('http');

const data = JSON.stringify({ username: 'varun', password: '12345678' });

const req = http.request({
  hostname: 'localhost',
  port: 5173,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('[Via Vite Proxy :5173] Status:', res.statusCode);
    console.log('[Via Vite Proxy :5173] Body:', body.substring(0, 200));
  });
});

req.on('error', e => console.error('Connection error (5173):', e.message));
req.write(data);
req.end();
