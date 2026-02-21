import { Router } from 'express';
import * as ctrl from './customers.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { customerSchema } from './customers.schema';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.get('/:id/orders', ctrl.getOrders);
router.get('/:id/invoices', ctrl.getInvoices);
router.post('/', requireRole('admin', 'sales'), validate(customerSchema), ctrl.create);
router.put('/:id', requireRole('admin', 'sales'), validate(customerSchema), ctrl.update);
router.delete('/:id', requireRole('admin', 'sales'), ctrl.remove);

export default router;
