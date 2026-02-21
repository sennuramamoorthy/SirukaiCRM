import { Request, Response } from 'express';
import * as sc from './supply-chain.service';
import { sendSuccess, sendError } from '../../utils/response';

// Suppliers
export function listSuppliers(req: Request, res: Response): void {
  const { rows, meta } = sc.listSuppliers(req.query as Record<string, string>);
  sendSuccess(res, rows, 'OK', 200, meta);
}

export function getSupplier(req: Request, res: Response): void {
  const s = sc.getSupplierById(Number(req.params.id));
  if (!s) { sendError(res, 'Supplier not found', 404); return; }
  sendSuccess(res, s);
}

export function createSupplier(req: Request, res: Response): void {
  sendSuccess(res, sc.createSupplier(req.body), 'Supplier created', 201);
}

export function updateSupplier(req: Request, res: Response): void {
  sendSuccess(res, sc.updateSupplier(Number(req.params.id), req.body), 'Supplier updated');
}

export function deleteSupplier(req: Request, res: Response): void {
  sc.deleteSupplier(Number(req.params.id));
  sendSuccess(res, null, 'Supplier deleted');
}

export function getSupplierProducts(req: Request, res: Response): void {
  sendSuccess(res, sc.getSupplierProducts(Number(req.params.id)));
}

export function addSupplierProduct(req: Request, res: Response): void {
  sendSuccess(res, sc.addSupplierProduct(Number(req.params.id), req.body), 'Product linked', 201);
}

export function removeSupplierProduct(req: Request, res: Response): void {
  sc.removeSupplierProduct(Number(req.params.id), Number(req.params.productId));
  sendSuccess(res, null, 'Product unlinked');
}

// Purchase Orders
export function listPOs(req: Request, res: Response): void {
  const { rows, meta } = sc.listPurchaseOrders(req.query as Record<string, string>);
  sendSuccess(res, rows, 'OK', 200, meta);
}

export function getPO(req: Request, res: Response): void {
  const po = sc.getPurchaseOrderById(Number(req.params.id));
  if (!po) { sendError(res, 'Purchase order not found', 404); return; }
  sendSuccess(res, po);
}

export function createPO(req: Request, res: Response): void {
  const po = sc.createPurchaseOrder(req.body, req.user!.sub);
  sendSuccess(res, po, 'Purchase order created', 201);
}

export function updatePoStatus(req: Request, res: Response): void {
  const po = sc.updatePoStatus(Number(req.params.id), req.body.status);
  sendSuccess(res, po, 'Status updated');
}

export function receivePO(req: Request, res: Response): void {
  try {
    const po = sc.receivePurchaseOrder(Number(req.params.id), req.body.items, req.user!.sub);
    sendSuccess(res, po, 'Stock received');
  } catch (err: unknown) {
    if (err instanceof Error) { sendError(res, err.message); return; }
    throw err;
  }
}

// Shipments
export function listShipments(req: Request, res: Response): void {
  const { rows, meta } = sc.listShipments(req.query as Record<string, string>);
  sendSuccess(res, rows, 'OK', 200, meta);
}

export function getShipment(req: Request, res: Response): void {
  const s = sc.getShipmentById(Number(req.params.id));
  if (!s) { sendError(res, 'Shipment not found', 404); return; }
  sendSuccess(res, s);
}

export function createShipment(req: Request, res: Response): void {
  sendSuccess(res, sc.createShipment(req.body), 'Shipment created', 201);
}

export function updateShipmentStatus(req: Request, res: Response): void {
  const s = sc.updateShipmentStatus(Number(req.params.id), req.body);
  sendSuccess(res, s, 'Shipment updated');
}
