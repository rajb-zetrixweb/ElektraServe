export function createDashboardController(service) {
  return {
    summary: (_req, res) => res.json({ data: service.getSummary() }),
  };
}
