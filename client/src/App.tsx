import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/features/auth/AuthGuard';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { CustomersPage } from '@/features/customers/CustomersPage';
import { CustomerDetailPage } from '@/features/customers/CustomerDetailPage';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { OrderDetailPage } from '@/features/orders/OrderDetailPage';
import { OrderForm } from '@/features/orders/OrderForm';
import { InvoicesPage } from '@/features/invoices/InvoicesPage';
import { InvoiceDetailPage } from '@/features/invoices/InvoiceDetailPage';
import { InventoryPage } from '@/features/inventory/InventoryPage';
import { ProductDetailPage } from '@/features/inventory/ProductDetailPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { SupplyChainPage } from '@/features/supply-chain/SupplyChainPage';
import { PurchaseOrderDetailPage } from '@/features/supply-chain/PurchaseOrderDetailPage';
import { PurchaseOrderForm } from '@/features/supply-chain/PurchaseOrderForm';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { Toaster } from '@/components/ui/toaster';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <AppShell />
            </AuthGuard>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/new" element={<AuthGuard roles={['admin', 'sales']}><OrderForm /></AuthGuard>} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="inventory/:id" element={<ProductDetailPage />} />
          <Route path="reports" element={<AuthGuard roles={['admin', 'sales']}><ReportsPage /></AuthGuard>} />
          <Route path="supply-chain" element={<SupplyChainPage />} />
          <Route path="supply-chain/purchase-orders/new" element={<AuthGuard roles={['admin', 'warehouse']}><PurchaseOrderForm /></AuthGuard>} />
          <Route path="supply-chain/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
          <Route path="settings" element={<AuthGuard roles={['admin']}><SettingsPage /></AuthGuard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
