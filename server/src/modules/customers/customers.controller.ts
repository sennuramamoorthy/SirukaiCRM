import { Request, Response } from 'express';
import * as customersService from './customers.service';
import { sendSuccess, sendError } from '../../utils/response';

export function list(req: Request, res: Response): void {
  const { rows, meta } = customersService.listCustomers(req.query as Record<string, string>);
  sendSuccess(res, rows, 'OK', 200, meta);
}

export function getById(req: Request, res: Response): void {
  const customer = customersService.getCustomerById(Number(req.params.id));
  if (!customer) { sendError(res, 'Customer not found', 404); return; }
  sendSuccess(res, customer);
}

export function create(req: Request, res: Response): void {
  const customer = customersService.createCustomer(req.body);
  sendSuccess(res, customer, 'Customer created', 201);
}

export function update(req: Request, res: Response): void {
  const customer = customersService.updateCustomer(Number(req.params.id), req.body);
  if (!customer) { sendError(res, 'Customer not found', 404); return; }
  sendSuccess(res, customer, 'Customer updated');
}

export function remove(req: Request, res: Response): void {
  customersService.deleteCustomer(Number(req.params.id));
  sendSuccess(res, null, 'Customer deleted');
}

export function getOrders(req: Request, res: Response): void {
  const orders = customersService.getCustomerOrders(Number(req.params.id));
  sendSuccess(res, orders);
}

export function getInvoices(req: Request, res: Response): void {
  const invoices = customersService.getCustomerInvoices(Number(req.params.id));
  sendSuccess(res, invoices);
}
