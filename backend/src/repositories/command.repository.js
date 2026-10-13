const COMMAND_FIELDS = `
  c.Id AS id, c.DeviceId AS deviceId, c.CommandType AS commandType, c.Status AS status,
  c.RequestedAtUtc AS requestedAtUtc, c.CompletedAtUtc AS completedAtUtc,
  c.FailureReason AS failureReason, d.DeviceCode AS deviceCode, d.Name AS deviceName`;

export class CommandRepository {
  constructor(db) {
    this.db = db;
  }

  findAll(status = '') {
    const where = status ? ' WHERE c.Status = ?' : '';
    return this.db
      .prepare(
        `SELECT ${COMMAND_FIELDS} FROM DeviceCommands c JOIN Devices d ON d.Id = c.DeviceId${where} ORDER BY c.Id DESC `,
      )
      .all(...(status ? [status] : []));
  }

  findById(id) {
    return this.db
      .prepare(
        `SELECT ${COMMAND_FIELDS} FROM DeviceCommands c JOIN Devices d ON d.Id = c.DeviceId WHERE c.Id = ? `,
      )
      .get(id);
  }

  create(deviceId, requestedAtUtc) {
    const result = this.db
      .prepare(
        `INSERT INTO DeviceCommands (DeviceId, CommandType, Status, RequestedAtUtc) VALUES (?, 'Restart', 'Pending', ?) `,
      )
      .run(deviceId, requestedAtUtc);
    return this.findById(Number(result.lastInsertRowid));
  }

  transition(id, status, completedAtUtc, failureReason) {
    return this.db
      .prepare(
        `UPDATE DeviceCommands SET Status = ?, CompletedAtUtc = ?, FailureReason = ? WHERE Id = ? AND Status = 'Pending' `,
      )
      .run(status, completedAtUtc, failureReason, id).changes;
  }

  getStatusCounts() {
    return this.db
      .prepare(
        `SELECT SUM(CASE WHEN Status = 'Pending' THEN 1 ELSE 0 END) AS commandsPending, SUM(CASE WHEN Status = 'Completed' THEN 1 ELSE 0 END) AS commandsCompleted FROM DeviceCommands `,
      )
      .get();
  }
}
