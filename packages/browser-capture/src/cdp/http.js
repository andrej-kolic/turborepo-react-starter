import http from 'node:http';
import { HOST, PORT } from '../config/env.js';

function httpGet(pathname) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: HOST, port: PORT, path: pathname, method: 'GET' };
    const req = http.request(opts, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on('error', reject);
    req.end();
  });
}

export async function httpGetJson(pathname) {
  const response = await httpGet(pathname);
  if ((response.statusCode || 500) >= 400) {
    throw new Error(
      `GET ${pathname} failed with status ${response.statusCode}`,
    );
  }

  return JSON.parse(response.data);
}
