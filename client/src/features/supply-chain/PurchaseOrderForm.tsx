import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { supplyChainApi } from '@/api/supply-chain.api';
import { inventoryApi } from '@/api/inventory.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, centsToDecimal, decimalToCents } from '@/lib/formatters';

const schema = z.object({
  supplier_id: z.number().int().positive({ message: 'Supplier required' }),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.number().int().positive(),
    quantity_ordered: z.number().int().positive(),
    unit_cost_cents: z.number().int().min(0),
  })).min(1, 'At least one item required'),
});

type FormData = z.infer<typeof schema>;

export function PurchaseOrderForm() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = React.useState<Record<string, unknown>[]>([]);
  const [products, setProducts] = React.useState<Record<string, unknown>[]>([]);

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { items: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  React.useEffect(() => {
    supplyChainApi.listSuppliers({ limit: 500 }).then((r) => setSuppliers(r.data || []));
    inventoryApi.listProducts({ limit: 500 }).then((r) => setProducts(r.data || []));
  }, []);

  const watchItems = watch('items');
  const subtotal = watchItems.reduce((s, item) => s + (item.unit_cost_cents || 0) * (item.quantity_ordered || 0), 0);

  async function onSubmit(data: FormData) {
    try {
      const po = await supplyChainApi.createPO(data) as { id: number };
      toast({ title: 'Purchase order created' });
      navigate(`/supply-chain/purchase-orders/${po.id}`);
    } catch {
      toast({ title: 'Failed to create purchase order', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/supply-chain')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">New Purchase Order</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">PO Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <Label>Supplier *</Label>
              <Select onValueChange={(v) => setValue('supplier_id', Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select supplier..." /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id as number} value={String(s.id)}>{s.name as string}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.supplier_id && <p className="text-xs text-destructive">{errors.supplier_id.message}</p>}
            </div>
            <div className="space-y-1 col-span-2"><Label>Notes</Label><Textarea rows={2} {...register('notes')} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Items</CardTitle>
            <Button type="button" variant="outline" size="sm"
              onClick={() => append({ product_id: 0, quantity_ordered: 1, unit_cost_cents: 0 })}>
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {errors.items && <p className="text-xs text-destructive mb-2">{errors.items.message}</p>}
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-end border-b pb-3">
                  <div className="col-span-5 space-y-1">
                    <Label className="text-xs">Product</Label>
                    <Select onValueChange={(v) => {
                      const p = products.find((p) => p.id === Number(v));
                      setValue(`items.${index}.product_id`, Number(v));
                      if (p) setValue(`items.${index}.unit_cost_cents`, p.cost_price_cents as number);
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => <SelectItem key={p.id as number} value={String(p.id)}>{p.name as string} ({p.sku as string})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input type="number" min="1" className="h-8 text-xs" {...register(`items.${index}.quantity_ordered`, { valueAsNumber: true })} />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Unit Cost ($)</Label>
                    <Input type="number" step="0.01" min="0" className="h-8 text-xs"
                      value={centsToDecimal(watchItems[index]?.unit_cost_cents || 0)}
                      onChange={(e) => setValue(`items.${index}.unit_cost_cents`, decimalToCents(e.target.value))} />
                  </div>
                  <div className="col-span-1 text-xs text-right font-medium">
                    {formatCurrency((watchItems[index]?.unit_cost_cents || 0) * (watchItems[index]?.quantity_ordered || 0))}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(index)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {fields.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">Add items to this PO.</p>}
            </div>
            <div className="mt-4 text-right font-bold">Total: {formatCurrency(subtotal)}</div>
          </CardContent>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/supply-chain')}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create PO'}</Button>
        </div>
      </form>
    </div>
  );
}
