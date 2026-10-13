const DEVICE_FIELDS = `
  Id AS id, DeviceCode AS deviceCode, Name AS name, SolutionType AS solutionType,
  HealthStatus AS healthStatus, LastSeenUtc AS lastSeenUtc, Notes AS notes,
  CreatedAtUtc AS createdAtUtc, UpdatedAtUtc AS updatedAtUtc`;

export class DeviceRepository {
  constructor(db) {
    this.db = db;
  }

  findAll({ search = '', status = '' }) {
    const where = [];
    const params = [];
    if (search) {
      where.push("(DeviceCode LIKE ? ESCAPE '\\' OR Name LIKE ? ESCAPE '\\')");
      const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
      params.push(like, like);
    }
    if (status) {
      where.push('HealthStatus = ?');
      params.push(status);
    }
    const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    return this.db
      .prepare(`SELECT ${DEVICE_FIELDS} FROM Devices${clause} ORDER BY Id DESC`)
      .all(...params);
  }

  findById(id) {
    return this.db.prepare(`SELECT ${DEVICE_FIELDS} FROM Devices WHERE Id = ?`).get(id);
  }

  exists(id) {
    return Boolean(this.db.prepare('SELECT 1 FROM Devices WHERE Id = ?').get(id));
  }

  create(device, now) {
    const result = this.db
      .prepare(
        `
      INSERT INTO Devices
        (DeviceCode, Name, SolutionType, HealthStatus, LastSeenUtc, Notes, CreatedAtUtc, UpdatedAtUtc)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        device.deviceCode,
        device.name,
        device.solutionType,
        device.healthStatus,
        device.lastSeenUtc,
        device.notes,
        now,
        now,
      );
    return this.findById(Number(result.lastInsertRowid));
  }

  update(id, device, now) {
    this.db
      .prepare(
        ` UPDATE Devices SET DeviceCode = ?, Name = ?, SolutionType = ?, HealthStatus = ?, LastSeenUtc = ?, Notes = ?, UpdatedAtUtc = ? WHERE Id = ? `,
      )
      .run(
        device.deviceCode,
        device.name,
        device.solutionType,
        device.healthStatus,
        device.lastSeenUtc,
        device.notes,
        now,
        id,
      );
    return this.findById(id);
  }

  updateHealth(id, healthStatus, now) {
    return this.db
      .prepare('UPDATE Devices SET HealthStatus = ?, UpdatedAtUtc = ? WHERE Id = ?')
      .run(healthStatus, now, id).changes;
  }

  delete(id) {
    return this.db.prepare('DELETE FROM Devices WHERE Id = ?').run(id).changes;
  }

  getHealthCounts() {
    return this.db
      .prepare(
        `
                SELECT COUNT(*) AS totalDevices,
                    SUM(CASE WHEN HealthStatus = 'Healthy' THEN 1 ELSE 0 END) AS healthy,
                    SUM(CASE WHEN HealthStatus = 'Warning' THEN 1 ELSE 0 END) AS warning,
                    SUM(CASE WHEN HealthStatus = 'Critical' THEN 1 ELSE 0 END) AS critical
                FROM Devices
            `,
      )
      .get();
  }
}
