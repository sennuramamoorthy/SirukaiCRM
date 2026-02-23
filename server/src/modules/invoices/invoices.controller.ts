import { Request, Response } from 'express';
import * as invoicesService from './invoices.service';
import { sendSuccess, sendError } from '../../utils/response';

export async function list(req: Request, res: Response): Promise<void> {
  const { rows, meta } = await invoicesService.listInvoices(req.query as Record<string, string>);
  sendSuccess(res, rows, 'OK', 200, meta);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const invoice = await invoicesService.getInvoiceById(Number(req.params.id));
  if (\!invoice) { sendError(res, 'Invoice not found', 404); return; }
  sendSuccess(res, invoice);
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  try {
    const invoice = await invoicesService.updateInvoiceStatus(Number(req.params.id), req.body);
    sendSuccess(res, invoice, 'Invoice updated');
  } catch (err: unknown) {
    if (err instanceof Error) { sendError(res, err.message); return; }
    throw err;
  }
}
