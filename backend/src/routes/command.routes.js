import { Router } from 'express';

export function createCommandRouter(controller) {
  const router = Router();
  router.route('/').get(controller.list).post(controller.create);
  router.post('/:id/complete', controller.complete);
  router.post('/:id/fail', controller.fail);
  router.post('/:id/cancel', controller.cancel);
  return router;
}
