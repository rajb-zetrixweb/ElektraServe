const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

function readApiKey() {
  const envPath = resolve(__dirname, '../backend/.env');
  let envFile;

  try {
    envFile = readFileSync(envPath, 'utf8');
  } catch {
    throw new Error('backend/.env was not found. Copy backend/.env.example to backend/.env.');
  }

  const apiKeyLine = envFile.split(/\r?\n/).find((line) => line.trim().startsWith('API_KEY='));
  const apiKey = apiKeyLine
    ?.slice(apiKeyLine.indexOf('=') + 1)
    .trim()
    .replace(/^['"]|['"]$/g, '');

  if (!apiKey) {
    throw new Error('API_KEY is missing from backend/.env.');
  }

  return apiKey;
}

module.exports = {
  '/api': {
    target: 'http://127.0.0.1:3000',
    secure: false,
    changeOrigin: true,
    headers: { 'X-API-Key': readApiKey() },
  },
};
