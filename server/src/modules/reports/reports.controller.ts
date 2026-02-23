import { Request, Response } from 'express';
import * as reportsService from './reports.service';
import { sendSuccess } from '../../utils/response';

export async function getSales(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await reportsService.getSalesReport(req.query as Record<string, string>));
}

export async function getRevenue(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await reportsService.getRevenueReport(req.query as Record<string, string>));
}

export async function getTopProducts(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await reportsService.getTopProducts(req.query as Record<string, string>));
}

export async function getTopCustomers(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await reportsService.getTopCustomers(req.query as Record<string, string>));
}

export async function getInventoryValuation(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await reportsService.getInventoryValuation());
}

export async function getOrderStatusBreakdown(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await reportsService.getOrderStatusBreakdown());
}

export async function getInvoiceAging(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await reportsService.getInvoiceAging());
}

export async function getDashboardKpis(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await reportsService.getDashboardKpis());
}
