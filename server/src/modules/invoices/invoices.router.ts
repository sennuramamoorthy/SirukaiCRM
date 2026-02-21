import { Router } from 'express';
import * as ctrl from './invoices.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { updateStatusSchema } from './invoices.schema';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.patch('/:id/status', requireRole('admin', 'sales'), validate(updateStatusSchema), ctrl.updateStatus);

export default router;
