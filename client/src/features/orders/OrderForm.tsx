import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { ordersApi } from '@/api/orders.api';
import { customersApi } from '@/api/customers.api';
import { inventoryApi } from '@/api/inventory.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, decimalToCents, centsToDecimal } from '@/lib/formatters';

const itemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unit_price_cents: z.number().int().min(0),
  discount_pct: z.number().min(0).max(100).default(0),
  _product_name: z.string().optional(),
});

const schema = z.object({
  customer_id: z.number().int().positive({ message: 'Customer required' }),
  shipping_address: z.string().optional(),
  notes: z.string().optional(),
  discount_cents: z.number().int().min(0).default(0),
  tax_cents: z.number().int().min(0).default(0),
  items: z.array(itemSchema).min(1, 'At least one item required'),
});

type FormData = z.infer<typeof schema>;

interface Customer { id: number; name: string; shipping_address?: string }
interface Product { id: number; name: string; sku: string; unit_price_cents: number }

export function OrderForm() {
  const navigate = useNavigate();
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { items: [], discount_cents: 0, tax_cents: 0 },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  React.useEffect(() => {
    customersApi.list({ limit: 500 }).then((r) => setCustomers(r.data || []));
    inventoryApi.listProducts({ limit: 500 }).then((r) => setProducts(r.data || []));
  }, []);

  const watchItems = watch('items');
  const watchDiscount = watch('discount_cents') || 0;
  const watchTax = watch('tax_cents') || 0;

  const subtotal = watchItems.reduce((s, item) => {
    return s + Math.round((item.unit_price_cents || 0) * (item.quantity || 0) * (1 - (item.discount_pct || 0) / 100));
  }, 0);
  const total = subtotal - watchDiscount + watchTax;

  function handleProductChange(index: number, productId: string) {
    const product = products.find((p) => p.id === Number(productId));
    if (product) {
      setValue(`items.${index}.product_id`, product.id);
      setValue(`items.${index}.unit_price_cents`, product.unit_price_cents);
      setValue(`items.${index}._product_name`, product.name);
    }
  }

  async function onSubmit(data: FormData) {
    try {
      const order = await ordersApi.create({
        ...data,
        items: data.items.map(({ _product_name, ...item }) => item),
      });
      toast({ title: 'Order created successfully' });
      navigate(`/orders/${(order as { id: number }).id}`);
    } catch {
      toast({ title: 'Failed to create order', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">New Order</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Order Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <Label>Customer *</Label>
              <Select onValueChange={(v) => {
                setValue('customer_id', Number(v));
                const c = customers.find((c) => c.id === Number(v));
                if (c?.shipping_address) setValue('shipping_address', c.shipping_address);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customer_id && <p className="text-xs text-destructive">{errors.customer_id.message}</p>}
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Shipping Address</Label>
              <Textarea rows={2} {...register('shipping_address')} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} {...register('notes')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Line Items</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ product_id: 0, quantity: 1, unit_price_cents: 0, discount_pct: 0 })}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {errors.items && <p className="text-xs text-destructive mb-2">{errors.items.message}</p>}
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-end border-b pb-3">
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">Product</Label>
                    <Select onValueChange={(v) => handleProductChange(index, v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.sku})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      className="h-8 text-xs"
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Unit Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-8 text-xs"
                      value={centsToDecimal(watchItems[index]?.unit_price_cents || 0)}
                      onChange={(e) => setValue(`items.${index}.unit_price_cents`, decimalToCents(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Discount %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      className="h-8 text-xs"
                      {...register(`items.${index}.discount_pct`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="col-span-1 text-xs text-right font-medium">
                    {formatCurrency(Math.round((watchItems[index]?.unit_price_cents || 0) * (watchItems[index]?.quantity || 0) * (1 - (watchItems[index]?.discount_pct || 0) / 100)))}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(index)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {fields.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">Click "Add Item" to add products.</p>
              )}
            </div>

            {/* Totals */}
            <div className="mt-4 space-y-2 text-sm max-w-xs ml-auto">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Discount ($)</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-7 w-24 text-xs text-right"
                  value={centsToDecimal(watchDiscount)}
                  onChange={(e) => setValue('discount_cents', decimalToCents(e.target.value))}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tax ($)</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-7 w-24 text-xs text-right"
                  value={centsToDecimal(watchTax)}
                  onChange={(e) => setValue('tax_cents', decimalToCents(e.target.value))}
                />
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/orders')}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Order'}
          </Button>
        </div>
      </form>
    </div>
  );
}
