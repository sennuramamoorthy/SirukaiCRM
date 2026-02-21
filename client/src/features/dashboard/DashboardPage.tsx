import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, DollarSign, FileText, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { reportsApi } from '@/api/reports.api';
import { ordersApi } from '@/api/orders.api';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface KpiData {
  revenue_30d_cents: number;
  orders_30d: number;
  open_invoices: number;
  open_invoices_outstanding_cents: number;
  low_stock_products: number;
}

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  status: string;
  total_cents: number;
  created_at: number;
}

export function DashboardPage() {
  const [kpis, setKpis] = React.useState<KpiData | null>(null);
  const [recentOrders, setRecentOrders] = React.useState<Order[]>([]);
  const [revenueData, setRevenueData] = React.useState<{ date: string; revenue: number }[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const [kpiData, ordersData, revenueRaw] = await Promise.all([
          reportsApi.getDashboardKpis(),
          ordersApi.list({ limit: 8 }),
          reportsApi.getRevenue(),
        ]);
        setKpis(kpiData);
        setRecentOrders(ordersData.data || []);
        setRevenueData(
          (revenueRaw.daily || []).map((d: { date: string; revenue_cents: number }) => ({
            date: d.date,
            revenue: d.revenue_cents / 100,
          }))
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Revenue (30d)',
      value: formatCurrency(kpis?.revenue_30d_cents ?? 0),
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Orders (30d)',
      value: String(kpis?.orders_30d ?? 0),
      icon: ShoppingCart,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Open Invoices',
      value: `${kpis?.open_invoices ?? 0} (${formatCurrency(kpis?.open_invoices_outstanding_cents ?? 0)})`,
      icon: FileText,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      title: 'Low Stock Items',
      value: String(kpis?.low_stock_products ?? 0),
      icon: AlertTriangle,
      color: kpis?.low_stock_products ? 'text-red-600' : 'text-gray-600',
      bg: kpis?.low_stock_products ? 'bg-red-50' : 'bg-gray-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your business</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-xl font-bold mt-1">{card.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-full ${card.bg} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Chart */}
      {revenueData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revenueGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Orders</CardTitle>
          <Link to="/orders" className="text-sm text-blue-600 hover:underline">View all</Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">{order.customer_name} · {formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} type="order" />
                    <span className="font-medium text-sm">{formatCurrency(order.total_cents)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
