import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { customersApi } from '@/api/customers.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { CustomerForm } from './CustomerForm';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  created_at: number;
}

export function CustomersPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'admin' || user?.role === 'sales';

  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);
  const [editCustomer, setEditCustomer] = React.useState<Customer | null>(null);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  async function loadCustomers(s = search) {
    setLoading(true);
    try {
      const res = await customersApi.list({ search: s, limit: 100 });
      setCustomers(res.data || []);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { loadCustomers(); }, []);

  React.useEffect(() => {
    const t = setTimeout(() => loadCustomers(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await customersApi.delete(deleteId);
      toast({ title: 'Customer deleted', variant: 'default' });
      setDeleteId(null);
      loadCustomers();
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', accessor: (r: Customer) => r.email || '—' },
    { key: 'phone', header: 'Phone', accessor: (r: Customer) => r.phone || '—' },
    { key: 'company', header: 'Company', accessor: (r: Customer) => r.company || '—' },
    ...(canEdit ? [{
      key: 'actions',
      header: '',
      accessor: (r: Customer) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={() => { setEditCustomer(r); setFormOpen(true); }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(r.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div>
      <PageHeader title="Customers" description="Manage your customer base">
        {canEdit && (
          <Button onClick={() => { setEditCustomer(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Customer
          </Button>
        )}
      </PageHeader>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={customers}
        loading={loading}
        onRowClick={(r) => navigate(`/customers/${r.id}`)}
        emptyMessage="No customers found."
      />

      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={editCustomer}
        onSuccess={() => { setFormOpen(false); loadCustomers(); }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Customer"
        description="Are you sure you want to delete this customer? This action cannot be undone."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
