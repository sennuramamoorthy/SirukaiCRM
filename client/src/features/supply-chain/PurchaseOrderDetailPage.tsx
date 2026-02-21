import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supplyChainApi } from '@/api/supply-chain.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';

interface PoItem {
  id: number;
  product_name: string;
  sku: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost_cents: number;
  line_total_cents: number;
}

interface PO {
  id: number;
  po_number: string;
  supplier_name: string;
  supplier_email: string;
  status: string;
  expected_date: number;
  received_at: number;
  notes: string;
  total_cents: number;
  created_at: number;
  items: PoItem[];
}

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canAct = user?.role === 'admin' || user?.role === 'warehouse';

  const [po, setPo] = React.useState<PO | null>(null);
  const [receiveQtys, setReceiveQtys] = React.useState<Record<number, number>>({});
  const [receiving, setReceiving] = React.useState(false);

  async function load() {
    const data = await supplyChainApi.getPO(Number(id));
    setPo(data);
    const qtys: Record<number, number> = {};
    data.items?.forEach((item: PoItem) => {
      qtys[item.id] = item.quantity_ordered - item.quantity_received;
    });
    setReceiveQtys(qtys);
  }

  React.useEffect(() => { load(); }, [id]);

  async function handleReceive() {
    setReceiving(true);
    try {
      const items = Object.entries(receiveQtys)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, qty]) => ({ id: Number(itemId), quantity_received: qty }));

      if (items.length === 0) {
        toast({ title: 'No quantities to receive', variant: 'destructive' });
        return;
      }

      await supplyChainApi.receivePO(Number(id), items);
      toast({ title: 'Stock received successfully' });
      load();
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { message?: string } } }).response;
      toast({ title: resp?.data?.message || 'Failed to receive stock', variant: 'destructive' });
    } finally {
      setReceiving(false);
    }
  }

  async function handleStatusChange(status: string) {
    try {
      await supplyChainApi.updatePoStatus(Number(id), status);
      toast({ title: `PO ${status}` });
      load();
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  }

  if (!po) return <div className="flex items-center justify-center h-64">Loading...</div>;

  const canReceive = canAct && ['confirmed', 'partial'].includes(po.status);
  const canSend = canAct && po.status === 'draft';
  const canConfirm = canAct && po.status === 'sent';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/supply-chain')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{po.po_number}</h1>
          <p className="text-muted-foreground">{po.supplier_name}</p>
        </div>
        <StatusBadge status={po.status} type="po" />
      </div>

      {/* Actions */}
      {canAct && (
        <div className="flex gap-2">
          {canSend && <Button size="sm" onClick={() => handleStatusChange('sent')}>Mark as Sent</Button>}
          {canConfirm && <Button size="sm" onClick={() => handleStatusChange('confirmed')}>Mark as Confirmed</Button>}
          {!['received', 'cancelled'].includes(po.status) && (
            <Button variant="destructive" size="sm" onClick={() => handleStatusChange('cancelled')}>Cancel PO</Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">PO Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Supplier:</span> {po.supplier_name}</div>
            <div><span className="text-muted-foreground">Email:</span> {po.supplier_email || '—'}</div>
            <div><span className="text-muted-foreground">Expected:</span> {formatDate(po.expected_date)}</div>
            {po.received_at && <div><span className="text-muted-foreground">Received:</span> {formatDate(po.received_at)}</div>}
            {po.notes && <div><span className="text-muted-foreground">Notes:</span> {po.notes}</div>}
            <div><span className="text-muted-foreground">Created:</span> {formatDate(po.created_at)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Totals</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(po.total_cents)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Items {canReceive && '— Enter received quantities'}</CardTitle>
          {canReceive && (
            <Button size="sm" onClick={handleReceive} disabled={receiving}>
              {receiving ? 'Receiving...' : 'Receive Stock'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left py-2">Product</th>
                <th className="text-right py-2">Ordered</th>
                <th className="text-right py-2">Received</th>
                {canReceive && <th className="text-right py-2">Receive Now</th>}
                <th className="text-right py-2">Unit Cost</th>
                <th className="text-right py-2">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {po.items?.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">
                    <div>{item.product_name}</div>
                    <div className="text-xs text-muted-foreground">{item.sku}</div>
                  </td>
                  <td className="text-right py-2">{item.quantity_ordered}</td>
                  <td className="text-right py-2">
                    <span className={item.quantity_received >= item.quantity_ordered ? 'text-green-600' : ''}>
                      {item.quantity_received}
                    </span>
                  </td>
                  {canReceive && (
                    <td className="text-right py-2">
                      <Input
                        type="number"
                        min="0"
                        max={item.quantity_ordered - item.quantity_received}
                        className="h-7 w-20 text-xs text-right"
                        value={receiveQtys[item.id] ?? 0}
                        onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                      />
                    </td>
                  )}
                  <td className="text-right py-2">{formatCurrency(item.unit_cost_cents)}</td>
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
