import { COMMAND_STATUSES } from '../database.js';
import { AppError } from '../errors/app-error.js';
import { clean, positiveId } from '../utils/validation.js';

const TRANSITIONS = Object.freeze({ complete: 'Completed', fail: 'Failed', cancel: 'Cancelled' });

export class CommandService {
  constructor(commandRepository, deviceRepository) {
    this.commands = commandRepository;
    this.devices = deviceRepository;
  }

  list(query) {
    const status = clean(query.status);
    if (status && !COMMAND_STATUSES.includes(status))
      throw new AppError(400, 'Invalid command status.');
    return this.commands.findAll(status);
  }

  create(body) {
    const deviceId = positiveId(body?.deviceId, 'Device ID');
    const commandType = clean(body?.commandType || 'Restart');
    if (commandType !== 'Restart') throw new AppError(400, 'Command Type must be Restart.');
    if (!this.devices.exists(deviceId)) throw new AppError(404, 'Device not found.');
    return this.commands.create(deviceId, new Date().toISOString());
  }

  transition(id, action, body) {
    const command = this.commands.findById(id);
    if (!command) throw new AppError(404, 'Command not found.');
    if (command.status !== 'Pending') {
      throw new AppError(
        409,
        `Only Pending commands can be changed. This command is ${command.status}.`,
      );
    }

    const nextStatus = TRANSITIONS[action];
    if (!nextStatus) throw new AppError(400, 'Invalid command transition.');
    let failureReason = null;
    if (action === 'fail') {
      failureReason = clean(body?.failureReason);
      if (!failureReason) throw new AppError(400, 'A failure reason is required.');
      if (failureReason.length > 500)
        throw new AppError(400, 'Failure reason must be 500 characters or fewer.');
    }

    const changed = this.commands.transition(
      id,
      nextStatus,
      new Date().toISOString(),
      failureReason,
    );
    if (!changed) throw new AppError(409, 'Command status changed before this request completed.');
    return this.commands.findById(id);
  }
}
