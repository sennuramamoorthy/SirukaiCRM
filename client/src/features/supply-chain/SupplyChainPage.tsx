import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Package, CheckSquare } from 'lucide-react';
import { supplyChainApi } from '@/api/supply-chain.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';

// Supplier Form
const supplierSchema = z.object({
  name: z.string().min(1, 'Name required'),
  contact_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
});
type SupplierFormData = z.infer<typeof supplierSchema>;

function SupplierForm({ open, onOpenChange, initialData, onSuccess }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  initialData?: Record<string, unknown> | null; onSuccess: () => void;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    values: {
      name: (initialData?.name as string) ?? '',
      contact_name: (initialData?.contact_name as string) ?? '',
      email: (initialData?.email as string) ?? '',
      phone: (initialData?.phone as string) ?? '',
      address: (initialData?.address as string) ?? '',
      payment_terms: (initialData?.payment_terms as string) ?? '',
      notes: (initialData?.notes as string) ?? '',
    },
  });

  async function onSubmit(data: SupplierFormData) {
    try {
      if (initialData?.id) {
        await supplyChainApi.updateSupplier(initialData.id as number, data);
        toast({ title: 'Supplier updated' });
      } else {
        await supplyChainApi.createSupplier(data);
        toast({ title: 'Supplier created' });
      }
      onSuccess();
    } catch {
      toast({ title: 'Failed to save supplier', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initialData?.id ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
          <div className="space-y-1 col-span-2">
            <Label>Name *</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1"><Label>Contact Name</Label><Input {...register('contact_name')} /></div>
          <div className="space-y-1"><Label>Email</Label><Input type="email" {...register('email')} /></div>
          <div className="space-y-1"><Label>Phone</Label><Input {...register('phone')} /></div>
          <div className="space-y-1"><Label>Payment Terms</Label><Input placeholder="Net 30, COD..." {...register('payment_terms')} /></div>
          <div className="space-y-1 col-span-2"><Label>Address</Label><Textarea rows={2} {...register('address')} /></div>
          <div className="space-y-1 col-span-2"><Label>Notes</Label><Textarea rows={2} {...register('notes')} /></div>
          <DialogFooter className="col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SupplyChainPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'admin' || user?.role === 'warehouse';

  // Suppliers state
  const [suppliers, setSuppliers] = React.useState<Record<string, unknown>[]>([]);
  const [supSearch, setSupSearch] = React.useState('');
  const [supFormOpen, setSupFormOpen] = React.useState(false);
  const [editSupplier, setEditSupplier] = React.useState<Record<string, unknown> | null>(null);
  const [deleteSupId, setDeleteSupId] = React.useState<number | null>(null);
  const [deletingSupplier, setDeletingSupplier] = React.useState(false);

  // POs state
  const [pos, setPos] = React.useState<Record<string, unknown>[]>([]);
  const [poStatus, setPoStatus] = React.useState('all');

  // Shipments state
  const [shipments, setShipments] = React.useState<Record<string, unknown>[]>([]);
  const [shipStatus, setShipStatus] = React.useState('all');

  async function loadSuppliers() {
    const res = await supplyChainApi.listSuppliers({ search: supSearch, limit: 100 });
    setSuppliers(res.data || []);
  }

  async function loadPOs() {
    const params: Record<string, string | number> = { limit: 100 };
    if (poStatus !== 'all') params.status = poStatus;
    const res = await supplyChainApi.listPOs(params);
    setPos(res.data || []);
  }

  async function loadShipments() {
    const params: Record<string, string | number> = { limit: 100 };
    if (shipStatus !== 'all') params.status = shipStatus;
    const res = await supplyChainApi.listShipments(params);
    setShipments(res.data || []);
  }

  React.useEffect(() => { loadSuppliers(); }, [supSearch]);
  React.useEffect(() => { loadPOs(); }, [poStatus]);
  React.useEffect(() => { loadShipments(); }, [shipStatus]);

  async function handleDeleteSupplier() {
    if (!deleteSupId) return;
    setDeletingSupplier(true);
    try {
      await supplyChainApi.deleteSupplier(deleteSupId);
      toast({ title: 'Supplier deleted' });
      setDeleteSupId(null);
      loadSuppliers();
    } catch {
      toast({ title: 'Failed to delete supplier', variant: 'destructive' });
    } finally {
      setDeletingSupplier(false);
    }
  }

  const PO_STATUSES = ['all', 'draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled'];
  const SHIP_STATUSES = ['all', 'pending', 'picked', 'packed', 'dispatched', 'in_transit', 'delivered', 'returned'];

  return (
    <div>
      <PageHeader title="Supply Chain" description="Manage suppliers, purchase orders, and shipments" />

      <Tabs defaultValue="suppliers">
        <TabsList className="mb-6">
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="shipments">Shipments</TabsTrigger>
        </TabsList>

        {/* Suppliers */}
        <TabsContent value="suppliers">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search suppliers..." className="pl-9" value={supSearch} onChange={(e) => setSupSearch(e.target.value)} />
            </div>
            {canEdit && (
              <Button onClick={() => { setEditSupplier(null); setSupFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Supplier
              </Button>
            )}
          </div>
          <DataTable
            columns={[
              { key: 'name', header: 'Name', sortable: true },
              { key: 'contact_name', header: 'Contact', accessor: (r) => (r.contact_name as string) || '—' },
              { key: 'email', header: 'Email', accessor: (r) => (r.email as string) || '—' },
              { key: 'phone', header: 'Phone', accessor: (r) => (r.phone as string) || '—' },
              { key: 'payment_terms', header: 'Terms', accessor: (r) => (r.payment_terms as string) || '—' },
              ...(canEdit ? [{
                key: 'actions', header: '',
                accessor: (r: Record<string, unknown>) => (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => { setEditSupplier(r); setSupFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteSupId(r.id as number)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ),
              }] : []),
            ]}
            data={suppliers}
            emptyMessage="No suppliers found."
          />
          <SupplierForm
            open={supFormOpen}
            onOpenChange={setSupFormOpen}
            initialData={editSupplier}
            onSuccess={() => { setSupFormOpen(false); loadSuppliers(); }}
          />
          <ConfirmDialog
            open={!!deleteSupId}
            onOpenChange={() => setDeleteSupId(null)}
            title="Delete Supplier"
            description="Delete this supplier? This cannot be undone."
            onConfirm={handleDeleteSupplier}
            loading={deletingSupplier}
          />
        </TabsContent>

        {/* Purchase Orders */}
        <TabsContent value="purchase-orders">
          <div className="flex items-center justify-between mb-4">
            <Tabs value={poStatus} onValueChange={setPoStatus}>
              <TabsList>
                {PO_STATUSES.map((s) => <TabsTrigger key={s} value={s} className="capitalize text-xs">{s}</TabsTrigger>)}
              </TabsList>
            </Tabs>
            {canEdit && (
              <Button size="sm" onClick={() => navigate('/supply-chain/purchase-orders/new')}>
                <Plus className="h-4 w-4 mr-2" /> Create PO
              </Button>
            )}
          </div>
          <DataTable
            columns={[
              { key: 'po_number', header: 'PO #', sortable: true },
              { key: 'supplier_name', header: 'Supplier', sortable: true },
              { key: 'status', header: 'Status', accessor: (r) => <StatusBadge status={r.status as string} type="po" /> },
              { key: 'item_count', header: 'Items' },
              { key: 'total_cents', header: 'Total', accessor: (r) => formatCurrency(r.total_cents as number) },
              { key: 'expected_date', header: 'Expected', accessor: (r) => formatDate(r.expected_date as number) },
            ]}
            data={pos}
            onRowClick={(r) => navigate(`/supply-chain/purchase-orders/${r.id}`)}
            emptyMessage="No purchase orders found."
          />
        </TabsContent>

        {/* Shipments */}
        <TabsContent value="shipments">
          <div className="mb-4">
            <Tabs value={shipStatus} onValueChange={setShipStatus}>
              <TabsList className="flex-wrap h-auto gap-1">
                {SHIP_STATUSES.map((s) => <TabsTrigger key={s} value={s} className="capitalize text-xs">{s.replace(/_/g, ' ')}</TabsTrigger>)}
              </TabsList>
            </Tabs>
          </div>
          <DataTable
            columns={[
              { key: 'shipment_number', header: 'Shipment #', sortable: true },
              { key: 'order_number', header: 'Order #' },
              { key: 'customer_name', header: 'Customer' },
              { key: 'carrier', header: 'Carrier', accessor: (r) => (r.carrier as string) || '—' },
              { key: 'tracking_number', header: 'Tracking', accessor: (r) => (r.tracking_number as string) || '—' },
              { key: 'status', header: 'Status', accessor: (r) => <StatusBadge status={r.status as string} type="shipment" /> },
              { key: 'estimated_delivery', header: 'Est. Delivery', accessor: (r) => formatDate(r.estimated_delivery as number) },
            ]}
            data={shipments}
            emptyMessage="No shipments found."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
