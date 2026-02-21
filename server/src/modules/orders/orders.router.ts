import { Router } from 'express';
import * as ctrl from './orders.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createOrderSchema, updateOrderSchema, statusSchema } from './orders.schema';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', requireRole('admin', 'sales'), validate(createOrderSchema), ctrl.create);
router.put('/:id', requireRole('admin', 'sales'), validate(updateOrderSchema), ctrl.update);
router.patch('/:id/status', requireRole('admin', 'sales'), validate(statusSchema), ctrl.updateStatus);
router.delete('/:id', requireRole('admin', 'sales'), ctrl.remove);
router.post('/:id/invoice', requireRole('admin', 'sales'), ctrl.generateInvoice);

export default router;
