import { Request, Response } from 'express';
import * as sc from './supply-chain.service';
import { sendSuccess, sendError } from '../../utils/response';

// Suppliers
export async function listSuppliers(req: Request, res: Response): Promise<void> {
  const { rows, meta } = await sc.listSuppliers(req.query as Record<string, string>);
  sendSuccess(res, rows, 'OK', 200, meta);
}

export async function getSupplier(req: Request, res: Response): Promise<void> {
  const s = await sc.getSupplierById(Number(req.params.id));
  if (!s) { sendError(res, 'Supplier not found', 404); return; }
  sendSuccess(res, s);
}

export async function createSupplier(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await sc.createSupplier(req.body), 'Supplier created', 201);
}

export async function updateSupplier(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await sc.updateSupplier(Number(req.params.id), req.body), 'Supplier updated');
}

export async function deleteSupplier(req: Request, res: Response): Promise<void> {
  await sc.deleteSupplier(Number(req.params.id));
  sendSuccess(res, null, 'Supplier deleted');
}

export async function getSupplierProducts(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await sc.getSupplierProducts(Number(req.params.id)));
}

export async function addSupplierProduct(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await sc.addSupplierProduct(Number(req.params.id), req.body), 'Product linked', 201);
}

export async function removeSupplierProduct(req: Request, res: Response): Promise<void> {
  await sc.removeSupplierProduct(Number(req.params.id), Number(req.params.productId));
  sendSuccess(res, null, 'Product unlinked');
}

// Purchase Orders
export async function listPOs(req: Request, res: Response): Promise<void> {
  const { rows, meta } = await sc.listPurchaseOrders(req.query as Record<string, string>);
  sendSuccess(res, rows, 'OK', 200, meta);
}

export async function getPO(req: Request, res: Response): Promise<void> {
  const po = await sc.getPurchaseOrderById(Number(req.params.id));
  if (!po) { sendError(res, 'Purchase order not found', 404); return; }
  sendSuccess(res, po);
}

export async function createPO(req: Request, res: Response): Promise<void> {
  const po = await sc.createPurchaseOrder(req.body, req.user!.sub);
  sendSuccess(res, po, 'Purchase order created', 201);
}

export async function updatePoStatus(req: Request, res: Response): Promise<void> {
  const po = await sc.updatePoStatus(Number(req.params.id), req.body.status);
  sendSuccess(res, po, 'Status updated');
}

export async function receivePO(req: Request, res: Response): Promise<void> {
  try {
    const po = await sc.receivePurchaseOrder(Number(req.params.id), req.body.items, req.user!.sub);
    sendSuccess(res, po, 'Stock received');
  } catch (err: unknown) {
    if (err instanceof Error) { sendError(res, err.message); return; }
    throw err;
  }
}

// Shipments
export async function listShipments(req: Request, res: Response): Promise<void> {
  const { rows, meta } = await sc.listShipments(req.query as Record<string, string>);
  sendSuccess(res, rows, 'OK', 200, meta);
}

export async function getShipment(req: Request, res: Response): Promise<void> {
  const s = await sc.getShipmentById(Number(req.params.id));
  if (!s) { sendError(res, 'Shipment not found', 404); return; }
  sendSuccess(res, s);
}

export async function createShipment(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await sc.createShipment(req.body), 'Shipment created', 201);
}

export async function updateShipmentStatus(req: Request, res: Response): Promise<void> {
  const s = await sc.updateShipmentStatus(Number(req.params.id), req.body);
  sendSuccess(res, s, 'Shipment updated');
}
