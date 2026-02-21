import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { ordersApi } from '@/api/orders.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

interface OrderItem {
  id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price_cents: number;
  discount_pct: number;
  line_total_cents: number;
}

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  shipping_address: string;
  notes: string;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  ordered_at: number;
  shipped_at: number;
  delivered_at: number;
  cancelled_at: number;
  created_at: number;
  items: OrderItem[];
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canAct = user?.role === 'admin' || user?.role === 'sales';

  const [order, setOrder] = React.useState<Order | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function load() {
    const o = await ordersApi.getById(Number(id));
    setOrder(o);
  }

  React.useEffect(() => { load(); }, [id]);

  async function handleStatusChange(newStatus: string) {
    setLoading(true);
    try {
      await ordersApi.updateStatus(Number(id), newStatus);
      toast({ title: `Order ${newStatus}` });
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateInvoice() {
    try {
      await ordersApi.generateInvoice(Number(id));
      toast({ title: 'Invoice generated' });
      navigate('/invoices');
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { message?: string } } }).response;
      toast({ title: resp?.data?.message || 'Failed to generate invoice', variant: 'destructive' });
    }
  }

  if (!order) return <div className="flex items-center justify-center h-64">Loading...</div>;

  const transitions = STATUS_TRANSITIONS[order.status] || [];

  const STEPS = ['draft', 'confirmed', 'processing', 'shipped', 'delivered'];
  const currentStep = STEPS.indexOf(order.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          <p className="text-muted-foreground">{order.customer_name}</p>
        </div>
        <StatusBadge status={order.status} type="order" />
        {canAct && order.status !== 'cancelled' && !['draft'].includes(order.status) && (
          <Button variant="outline" size="sm" onClick={handleGenerateInvoice}>
            <FileText className="h-4 w-4 mr-2" /> Generate Invoice
          </Button>
        )}
      </div>

      {/* Status Stepper */}
      {order.status !== 'cancelled' && (
        <div className="flex items-center gap-2">
          {STEPS.map((step, i) => (
            <React.Fragment key={step}>
              <div className={`flex items-center gap-2 ${i <= currentStep ? 'text-blue-600' : 'text-muted-foreground'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < currentStep ? 'bg-blue-600 text-white' : i === currentStep ? 'border-2 border-blue-600' : 'border border-muted-foreground'}`}>
                  {i + 1}
                </div>
                <span className="text-xs capitalize hidden sm:block">{step}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < currentStep ? 'bg-blue-600' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Status Actions */}
      {canAct && transitions.length > 0 && (
        <div className="flex gap-2">
          {transitions.map((t) => (
            <Button
              key={t}
              variant={t === 'cancelled' ? 'destructive' : 'default'}
              size="sm"
              onClick={() => handleStatusChange(t)}
              disabled={loading}
              className="capitalize"
            >
              Mark {t}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Order Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Customer:</span> {order.customer_name}</div>
            <div><span className="text-muted-foreground">Email:</span> {order.customer_email || '—'}</div>
            <div><span className="text-muted-foreground">Order Date:</span> {formatDate(order.ordered_at || order.created_at)}</div>
            {order.shipped_at && <div><span className="text-muted-foreground">Shipped:</span> {formatDate(order.shipped_at)}</div>}
            {order.delivered_at && <div><span className="text-muted-foreground">Delivered:</span> {formatDate(order.delivered_at)}</div>}
            {order.shipping_address && (
              <div><span className="text-muted-foreground">Ship To:</span> <span className="whitespace-pre-wrap">{order.shipping_address}</span></div>
            )}
            {order.notes && <div><span className="text-muted-foreground">Notes:</span> {order.notes}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Financials</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(order.subtotal_cents)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatCurrency(order.discount_cents)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(order.tax_cents)}</span></div>
            <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>{formatCurrency(order.total_cents)}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Line Items</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2">Product</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Unit Price</th>
                <th className="text-right py-2">Discount</th>
                <th className="text-right py-2">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">
                    <div>{item.product_name}</div>
                    <div className="text-xs text-muted-foreground">{item.sku}</div>
                  </td>
                  <td className="text-right py-2">{item.quantity}</td>
                  <td className="text-right py-2">{formatCurrency(item.unit_price_cents)}</td>
                  <td className="text-right py-2">{item.discount_pct}%</td>
                  <td className="text-right py-2 font-medium">{formatCurrency(item.line_total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
