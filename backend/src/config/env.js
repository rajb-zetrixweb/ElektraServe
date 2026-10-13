import dotenv from 'dotenv';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: resolve(backendRoot, '.env'), quiet: true });

export function getConfig(overrides = {}) {
    const databasePath =
        overrides.databasePath ??
        process.env.DATABASE_PATH ??
        resolve(backendRoot, 'data/elektraserve.db');

    const config = {
        port: Number(overrides.port ?? process.env.PORT ?? 3000),
        databasePath:
            databasePath === ':memory:' || isAbsolute(databasePath)
                ? databasePath
                : resolve(backendRoot, databasePath),
        corsOrigin: overrides.corsOrigin ?? process.env.CORS_ORIGIN ?? 'http://localhost:4200',
        apiKey: overrides.apiKey ?? process.env.API_KEY,
    };

    if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
        throw new Error('PORT must be a valid TCP port number.');
    }
    if (!config.apiKey || config.apiKey.length < 16) {
        throw new Error('API_KEY must be configured and contain at least 16 characters.');
    }
    return Object.freeze(config);
}
