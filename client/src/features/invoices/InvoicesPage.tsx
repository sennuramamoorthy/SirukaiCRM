import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoicesApi } from '@/api/invoices.api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface Invoice {
  id: number;
  invoice_number: string;
  order_number: string;
  customer_name: string;
  status: string;
  total_cents: number;
  amount_paid_cents: number;
  due_date: number;
  created_at: number;
}

const STATUSES = ['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'];

export function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState('all');

  React.useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (status !== 'all') params.status = status;
    invoicesApi.list(params)
      .then((r) => setInvoices(r.data || []))
      .finally(() => setLoading(false));
  }, [status]);

  const columns = [
    { key: 'invoice_number', header: 'Invoice #', sortable: true },
    { key: 'order_number', header: 'Order #' },
    { key: 'customer_name', header: 'Customer', sortable: true },
    { key: 'status', header: 'Status', accessor: (r: Invoice) => <StatusBadge status={r.status} type="invoice" /> },
    { key: 'total_cents', header: 'Total', accessor: (r: Invoice) => formatCurrency(r.total_cents) },
    { key: 'amount_paid_cents', header: 'Paid', accessor: (r: Invoice) => formatCurrency(r.amount_paid_cents) },
    { key: 'due_date', header: 'Due Date', accessor: (r: Invoice) => formatDate(r.due_date), sortable: true },
  ];

  return (
    <div>
      <PageHeader title="Invoices" description="Manage and track invoices" />

      <Tabs value={status} onValueChange={setStatus}>
        <TabsList className="mb-4">
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>
          ))}
        </TabsList>
        {STATUSES.map((s) => (
          <TabsContent key={s} value={s}>
            <DataTable
              columns={columns as never}
              data={invoices}
              loading={loading}
              onRowClick={(r) => navigate(`/invoices/${r.id}`)}
              emptyMessage="No invoices found."
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
