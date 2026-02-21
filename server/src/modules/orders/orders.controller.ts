import { Request, Response } from 'express';
import * as ordersService from './orders.service';
import * as invoicesService from '../invoices/invoices.service';
import { sendSuccess, sendError } from '../../utils/response';

export function list(req: Request, res: Response): void {
  const { rows, meta } = ordersService.listOrders(req.query as Record<string, string>);
  sendSuccess(res, rows, 'OK', 200, meta);
}

export function getById(req: Request, res: Response): void {
  const order = ordersService.getOrderById(Number(req.params.id));
  if (!order) { sendError(res, 'Order not found', 404); return; }
  sendSuccess(res, order);
}

export function create(req: Request, res: Response): void {
  const order = ordersService.createOrder(req.body, req.user!.sub);
  sendSuccess(res, order, 'Order created', 201);
}

export function update(req: Request, res: Response): void {
  try {
    const order = ordersService.updateOrder(Number(req.params.id), req.body);
    sendSuccess(res, order, 'Order updated');
  } catch (err: unknown) {
    if (err instanceof Error) { sendError(res, err.message); return; }
    throw err;
  }
}

export function updateStatus(req: Request, res: Response): void {
  try {
    const order = ordersService.updateOrderStatus(Number(req.params.id), req.body.status, req.user!.sub);
    sendSuccess(res, order, 'Order status updated');
  } catch (err: unknown) {
    if (err instanceof Error) { sendError(res, err.message); return; }
    throw err;
  }
}

export function remove(req: Request, res: Response): void {
  try {
    ordersService.deleteOrder(Number(req.params.id));
    sendSuccess(res, null, 'Order deleted');
  } catch (err: unknown) {
    if (err instanceof Error) { sendError(res, err.message); return; }
    throw err;
  }
}

export function generateInvoice(req: Request, res: Response): void {
  try {
    const invoice = invoicesService.generateFromOrder(Number(req.params.id));
    sendSuccess(res, invoice, 'Invoice generated', 201);
  } catch (err: unknown) {
    if (err instanceof Error) { sendError(res, err.message); return; }
    throw err;
  }
}
