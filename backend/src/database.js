import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const HEALTH_STATUSES = ['Healthy', 'Warning', 'Critical'];
const COMMAND_STATUSES = ['Pending', 'Completed', 'Failed', 'Cancelled'];

export function openDatabase(
  filename = process.env.DATABASE_PATH || resolve('data/elektraserve.db'),
  options = {},
) {
  const resolved = filename === ':memory:' ? filename : resolve(filename);
  if (resolved !== ':memory:') mkdirSync(dirname(resolved), { recursive: true });

  const db = new DatabaseSync(resolved);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  migrate(db);
  if (options.seed !== false) seed(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS Devices (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      DeviceCode TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(DeviceCode) <= 50),
      Name TEXT NOT NULL CHECK(length(Name) <= 100),
      SolutionType TEXT NOT NULL CHECK(length(SolutionType) <= 30),
      HealthStatus TEXT NOT NULL CHECK(HealthStatus IN ('Healthy', 'Warning', 'Critical')),
      LastSeenUtc TEXT NULL,
      Notes TEXT NULL,
      CreatedAtUtc TEXT NOT NULL,
      UpdatedAtUtc TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS DeviceCommands (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      DeviceId INTEGER NOT NULL,
      CommandType TEXT NOT NULL CHECK(CommandType = 'Restart'),
      Status TEXT NOT NULL CHECK(Status IN ('Pending', 'Completed', 'Failed', 'Cancelled')),
      RequestedAtUtc TEXT NOT NULL,
      CompletedAtUtc TEXT NULL,
      FailureReason TEXT NULL,
      FOREIGN KEY(DeviceId) REFERENCES Devices(Id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS IX_DeviceCommands_DeviceId ON DeviceCommands(DeviceId);
    CREATE INDEX IF NOT EXISTS IX_DeviceCommands_Status ON DeviceCommands(Status);
  `);
}

function seed(db) {
  const count = db.prepare('SELECT COUNT(*) AS count FROM Devices').get().count;
  if (count > 0) return;

  const now = Date.now();
  const iso = (minutesAgo) => new Date(now - minutesAgo * 60_000).toISOString();
  const addDevice = db.prepare(`
    INSERT INTO Devices
      (DeviceCode, Name, SolutionType, HealthStatus, LastSeenUtc, Notes, CreatedAtUtc, UpdatedAtUtc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const addCommand = db.prepare(`
    INSERT INTO DeviceCommands
      (DeviceId, CommandType, Status, RequestedAtUtc, CompletedAtUtc, FailureReason)
    VALUES (?, 'Restart', ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    const created = iso(1440);
    const ids = [
      addDevice.run(
        'EDGE-001',
        'Lobby Gateway',
        'Gateway',
        'Healthy',
        iso(2),
        'Primary lobby controller',
        created,
        iso(2),
      ).lastInsertRowid,
      addDevice.run(
        'SENSOR-014',
        'Cold Room Sensor',
        'Sensor',
        'Warning',
        iso(18),
        'Battery inspection due',
        created,
        iso(18),
      ).lastInsertRowid,
      addDevice.run(
        'CTRL-007',
        'Assembly Controller',
        'Controller',
        'Critical',
        iso(95),
        'Intermittent connectivity',
        created,
        iso(95),
      ).lastInsertRowid,
      addDevice.run(
        'METER-022',
        'Main Power Meter',
        'Energy Meter',
        'Healthy',
        iso(5),
        null,
        created,
        iso(5),
      ).lastInsertRowid,
      addDevice.run(
        'PANEL-003',
        'North Wing Panel',
        'Control Panel',
        'Healthy',
        null,
        'Awaiting installation',
        created,
        created,
      ).lastInsertRowid,
    ];
    addCommand.run(ids[0], 'Pending', iso(8), null, null);
    addCommand.run(ids[1], 'Completed', iso(180), iso(176), null);
    addCommand.run(ids[2], 'Failed', iso(75), iso(73), 'Device did not acknowledge the command');
    addCommand.run(ids[3], 'Cancelled', iso(35), iso(34), null);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export { HEALTH_STATUSES, COMMAND_STATUSES };
