import { Router } from 'express';

export function createDashboardRouter(controller) {
  const router = Router();
  router.get('/summary', controller.summary);
  return router;
}
