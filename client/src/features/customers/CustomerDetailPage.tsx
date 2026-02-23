import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import { customersApi } from '@/api/customers.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CustomerForm } from './CustomerForm';
import { formatCurrency, formatDate } from '@/lib/formatters';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customer, setCustomer] = React.useState<Record<string, any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orders, setOrders] = React.useState<Record<string, any>[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [invoices, setInvoices] = React.useState<Record<string, any>[]>([]);
  const [editOpen, setEditOpen] = React.useState(false);

  async function load() {
    const [c, o, i] = await Promise.all([
      customersApi.getById(Number(id)),
      customersApi.getOrders(Number(id)),
      customersApi.getInvoices(Number(id)),
    ]);
    setCustomer(c);
    setOrders(o || []);
    setInvoices(i || []);
  }

  React.useEffect(() => { load(); }, [id]);

  if (!customer) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{customer.name as string}</h1>
          {customer.company && <p className="text-muted-foreground">{customer.company as string}</p>}
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Edit className="h-4 w-4 mr-2" /> Edit
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Email:</span> {customer.email as string || '—'}</div>
            <div><span className="text-muted-foreground">Phone:</span> {customer.phone as string || '—'}</div>
            <div><span className="text-muted-foreground">Company:</span> {customer.company as string || '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Addresses</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground font-medium">Billing:</span>
              <p className="whitespace-pre-wrap">{customer.billing_address as string || '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Shipping:</span>
              <p className="whitespace-pre-wrap">{customer.shipping_address as string || '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          <DataTable
            columns={[
              { key: 'order_number', header: 'Order #', sortable: true },
              { key: 'status', header: 'Status', accessor: (r) => <StatusBadge status={r.status as string} type="order" /> },
              { key: 'total_cents', header: 'Total', accessor: (r) => formatCurrency(r.total_cents as number) },
              { key: 'created_at', header: 'Date', accessor: (r) => formatDate(r.created_at as number) },
            ]}
            data={orders}
            onRowClick={(r) => navigate(`/orders/${r.id}`)}
            emptyMessage="No orders found."
          />
        </TabsContent>
        <TabsContent value="invoices">
          <DataTable
            columns={[
              { key: 'invoice_number', header: 'Invoice #', sortable: true },
              { key: 'status', header: 'Status', accessor: (r) => <StatusBadge status={r.status as string} type="invoice" /> },
              { key: 'total_cents', header: 'Total', accessor: (r) => formatCurrency(r.total_cents as number) },
              { key: 'created_at', header: 'Date', accessor: (r) => formatDate(r.created_at as number) },
            ]}
            data={invoices}
            onRowClick={(r) => navigate(`/invoices/${r.id}`)}
            emptyMessage="No invoices found."
          />
        </TabsContent>
      </Tabs>

      <CustomerForm
        open={editOpen}
        onOpenChange={setEditOpen}
        initialData={customer as never}
        onSuccess={() => { setEditOpen(false); load(); }}
      />
    </div>
  );
}
