import { Request, Response } from 'express';
import * as ordersService from './orders.service';
import * as invoicesService from '../invoices/invoices.service';
import { sendSuccess, sendError } from '../../utils/response';

export async function list(req: Request, res: Response): Promise<void> {
  const { rows, meta } = await ordersService.listOrders(req.query as Record<string, string>);
  sendSuccess(res, rows, 'OK', 200, meta);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const order = await ordersService.getOrderById(Number(req.params.id));
  if (!order) { sendError(res, 'Order not found', 404); return; }
  sendSuccess(res, order);
}

export async function create(req: Request, res: Response): Promise<void> {
  const order = await ordersService.createOrder(req.body, req.user!.sub);
  sendSuccess(res, order, 'Order created', 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const order = await ordersService.updateOrder(Number(req.params.id), req.body);
    sendSuccess(res, order, 'Order updated');
  } catch (err: unknown) {
    if (err instanceof Error) { sendError(res, err.message); return; }
    throw err;
  }
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  try {
    const order = await ordersService.updateOrderStatus(Number(req.params.id), req.body.status, req.user!.sub);
    sendSuccess(res, order, 'Order status updated');
  } catch (err: unknown) {
    if (err instanceof Error) { sendError(res, err.message); return; }
    throw err;
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await ordersService.deleteOrder(Number(req.params.id));
    sendSuccess(res, null, 'Order deleted');
  } catch (err: unknown) {
    if (err instanceof Error) { sendError(res, err.message); return; }
    throw err;
  }
}

export async function generateInvoice(req: Request, res: Response): Promise<void> {
  try {
    const invoice = await invoicesService.generateFromOrder(Number(req.params.id));
    sendSuccess(res, invoice, 'Invoice generated', 201);
  } catch (err: unknown) {
    if (err instanceof Error) { sendError(res, err.message); return; }
    throw err;
  }
}
