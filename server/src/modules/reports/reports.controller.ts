import { Request, Response } from 'express';
import * as reportsService from './reports.service';
import { sendSuccess } from '../../utils/response';

export function getSales(req: Request, res: Response): void {
  sendSuccess(res, reportsService.getSalesReport(req.query as Record<string, string>));
}

export function getRevenue(req: Request, res: Response): void {
  sendSuccess(res, reportsService.getRevenueReport(req.query as Record<string, string>));
}

export function getTopProducts(req: Request, res: Response): void {
  sendSuccess(res, reportsService.getTopProducts(req.query as Record<string, string>));
}

export function getTopCustomers(req: Request, res: Response): void {
  sendSuccess(res, reportsService.getTopCustomers(req.query as Record<string, string>));
}

export function getInventoryValuation(req: Request, res: Response): void {
  sendSuccess(res, reportsService.getInventoryValuation());
}

export function getOrderStatusBreakdown(req: Request, res: Response): void {
  sendSuccess(res, reportsService.getOrderStatusBreakdown());
}

export function getInvoiceAging(req: Request, res: Response): void {
  sendSuccess(res, reportsService.getInvoiceAging());
}

export function getDashboardKpis(req: Request, res: Response): void {
  sendSuccess(res, reportsService.getDashboardKpis());
}
