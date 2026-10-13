import { createApp } from './app.js';

const application = createApp();
const server = application.app.listen(application.config.port, () => {
  console.log(`ElektraServe API listening at http://localhost:${application.config.port}`);
  console.log(`Swagger UI available at http://localhost:${application.config.port}/api-docs`);
});

function shutdown() {
  server.close(() => {
    application.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
