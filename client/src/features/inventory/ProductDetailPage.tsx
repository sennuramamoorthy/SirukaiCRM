import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, SlidersHorizontal } from 'lucide-react';
import { inventoryApi } from '@/api/inventory.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/shared/DataTable';
import { ProductForm } from './ProductForm';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'admin' || user?.role === 'warehouse';

  const [product, setProduct] = React.useState<Record<string, unknown> | null>(null);
  const [transactions, setTransactions] = React.useState<Record<string, unknown>[]>([]);
  const [editOpen, setEditOpen] = React.useState(false);
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [adjType, setAdjType] = React.useState('adjustment');
  const [adjQty, setAdjQty] = React.useState('');
  const [adjNotes, setAdjNotes] = React.useState('');
  const [adjusting, setAdjusting] = React.useState(false);

  async function load() {
    const [p, t] = await Promise.all([
      inventoryApi.getProduct(Number(id)),
      inventoryApi.getTransactions(Number(id)),
    ]);
    setProduct(p);
    setTransactions(t || []);
  }

  React.useEffect(() => { load(); }, [id]);

  async function handleAdjust() {
    setAdjusting(true);
    try {
      await inventoryApi.adjustStock(Number(id), {
        transaction_type: adjType,
        quantity_change: Number(adjQty),
        notes: adjNotes,
      });
      toast({ title: 'Stock adjusted' });
      setAdjustOpen(false);
      setAdjQty('');
      setAdjNotes('');
      load();
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { message?: string } } }).response;
      toast({ title: resp?.data?.message || 'Adjustment failed', variant: 'destructive' });
    } finally {
      setAdjusting(false);
    }
  }

  if (!product) return <div className="flex items-center justify-center h-64">Loading...</div>;

  const margin = product.unit_price_cents && product.cost_price_cents
    ? Math.round(((Number(product.unit_price_cents) - Number(product.cost_price_cents)) / Number(product.unit_price_cents)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{product.name as string}</h1>
          <p className="text-muted-foreground text-sm">SKU: {product.sku as string}</p>
        </div>
        {canEdit && (
          <>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button size="sm" onClick={() => setAdjustOpen(true)}>
              <SlidersHorizontal className="h-4 w-4 mr-2" /> Adjust Stock
            </Button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Product Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Category:</span> {product.category as string || '—'}</div>
            <div><span className="text-muted-foreground">Unit:</span> {product.unit as string}</div>
            <div><span className="text-muted-foreground">Location:</span> {product.location as string || '—'}</div>
            {product.description && <div><span className="text-muted-foreground">Description:</span> {product.description as string}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Stock Levels</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">On Hand</span><span className="font-bold">{product.quantity_on_hand as number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Reserved</span><span>{product.quantity_reserved as number}</span></div>
            <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Available</span><span className={Number(product.quantity_available) <= 0 ? 'text-destructive font-bold' : 'font-bold'}>{product.quantity_available as number}</span></div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2"><span>Reorder Point</span><span>{product.reorder_point as number}</span></div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Reorder Qty</span><span>{product.reorder_quantity as number}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Sell Price</span><span className="font-bold">{formatCurrency(product.unit_price_cents as number)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cost Price</span><span>{formatCurrency(product.cost_price_cents as number)}</span></div>
            <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Margin</span><span className="text-green-600 font-medium">{margin}%</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Stock Movement History</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'transaction_type', header: 'Type', accessor: (r) => <span className="capitalize">{(r.transaction_type as string).replace(/_/g, ' ')}</span> },
              { key: 'quantity_change', header: 'Qty Change', accessor: (r) => (
                <span className={Number(r.quantity_change) >= 0 ? 'text-green-600' : 'text-destructive'}>
                  {Number(r.quantity_change) >= 0 ? '+' : ''}{r.quantity_change as number}
                </span>
              )},
              { key: 'notes', header: 'Notes', accessor: (r) => (r.notes as string) || '—' },
              { key: 'created_by_name', header: 'By', accessor: (r) => (r.created_by_name as string) || '—' },
              { key: 'created_at', header: 'Date', accessor: (r) => formatDate(r.created_at as number) },
            ]}
            data={transactions}
            emptyMessage="No stock movements yet."
          />
        </CardContent>
      </Card>

      <ProductForm
        open={editOpen}
        onOpenChange={setEditOpen}
        initialData={product}
        onSuccess={() => { setEditOpen(false); load(); }}
      />

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Adjust Stock</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={adjType} onValueChange={setAdjType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="adjustment">Manual Adjustment</SelectItem>
                  <SelectItem value="return">Customer Return</SelectItem>
                  <SelectItem value="write_off">Write Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Quantity Change (positive=add, negative=remove)</Label>
              <Input
                type="number"
                placeholder="e.g. 10 or -5"
                value={adjQty}
                onChange={(e) => setAdjQty(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Notes / Reason</Label>
              <Textarea rows={2} value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button onClick={handleAdjust} disabled={adjusting || !adjQty}>
              {adjusting ? 'Saving...' : 'Save Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
