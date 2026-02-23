import { Request, Response } from 'express';
import * as inventoryService from './inventory.service';
import { sendSuccess, sendError } from '../../utils/response';

// Products
export async function listProducts(req: Request, res: Response): Promise<void> {
  const { rows, meta } = await inventoryService.listProducts(req.query as Record<string, string>);
  sendSuccess(res, rows, 'OK', 200, meta);
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const product = await inventoryService.getProductById(Number(req.params.id));
  if (!product) { sendError(res, 'Product not found', 404); return; }
  sendSuccess(res, product);
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await inventoryService.createProduct(req.body);
    sendSuccess(res, product, 'Product created', 201);
  } catch (err: unknown) {
    if (err instanceof Error && (err.message.includes('UNIQUE') || err.message.includes('unique'))) {
      sendError(res, 'SKU already exists', 409); return;
    }
    throw err;
  }
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const product = await inventoryService.updateProduct(Number(req.params.id), req.body);
  sendSuccess(res, product, 'Product updated');
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  await inventoryService.deleteProduct(Number(req.params.id));
  sendSuccess(res, null, 'Product deleted');
}

export async function getCategories(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await inventoryService.getCategories());
}

// Inventory
export async function getLowStock(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await inventoryService.getLowStockProducts());
}

export async function adjustStock(req: Request, res: Response): Promise<void> {
  try {
    const product = await inventoryService.adjustStock(
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

export async function getTransactions(req: Request, res: Response): Promise<void> {
  const transactions = await inventoryService.getStockTransactions(Number(req.params.productId));
  sendSuccess(res, transactions);
}
