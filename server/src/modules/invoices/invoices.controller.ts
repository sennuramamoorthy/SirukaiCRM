import { Request, Response } from 'express';
import * as invoicesService from './invoices.service';
import { sendSuccess, sendError } from '../../utils/response';

export function list(req: Request, res: Response): void {
  const { rows, meta } = invoicesService.listInvoices(req.query as Record<string, string>);
  sendSuccess(res, rows, 'OK', 200, meta);
}

export function getById(req: Request, res: Response): void {
  const invoice = invoicesService.getInvoiceById(Number(req.params.id));
  if (!invoice) { sendError(res, 'Invoice not found', 404); return; }
  sendSuccess(res, invoice);
}

export function updateStatus(req: Request, res: Response): void {
  try {
    const invoice = invoicesService.updateInvoiceStatus(Number(req.params.id), req.body);
    sendSuccess(res, invoice, 'Invoice updated');
  } catch (err: unknown) {
    if (err instanceof Error) { sendError(res, err.message); return; }
    throw err;
  }
}
