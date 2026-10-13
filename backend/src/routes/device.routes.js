import { Router } from 'express';

export function createDeviceRouter(controller) {
  const router = Router();
  router.route('/').get(controller.list).post(controller.create);
  router.post('/:id/health-status', controller.setHealth);
  router.route('/:id').get(controller.get).put(controller.update).delete(controller.delete);
  return router;
}
