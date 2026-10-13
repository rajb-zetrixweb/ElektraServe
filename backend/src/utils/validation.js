import { HEALTH_STATUSES } from '../database.js';
import { AppError } from '../errors/app-error.js';

export function validateDevice(body) {
  const deviceCode = clean(body?.deviceCode);
  const name = clean(body?.name);
  const solutionType = clean(body?.solutionType);
  const healthStatus = clean(body?.healthStatus || 'Healthy');
  const details = {};

  if (!deviceCode) details.deviceCode = 'Device Code is required.';
  else if (deviceCode.length > 50)
    details.deviceCode = 'Device Code must be 50 characters or fewer.';
  if (!name) details.name = 'Name is required.';
  else if (name.length > 100) details.name = 'Name must be 100 characters or fewer.';
  if (!solutionType) details.solutionType = 'Solution Type is required.';
  else if (solutionType.length > 30)
    details.solutionType = 'Solution Type must be 30 characters or fewer.';
  if (!HEALTH_STATUSES.includes(healthStatus)) details.healthStatus = 'Invalid Health Status.';

  let lastSeenUtc = null;
  if (
    body?.lastSeenUtc !== undefined &&
    body?.lastSeenUtc !== null &&
    String(body.lastSeenUtc).trim()
  ) {
    const parsed = new Date(body.lastSeenUtc);
    if (Number.isNaN(parsed.getTime())) details.lastSeenUtc = 'Last Seen must be a valid date.';
    else lastSeenUtc = parsed.toISOString();
  }
  if (Object.keys(details).length) {
    throw new AppError(400, 'Please correct the invalid device fields.', details);
  }
  return {
    deviceCode,
    name,
    solutionType,
    healthStatus,
    lastSeenUtc,
    notes: clean(body?.notes) || null,
  };
}

export function positiveId(value, label = 'ID') {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new AppError(400, `${label} must be a positive integer.`);
  return id;
}

export function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}
