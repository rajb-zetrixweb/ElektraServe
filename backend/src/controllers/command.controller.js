import { positiveId } from '../utils/validation.js';

export function createCommandController(service) {
  return {
    list: (req, res) => res.json({ data: service.list(req.query) }),
    create: (req, res) => res.status(201).json({ data: service.create(req.body) }),
    complete: (req, res) =>
      res.json({ data: service.transition(positiveId(req.params.id), 'complete', req.body) }),
    fail: (req, res) =>
      res.json({ data: service.transition(positiveId(req.params.id), 'fail', req.body) }),
    cancel: (req, res) =>
      res.json({ data: service.transition(positiveId(req.params.id), 'cancel', req.body) }),
  };
}
