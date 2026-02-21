import { Router } from 'express';
import * as ctrl from './supply-chain.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  supplierSchema, createPoSchema, poStatusSchema, receiveItemSchema,
  shipmentSchema, shipmentStatusSchema, supplierProductSchema
} from './supply-chain.schema';

const router = Router();
router.use(authenticate);

// Suppliers
router.get('/suppliers', ctrl.listSuppliers);
router.get('/suppliers/:id', ctrl.getSupplier);
router.get('/suppliers/:id/products', ctrl.getSupplierProducts);
router.post('/suppliers', requireRole('admin', 'warehouse'), validate(supplierSchema), ctrl.createSupplier);
router.put('/suppliers/:id', requireRole('admin', 'warehouse'), validate(supplierSchema), ctrl.updateSupplier);
router.delete('/suppliers/:id', requireRole('admin', 'warehouse'), ctrl.deleteSupplier);
router.post('/suppliers/:id/products', requireRole('admin', 'warehouse'), validate(supplierProductSchema), ctrl.addSupplierProduct);
router.delete('/suppliers/:id/products/:productId', requireRole('admin', 'warehouse'), ctrl.removeSupplierProduct);

// Purchase Orders
router.get('/purchase-orders', ctrl.listPOs);
router.get('/purchase-orders/:id', ctrl.getPO);
router.post('/purchase-orders', requireRole('admin', 'warehouse'), validate(createPoSchema), ctrl.createPO);
router.patch('/purchase-orders/:id/status', requireRole('admin', 'warehouse'), validate(poStatusSchema), ctrl.updatePoStatus);
router.post('/purchase-orders/:id/receive', requireRole('admin', 'warehouse'), validate(receiveItemSchema), ctrl.receivePO);

// Shipments
router.get('/shipments', ctrl.listShipments);
router.get('/shipments/:id', ctrl.getShipment);
router.post('/shipments', requireRole('admin', 'warehouse'), validate(shipmentSchema), ctrl.createShipment);
router.patch('/shipments/:id/status', requireRole('admin', 'warehouse'), validate(shipmentStatusSchema), ctrl.updateShipmentStatus);

export default router;
