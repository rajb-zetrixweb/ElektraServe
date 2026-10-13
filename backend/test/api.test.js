import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import supertest from 'supertest';
import { createApp } from '../src/app.js';

const API_KEY = 'test-api-key-at-least-16-characters';
let application;
let client;

before(() => {
  application = createApp({ databasePath: ':memory:', seed: true, apiKey: API_KEY });
  client = supertest(application.app);
});

after(() => application.close());

function request(method, path, body) {
  const operation = client[method](path).set('X-API-Key', API_KEY);
  return body === undefined ? operation : operation.send(body);
}

test('health is public while protected routes require a valid API key', async () => {
  assert.equal((await client.get('/api/health')).status, 200);
  const missing = await client.get('/api/devices');
  assert.equal(missing.status, 401);
  assert.equal(missing.body.error, 'API key is required.');
  const invalid = await client.get('/api/devices').set('X-API-Key', 'wrong-key');
  assert.equal(invalid.status, 403);
  assert.equal(invalid.body.error, 'API key is invalid.');
  assert.equal(
    (await client.get('/api/devices').set('Authorization', `Bearer ${API_KEY}`)).status,
    200,
  );
});

test('Swagger UI and the OpenAPI document are public and describe every API route', async () => {
  const ui = await client.get('/api-docs/');
  assert.equal(ui.status, 200);
  assert.match(ui.text, /ElektraServe API Documentation/);

  const specification = await client.get('/api-docs.json');
  assert.equal(specification.status, 200);
  assert.equal(specification.body.openapi, '3.0.3');
  assert.ok(specification.body.components.securitySchemes.ApiKeyAuth);
  assert.deepEqual(Object.keys(specification.body.paths).sort(), [
    '/api/commands',
    '/api/commands/{id}/cancel',
    '/api/commands/{id}/complete',
    '/api/commands/{id}/fail',
    '/api/dashboard/summary',
    '/api/devices',
    '/api/devices/{id}',
    '/api/devices/{id}/health-status',
    '/api/health',
  ]);
});

test('seed data and persisted summary are available', async () => {
  const response = await request('get', '/api/dashboard/summary');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, {
    totalDevices: 5,
    healthy: 3,
    warning: 1,
    critical: 1,
    commandsPending: 1,
    commandsCompleted: 1,
  });
});

test('all list endpoints return newest IDs first', async () => {
  const devices = await request('get', '/api/devices');
  const deviceIds = devices.body.data.map((item) => item.id);
  assert.deepEqual(
    deviceIds,
    [...deviceIds].sort((left, right) => right - left),
  );

  const commands = await request('get', '/api/commands');
  const commandIds = commands.body.data.map((item) => item.id);
  assert.deepEqual(
    commandIds,
    [...commandIds].sort((left, right) => right - left),
  );
});

test('device validation and case-insensitive uniqueness are enforced', async () => {
  const invalid = await request('post', '/api/devices', { name: 'No code' });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.details.deviceCode, 'Device Code is required.');

  const duplicate = await request('post', '/api/devices', {
    deviceCode: 'edge-001',
    name: 'Duplicate',
    solutionType: 'Gateway',
  });
  assert.equal(duplicate.status, 409);
});

test('device CRUD, health update, search, and cascade delete work', async () => {
  const created = await request('post', '/api/devices', {
    deviceCode: 'TEST-100',
    name: 'Test unit',
    solutionType: 'Sensor',
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.healthStatus, 'Healthy');
  const id = created.body.data.id;

  const health = await request('post', `/api/devices/${id}/health-status`, {
    healthStatus: 'Critical',
  });
  assert.equal(health.body.data.healthStatus, 'Critical');

  const searched = await request('get', '/api/devices?search=Test%20unit&status=Critical');
  assert.equal(searched.body.data.length, 1);

  const command = await request('post', '/api/commands', { deviceId: id, commandType: 'Restart' });
  assert.equal(command.status, 201);

  assert.equal((await request('delete', `/api/devices/${id}`)).status, 200);
  const commands = await request('get', '/api/commands?status=Pending');
  assert.equal(
    commands.body.data.some((item) => item.deviceId === id),
    false,
  );
});

test('only pending commands transition and failure reason is required', async () => {
  const command = await request('post', '/api/commands', { deviceId: 1, commandType: 'Restart' });
  const id = command.body.data.id;

  assert.equal((await request('post', `/api/commands/${id}/fail`, {})).status, 400);
  const failed = await request('post', `/api/commands/${id}/fail`, { failureReason: 'Timed out' });
  assert.equal(failed.status, 200);
  assert.equal(failed.body.data.failureReason, 'Timed out');
  assert.ok(failed.body.data.completedAtUtc);
  assert.equal((await request('post', `/api/commands/${id}/complete`, {})).status, 409);
});

test('commands for missing devices and invalid statuses are rejected', async () => {
  const missing = await request('post', '/api/commands', {
    deviceId: 99999,
    commandType: 'Restart',
  });
  assert.equal(missing.status, 404);
  const invalid = await request('post', '/api/devices/1/health-status', {
    healthStatus: 'Offline',
  });
  assert.equal(invalid.status, 400);
});
