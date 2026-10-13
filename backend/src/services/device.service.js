import { HEALTH_STATUSES } from '../database.js';
import { AppError } from '../errors/app-error.js';
import { clean, validateDevice } from '../utils/validation.js';

export class DeviceService {
  constructor(deviceRepository) {
    this.devices = deviceRepository;
  }

  list(query) {
    const search = clean(query.search);
    const status = clean(query.status);
    if (status && !HEALTH_STATUSES.includes(status))
      throw new AppError(400, 'Invalid health status.');
    return this.devices.findAll({ search, status });
  }

  get(id) {
    const device = this.devices.findById(id);
    if (!device) throw new AppError(404, 'Device not found.');
    return device;
  }

  create(body) {
    const device = validateDevice(body);
    try {
      return this.devices.create(device, new Date().toISOString());
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  update(id, body) {
    this.get(id);
    const device = validateDevice(body);
    try {
      return this.devices.update(id, device, new Date().toISOString());
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  delete(id) {
    if (!this.devices.delete(id)) throw new AppError(404, 'Device not found.');
    return { id, deleted: true };
  }

  setHealth(id, body) {
    const healthStatus = clean(body?.healthStatus);
    if (!HEALTH_STATUSES.includes(healthStatus)) {
      throw new AppError(400, `Health Status must be one of: ${HEALTH_STATUSES.join(', ')}.`);
    }
    if (!this.devices.updateHealth(id, healthStatus, new Date().toISOString())) {
      throw new AppError(404, 'Device not found.');
    }
    return this.get(id);
  }

  handleUniqueConstraint(error) {
    if (error?.code === 'ERR_SQLITE_ERROR' && /UNIQUE constraint failed/i.test(error.message)) {
      throw new AppError(409, 'Device Code already exists.');
    }
  }
}
