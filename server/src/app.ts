import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';
import authRouter from './modules/auth/auth.router';
import usersRouter from './modules/users/users.router';
import customersRouter from './modules/customers/customers.router';
import ordersRouter from './modules/orders/orders.router';
import invoicesRouter from './modules/invoices/invoices.router';
import inventoryRouter from './modules/inventory/inventory.router';
import reportsRouter from './modules/reports/reports.router';
import supplyChainRouter from './modules/supply-chain/supply-chain.router';
import { errorHandler } from './middleware/error.middleware';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// API routes
const api = '/api/v1';
app.use(`${api}/auth`, authRouter);
app.use(`${api}/users`, usersRouter);
app.use(`${api}/customers`, customersRouter);
app.use(`${api}/orders`, ordersRouter);
app.use(`${api}/invoices`, invoicesRouter);
app.use(api, inventoryRouter);        // handles /api/v1/products and /api/v1/inventory
app.use(`${api}/reports`, reportsRouter);
app.use(api, supplyChainRouter);      // handles /api/v1/suppliers, /purchase-orders, /shipments

app.use(errorHandler);

export default app;
