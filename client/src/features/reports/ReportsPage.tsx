import React from 'react';
import { reportsApi } from '@/api/reports.api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function ReportsPage() {
  const [salesData, setSalesData] = React.useState<Record<string, unknown>[]>([]);
  const [revenueData, setRevenueData] = React.useState<{ summary: Record<string, unknown>; daily: Record<string, unknown>[] } | null>(null);
  const [topProducts, setTopProducts] = React.useState<Record<string, unknown>[]>([]);
  const [topCustomers, setTopCustomers] = React.useState<Record<string, unknown>[]>([]);
  const [inventoryVal, setInventoryVal] = React.useState<Record<string, unknown>[]>([]);
  const [agingData, setAgingData] = React.useState<{ buckets: Record<string, Record<string, unknown>[]> } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      const [sales, rev, tp, tc, iv, ag] = await Promise.all([
        reportsApi.getSales({ group_by: 'day' }),
        reportsApi.getRevenue(),
        reportsApi.getTopProducts({ limit: '10' }),
        reportsApi.getTopCustomers({ limit: '10' }),
        reportsApi.getInventoryValuation(),
        reportsApi.getInvoiceAging(),
      ]);
      setSalesData(sales || []);
      setRevenueData(rev);
      setTopProducts(tp || []);
      setTopCustomers(tc || []);
      setInventoryVal(iv || []);
      setAgingData(ag);
      setLoading(false);
    }
    load();
  }, []);

  const agingPieData = agingData ? [
    { name: 'Current', value: agingData.buckets.current?.length ?? 0 },
    { name: '1-30 days', value: agingData.buckets['1_30']?.length ?? 0 },
    { name: '31-60 days', value: agingData.buckets['31_60']?.length ?? 0 },
    { name: '61-90 days', value: agingData.buckets['61_90']?.length ?? 0 },
    { name: '90+ days', value: agingData.buckets.over_90?.length ?? 0 },
  ].filter((d) => d.value > 0) : [];

  if (loading) return <div className="flex items-center justify-center h-64">Loading reports...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="Business insights and performance metrics" />

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="aging">Invoice Aging</TabsTrigger>
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Orders by Day (Last 30 Days)</CardTitle></CardHeader>
            <CardContent>
              {salesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="order_count" fill="#3b82f6" name="Orders" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">No sales data for this period.</p>}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Top Products</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground text-xs"><th className="text-left py-1">Product</th><th className="text-right py-1">Revenue</th><th className="text-right py-1">Qty</th></tr></thead>
                  <tbody>
                    {topProducts.slice(0, 8).map((p, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-1 text-xs">{p.name as string}</td>
                        <td className="text-right py-1 text-xs">{formatCurrency(p.total_revenue_cents as number)}</td>
                        <td className="text-right py-1 text-xs">{formatNumber(p.total_quantity_sold as number)}</td>
                      </tr>
                    ))}
                    {topProducts.length === 0 && <tr><td colSpan={3} className="text-center text-muted-foreground py-4">No data.</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Top Customers</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground text-xs"><th className="text-left py-1">Customer</th><th className="text-right py-1">Revenue</th><th className="text-right py-1">Orders</th></tr></thead>
                  <tbody>
                    {topCustomers.slice(0, 8).map((c, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-1 text-xs">{c.name as string}</td>
                        <td className="text-right py-1 text-xs">{formatCurrency(c.total_revenue_cents as number)}</td>
                        <td className="text-right py-1 text-xs">{c.total_orders as number}</td>
                      </tr>
                    ))}
                    {topCustomers.length === 0 && <tr><td colSpan={3} className="text-center text-muted-foreground py-4">No data.</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          {revenueData?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Revenue', value: formatCurrency(revenueData.summary.total_revenue_cents as number) },
                { label: 'Total Orders', value: String(revenueData.summary.total_orders) },
                { label: 'Avg Order Value', value: formatCurrency(revenueData.summary.avg_order_cents as number) },
                { label: 'Unique Customers', value: String(revenueData.summary.unique_customers) },
              ].map((kpi) => (
                <Card key={kpi.label}>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-lg font-bold">{kpi.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Card>
            <CardHeader><CardTitle className="text-sm">Daily Revenue</CardTitle></CardHeader>
            <CardContent>
              {revenueData?.daily && revenueData.daily.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={revenueData.daily}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v: number) => [`$${(v / 100).toFixed(2)}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue_cents" stroke="#3b82f6" fill="url(#grad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">No revenue data.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Inventory Valuation</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2">Product</th>
                    <th className="text-right py-2">On Hand</th>
                    <th className="text-right py-2">Cost/Unit</th>
                    <th className="text-right py-2">Cost Value</th>
                    <th className="text-right py-2">Sell Value</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryVal.map((p, i) => (
                    <tr key={i} className="border-b text-xs">
                      <td className="py-2">{p.name as string} <span className="text-muted-foreground">({p.sku as string})</span></td>
                      <td className="text-right py-2">{p.quantity_on_hand as number}</td>
                      <td className="text-right py-2">{formatCurrency(p.cost_price_cents as number)}</td>
                      <td className="text-right py-2">{formatCurrency(p.cost_value_cents as number)}</td>
                      <td className="text-right py-2 font-medium">{formatCurrency(p.sell_value_cents as number)}</td>
                    </tr>
                  ))}
                  {inventoryVal.length === 0 && <tr><td colSpan={5} className="text-center text-muted-foreground py-4">No inventory data.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice Aging Tab */}
        <TabsContent value="aging" className="space-y-4">
          {agingPieData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Invoice Aging Buckets</CardTitle></CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={agingPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {agingPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {agingPieData.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground">No outstanding invoices.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
