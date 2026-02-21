import { Router } from 'express';
import * as ctrl from './inventory.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { productSchema, adjustmentSchema } from './inventory.schema';

const router = Router();
router.use(authenticate);

// Products routes
router.get('/products', ctrl.listProducts);
router.get('/products/categories', ctrl.getCategories);
router.get('/products/:id', ctrl.getProduct);
router.post('/products', requireRole('admin', 'warehouse'), validate(productSchema), ctrl.createProduct);
router.put('/products/:id', requireRole('admin', 'warehouse'), validate(productSchema), ctrl.updateProduct);
router.delete('/products/:id', requireRole('admin', 'warehouse'), ctrl.deleteProduct);

// Inventory routes
router.get('/inventory/low-stock', ctrl.getLowStock);
router.get('/inventory/:productId/transactions', ctrl.getTransactions);
router.post('/inventory/:productId/adjust', requireRole('admin', 'warehouse'), validate(adjustmentSchema), ctrl.adjustStock);

export default router;
