import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { getConfig } from './config/env.js';
import { openApiDocument } from './config/openapi.js';
import { createCommandController } from './controllers/command.controller.js';
import { createDashboardController } from './controllers/dashboard.controller.js';
import { createDeviceController } from './controllers/device.controller.js';
import { openDatabase } from './database.js';
import { apiKeyAuth } from './middleware/auth.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { CommandRepository } from './repositories/command.repository.js';
import { DeviceRepository } from './repositories/device.repository.js';
import { createCommandRouter } from './routes/command.routes.js';
import { createDashboardRouter } from './routes/dashboard.routes.js';
import { createDeviceRouter } from './routes/device.routes.js';
import { CommandService } from './services/command.service.js';
import { DashboardService } from './services/dashboard.service.js';
import { DeviceService } from './services/device.service.js';

export function createApp(options = {}) {
  const config = getConfig(options);
  const db = options.db || openDatabase(config.databasePath, { seed: options.seed });
  const app = express();

  const deviceRepository = new DeviceRepository(db);
  const commandRepository = new CommandRepository(db);
  const deviceService = new DeviceService(deviceRepository);
  const commandService = new CommandService(commandRepository, deviceRepository);
  const dashboardService = new DashboardService(deviceRepository, commandRepository);

  app.disable('x-powered-by');
  app.use(
    cors({
      origin: config.corsOrigin,
      allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api-docs.json', (_req, res) => res.json(openApiDocument));
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'ElektraServe API Documentation',
      customCss: '.swagger-ui .topbar { display: none; }',
      swaggerOptions: {
        displayRequestDuration: true,
        filter: true,
        persistAuthorization: true,
      },
    }),
  );

  // Health remains public so infrastructure can check availability without a secret.
  app.get('/api/health', (_req, res) => res.json({ data: { status: 'ok' } }));
  app.use('/api', apiKeyAuth(config.apiKey));
  app.use('/api/devices', createDeviceRouter(createDeviceController(deviceService)));
  app.use('/api/commands', createCommandRouter(createCommandController(commandService)));
  app.use('/api/dashboard', createDashboardRouter(createDashboardController(dashboardService)));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, db, config, close: () => db.close() };
}
