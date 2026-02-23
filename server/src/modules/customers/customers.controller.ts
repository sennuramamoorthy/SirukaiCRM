import { Request, Response } from 'express';
import * as customersService from './customers.service';
import { sendSuccess, sendError } from '../../utils/response';

export async function list(req: Request, res: Response): Promise<void> {
  const { rows, meta } = await customersService.listCustomers(req.query as Record<string, string>);
  sendSuccess(res, rows, 'OK', 200, meta);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const customer = await customersService.getCustomerById(Number(req.params.id));
  if (!customer) { sendError(res, 'Customer not found', 404); return; }
  sendSuccess(res, customer);
}

export async function create(req: Request, res: Response): Promise<void> {
  const customer = await customersService.createCustomer(req.body);
  sendSuccess(res, customer, 'Customer created', 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const customer = await customersService.updateCustomer(Number(req.params.id), req.body);
  if (!customer) { sendError(res, 'Customer not found', 404); return; }
  sendSuccess(res, customer, 'Customer updated');
}

export async function remove(req: Request, res: Response): Promise<void> {
  await customersService.deleteCustomer(Number(req.params.id));
  sendSuccess(res, null, 'Customer deleted');
}

export async function getOrders(req: Request, res: Response): Promise<void> {
  const orders = await customersService.getCustomerOrders(Number(req.params.id));
  sendSuccess(res, orders);
}

export async function getInvoices(req: Request, res: Response): Promise<void> {
  const invoices = await customersService.getCustomerInvoices(Number(req.params.id));
  sendSuccess(res, invoices);
}
