import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { ordersApi } from '@/api/orders.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  status: string;
  item_count: number;
  total_cents: number;
  created_at: number;
}

const STATUSES = ['all', 'draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export function OrdersPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.role === 'admin' || user?.role === 'sales';

  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('all');

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (status !== 'all') params.status = status;
      if (search) params.search = search;
      const res = await ordersApi.list(params);
      setOrders(res.data || []);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, [status]);

  React.useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [search]);

  const columns = [
    { key: 'order_number', header: 'Order #', sortable: true },
    { key: 'customer_name', header: 'Customer', sortable: true },
    { key: 'status', header: 'Status', accessor: (r: Order) => <StatusBadge status={r.status} type="order" /> },
    { key: 'item_count', header: 'Items', accessor: (r: Order) => `${r.item_count} item${r.item_count !== 1 ? 's' : ''}` },
    { key: 'total_cents', header: 'Total', accessor: (r: Order) => formatCurrency(r.total_cents), sortable: true },
    { key: 'created_at', header: 'Date', accessor: (r: Order) => formatDate(r.created_at), sortable: true },
  ];

  return (
    <div>
      <PageHeader title="Orders" description="Manage customer orders">
        {canCreate && (
          <Button onClick={() => navigate('/orders/new')}>
            <Plus className="h-4 w-4 mr-2" /> New Order
          </Button>
        )}
      </PageHeader>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={status} onValueChange={setStatus}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>
          ))}
        </TabsList>
        {STATUSES.map((s) => (
          <TabsContent key={s} value={s}>
            <DataTable
              columns={columns as never}
              data={orders}
              loading={loading}
              onRowClick={(r) => navigate(`/orders/${r.id}`)}
              emptyMessage="No orders found."
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
