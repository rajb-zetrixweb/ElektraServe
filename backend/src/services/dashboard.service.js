export class DashboardService {
  constructor(deviceRepository, commandRepository) {
    this.devices = deviceRepository;
    this.commands = commandRepository;
  }

  getSummary() {
    return normalizeCounts({
      ...this.devices.getHealthCounts(),
      ...this.commands.getStatusCounts(),
    });
  }
}

function normalizeCounts(counts) {
  return Object.fromEntries(
    Object.entries(counts).map(([key, value]) => [key, Number(value || 0)]),
  );
}
