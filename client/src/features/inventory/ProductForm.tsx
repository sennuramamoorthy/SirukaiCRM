import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { inventoryApi } from '@/api/inventory.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { decimalToCents, centsToDecimal } from '@/lib/formatters';

const schema = z.object({
  sku: z.string().min(1, 'SKU required'),
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  category: z.string().optional(),
  unit_price: z.string().min(1),
  cost_price: z.string().min(1),
  unit: z.string().default('unit'),
  reorder_point: z.number().int().min(0).default(0),
  reorder_quantity: z.number().int().min(0).default(0),
  location: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: Record<string, any> | null;
  onSuccess: () => void;
}

export function ProductForm({ open, onOpenChange, initialData, onSuccess }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: {
      sku: (initialData?.sku as string) ?? '',
      name: (initialData?.name as string) ?? '',
      description: (initialData?.description as string) ?? '',
      category: (initialData?.category as string) ?? '',
      unit_price: initialData?.unit_price_cents ? centsToDecimal(initialData.unit_price_cents as number) : '0',
      cost_price: initialData?.cost_price_cents ? centsToDecimal(initialData.cost_price_cents as number) : '0',
      unit: (initialData?.unit as string) ?? 'unit',
      reorder_point: (initialData?.reorder_point as number) ?? 0,
      reorder_quantity: (initialData?.reorder_quantity as number) ?? 0,
      location: (initialData?.location as string) ?? '',
    },
  });

  async function onSubmit(data: FormData) {
    const payload = {
      sku: data.sku,
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      unit_price_cents: decimalToCents(data.unit_price),
      cost_price_cents: decimalToCents(data.cost_price),
      unit: data.unit,
      reorder_point: data.reorder_point,
      reorder_quantity: data.reorder_quantity,
      location: data.location || null,
    };

    try {
      if (initialData?.id) {
        await inventoryApi.updateProduct(initialData.id as number, payload);
        toast({ title: 'Product updated' });
      } else {
        await inventoryApi.createProduct(payload);
        toast({ title: 'Product created' });
      }
      onSuccess();
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { message?: string } } }).response;
      toast({ title: resp?.data?.message || 'Failed to save product', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>SKU *</Label>
              <Input {...register('sku')} />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Input placeholder="unit, kg, box..." {...register('unit')} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Name *</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} {...register('description')} />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Input {...register('category')} />
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input placeholder="Bin A1, Shelf 3..." {...register('location')} />
            </div>
            <div className="space-y-1">
              <Label>Sell Price ($) *</Label>
              <Input type="number" step="0.01" min="0" {...register('unit_price')} />
            </div>
            <div className="space-y-1">
              <Label>Cost Price ($) *</Label>
              <Input type="number" step="0.01" min="0" {...register('cost_price')} />
            </div>
            <div className="space-y-1">
              <Label>Reorder Point</Label>
              <Input type="number" min="0" {...register('reorder_point', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1">
              <Label>Reorder Quantity</Label>
              <Input type="number" min="0" {...register('reorder_quantity', { valueAsNumber: true })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
