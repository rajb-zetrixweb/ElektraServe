import { positiveId } from '../utils/validation.js';

export function createDeviceController(service) {
  return {
    list: (req, res) => res.json({ data: service.list(req.query) }),
    get: (req, res) => res.json({ data: service.get(positiveId(req.params.id)) }),
    create: (req, res) => res.status(201).json({ data: service.create(req.body) }),
    update: (req, res) => res.json({ data: service.update(positiveId(req.params.id), req.body) }),
    delete: (req, res) => res.json({ data: service.delete(positiveId(req.params.id)) }),
    setHealth: (req, res) =>
      res.json({ data: service.setHealth(positiveId(req.params.id), req.body) }),
  };
}
