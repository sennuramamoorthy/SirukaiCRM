import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { invoicesApi } from '@/api/invoices.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate, centsToDecimal, decimalToCents } from '@/lib/formatters';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface InvoiceItem {
  id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price_cents: number;
  discount_pct: number;
  line_total_cents: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  order_number: string;
  order_id: number;
  customer_name: string;
  customer_email: string;
  billing_address: string;
  customer_company: string;
  status: string;
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  due_date: number;
  sent_at: number;
  paid_at: number;
  notes: string;
  created_at: number;
  items: InvoiceItem[];
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = React.useState<Invoice | null>(null);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [payStatus, setPayStatus] = React.useState('');
  const [payAmount, setPayAmount] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  async function load() {
    const inv = await invoicesApi.getById(Number(id));
    setInvoice(inv);
    setPayStatus(inv.status);
    setPayAmount(centsToDecimal(inv.amount_paid_cents));
  }

  React.useEffect(() => { load(); }, [id]);

  async function handleUpdateStatus() {
    setSaving(true);
    try {
      await invoicesApi.updateStatus(Number(id), {
        status: payStatus,
        amount_paid_cents: decimalToCents(payAmount),
      });
      toast({ title: 'Invoice updated' });
      setPaymentOpen(false);
      load();
    } catch {
      toast({ title: 'Failed to update invoice', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (!invoice) return <div className="flex items-center justify-center h-64">Loading...</div>;

  const paidPct = invoice.total_cents > 0 ? Math.min(100, Math.round((invoice.amount_paid_cents / invoice.total_cents) * 100)) : 0;
  const outstanding = invoice.total_cents - invoice.amount_paid_cents;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{invoice.invoice_number}</h1>
          <p className="text-muted-foreground">
            Order: <Link to={`/orders/${invoice.order_id}`} className="text-blue-600 hover:underline">{invoice.order_number}</Link>
          </p>
        </div>
        <StatusBadge status={invoice.status} type="invoice" />
        {!['paid', 'cancelled'].includes(invoice.status) && (
          <Button variant="outline" size="sm" onClick={() => setPaymentOpen(true)}>
            Update Payment
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Bill To</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{invoice.customer_name}</p>
            {invoice.customer_company && <p>{invoice.customer_company}</p>}
            {invoice.customer_email && <p className="text-muted-foreground">{invoice.customer_email}</p>}
            {invoice.billing_address && <p className="whitespace-pre-wrap text-muted-foreground">{invoice.billing_address}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Payment Status</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold">{formatCurrency(invoice.total_cents)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-green-600">{formatCurrency(invoice.amount_paid_cents)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className={outstanding > 0 ? 'text-destructive font-medium' : 'text-green-600'}>{formatCurrency(outstanding)}</span></div>
            <Progress value={paidPct} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{paidPct}% paid</span>
              <span>Due: {formatDate(invoice.due_date)}</span>
            </div>
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
              {invoice.items?.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.product_name} <span className="text-xs text-muted-foreground">({item.sku})</span></td>
                  <td className="text-right py-2">{item.quantity}</td>
                  <td className="text-right py-2">{formatCurrency(item.unit_price_cents)}</td>
                  <td className="text-right py-2">{item.discount_pct}%</td>
                  <td className="text-right py-2 font-medium">{formatCurrency(item.line_total_cents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={4} className="text-right py-1 text-muted-foreground text-xs">Subtotal</td><td className="text-right py-1">{formatCurrency(invoice.subtotal_cents)}</td></tr>
              <tr><td colSpan={4} className="text-right py-1 text-muted-foreground text-xs">Discount</td><td className="text-right py-1">-{formatCurrency(invoice.discount_cents)}</td></tr>
              <tr><td colSpan={4} className="text-right py-1 text-muted-foreground text-xs">Tax</td><td className="text-right py-1">{formatCurrency(invoice.tax_cents)}</td></tr>
              <tr className="font-bold border-t"><td colSpan={4} className="text-right py-2">Total</td><td className="text-right py-2">{formatCurrency(invoice.total_cents)}</td></tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={payStatus} onValueChange={setPayStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['draft', 'sent', 'paid', 'overdue', 'cancelled'].map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Amount Paid ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
