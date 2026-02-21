import { Request, Response } from 'express';
import * as inventoryService from './inventory.service';
import { sendSuccess, sendError } from '../../utils/response';

// Products
export function listProducts(req: Request, res: Response): void {
  const { rows, meta } = inventoryService.listProducts(req.query as Record<string, string>);
  sendSuccess(res, rows, 'OK', 200, meta);
}

export function getProduct(req: Request, res: Response): void {
  const product = inventoryService.getProductById(Number(req.params.id));
  if (!product) { sendError(res, 'Product not found', 404); return; }
  sendSuccess(res, product);
}

export function createProduct(req: Request, res: Response): void {
  try {
    const product = inventoryService.createProduct(req.body);
    sendSuccess(res, product, 'Product created', 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      sendError(res, 'SKU already exists', 409); return;
    }
    throw err;
  }
}

export function updateProduct(req: Request, res: Response): void {
  const product = inventoryService.updateProduct(Number(req.params.id), req.body);
  sendSuccess(res, product, 'Product updated');
}

export function deleteProduct(req: Request, res: Response): void {
  inventoryService.deleteProduct(Number(req.params.id));
  sendSuccess(res, null, 'Product deleted');
}

export function getCategories(req: Request, res: Response): void {
  sendSuccess(res, inventoryService.getCategories());
}

// Inventory
export function getLowStock(req: Request, res: Response): void {
  sendSuccess(res, inventoryService.getLowStockProducts());
}

export function adjustStock(req: Request, res: Response): void {
  try {
    const product = inventoryService.adjustStock(
      Number(req.params.productId),
      req.body,
      req.user!.sub
    );
    sendSuccess(res, product, 'Stock adjusted');
  } catch (err: unknown) {
    if (err instanceof Error) { sendError(res, err.message); return; }
    throw err;
  }
}

export function getTransactions(req: Request, res: Response): void {
  const transactions = inventoryService.getStockTransactions(Number(req.params.productId));
  sendSuccess(res, transactions);
}
