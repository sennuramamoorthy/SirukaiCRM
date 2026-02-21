import { Router } from 'express';
import * as ctrl from './reports.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();
router.use(authenticate, requireRole('admin', 'sales'));

router.get('/dashboard', ctrl.getDashboardKpis);
router.get('/sales', ctrl.getSales);
router.get('/revenue', ctrl.getRevenue);
router.get('/top-products', ctrl.getTopProducts);
router.get('/top-customers', ctrl.getTopCustomers);
router.get('/inventory-valuation', ctrl.getInventoryValuation);
router.get('/order-status', ctrl.getOrderStatusBreakdown);
router.get('/invoice-aging', ctrl.getInvoiceAging);

export default router;
