import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { inventoryApi } from '@/api/inventory.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ProductForm } from './ProductForm';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';

interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit_price_cents: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  reorder_point: number;
}

export function InventoryPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'admin' || user?.role === 'warehouse';

  const [products, setProducts] = React.useState<Product[]>([]);
  const [lowStock, setLowStock] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [tab, setTab] = React.useState('all');
  const [formOpen, setFormOpen] = React.useState(false);
  const [editProduct, setEditProduct] = React.useState<Product | null>(null);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  async function load() {
    setLoading(true);
    try {
      const [prod, ls] = await Promise.all([
        inventoryApi.listProducts({ search, limit: 200 }),
        inventoryApi.getLowStock(),
      ]);
      setProducts(prod.data || []);
      setLowStock(ls || []);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  React.useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [search]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await inventoryApi.deleteProduct(deleteId);
      toast({ title: 'Product deleted' });
      setDeleteId(null);
      load();
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }

  function stockStatus(p: Product) {
    if (p.quantity_on_hand === 0) return <span className="text-xs text-red-600 font-medium">Out of Stock</span>;
    if (p.quantity_on_hand <= p.reorder_point) return <span className="text-xs text-yellow-600 font-medium">Low Stock</span>;
    return <span className="text-xs text-green-600 font-medium">In Stock</span>;
  }

  const columns = [
    { key: 'sku', header: 'SKU', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'category', header: 'Category', accessor: (r: Product) => r.category || '—' },
    { key: 'quantity_on_hand', header: 'On Hand', sortable: true },
    { key: 'quantity_reserved', header: 'Reserved' },
    { key: 'quantity_available', header: 'Available', accessor: (r: Product) => (
      <span className={r.quantity_available <= 0 ? 'text-destructive font-medium' : ''}>{r.quantity_available}</span>
    )},
    { key: 'reorder_point', header: 'Reorder Pt.' },
    { key: 'unit_price_cents', header: 'Price', accessor: (r: Product) => formatCurrency(r.unit_price_cents) },
    { key: 'status_indicator', header: 'Status', accessor: (r: Product) => stockStatus(r) },
    ...(canEdit ? [{
      key: 'actions',
      header: '',
      accessor: (r: Product) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={() => { setEditProduct(r); setFormOpen(true); }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(r.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    }] : []),
  ];

  const displayedProducts = tab === 'low-stock' ? lowStock : products;

  return (
    <div>
      <PageHeader title="Inventory" description="Manage products and stock levels">
        {canEdit && (
          <Button onClick={() => { setEditProduct(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        )}
      </PageHeader>

      {lowStock.length > 0 && (
        <Alert variant="warning" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Low Stock Alert</AlertTitle>
          <AlertDescription>
            {lowStock.length} product{lowStock.length !== 1 ? 's' : ''} at or below reorder point.
            <button className="ml-2 underline text-xs" onClick={() => setTab('low-stock')}>View products</button>
          </AlertDescription>
        </Alert>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Products ({products.length})</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock ({lowStock.length})</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <DataTable
            columns={columns}
            data={displayedProducts}
            loading={loading}
            onRowClick={(r) => navigate(`/inventory/${r.id}`)}
            emptyMessage="No products found."
          />
        </TabsContent>
      </Tabs>

      <ProductForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={editProduct}
        onSuccess={() => { setFormOpen(false); load(); }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Product"
        description="Are you sure? This will remove the product from the catalog."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
