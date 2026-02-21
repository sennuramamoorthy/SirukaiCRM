import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { customersApi } from '@/api/customers.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  billing_address: z.string().optional(),
  shipping_address: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<FormData & { id: number }> | null;
  onSuccess: () => void;
}

export function CustomerForm({ open, onOpenChange, initialData, onSuccess }: Props) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: {
      name: initialData?.name ?? '',
      email: initialData?.email ?? '',
      phone: initialData?.phone ?? '',
      company: initialData?.company ?? '',
      billing_address: initialData?.billing_address ?? '',
      shipping_address: initialData?.shipping_address ?? '',
      notes: initialData?.notes ?? '',
    },
  });

  async function onSubmit(data: FormData) {
    try {
      if (initialData?.id) {
        await customersApi.update(initialData.id, data);
        toast({ title: 'Customer updated' });
      } else {
        await customersApi.create(data);
        toast({ title: 'Customer created' });
      }
      reset();
      onSuccess();
    } catch {
      toast({ title: 'Failed to save customer', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <Label>Name *</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" {...register('email')} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input {...register('phone')} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Company</Label>
              <Input {...register('company')} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Billing Address</Label>
              <Textarea rows={2} {...register('billing_address')} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Shipping Address</Label>
              <Textarea rows={2} {...register('shipping_address')} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} {...register('notes')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
