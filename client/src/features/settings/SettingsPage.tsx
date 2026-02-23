import React from 'react';
import { Plus, Edit } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/api/axios';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/formatters';

// Single schema: password is always a string (min 6 or empty string).
// The create-mode requirement (non-empty) is enforced in onSubmit, not Zod,
// to avoid react-hook-form resolver-switching issues.
const userSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().max(100).optional().or(z.literal('')),
  role: z.enum(['admin', 'sales', 'warehouse']),
});
type UserFormData = z.infer<typeof userSchema>;

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: number;
}

interface UserFormProps {
  editUser: User | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// Isolated form component — remounts cleanly on each open via `key` prop.
function UserForm({ editUser, onSuccess, onCancel }: UserFormProps) {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: editUser?.name ?? '',
      email: editUser?.email ?? '',
      password: '',
      role: (editUser?.role as 'admin' | 'sales' | 'warehouse') ?? 'sales',
    },
  });

  async function onSubmit(data: UserFormData) {
    // Enforce password required for new users at submit time
    if (!editUser && (!data.password || data.password.length < 6)) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    try {
      if (editUser) {
        const payload: Record<string, string> = { name: data.name, email: data.email, role: data.role };
        if (data.password) payload.password = data.password;
        await api.put(`/users/${editUser.id}`, payload);
        toast({ title: 'User updated' });
      } else {
        await api.post('/users', { name: data.name, email: data.email, password: data.password, role: data.role });
        toast({ title: 'User created' });
      }
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: msg || 'Failed to save user', variant: 'destructive' });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label>Name *</Label>
        <Input {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Email *</Label>
        <Input type="email" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Password {editUser ? '(leave blank to keep)' : '*'}</Label>
        <Input type="password" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Role *</Label>
        <Select
          defaultValue={editUser?.role ?? 'sales'}
          onValueChange={(v) => setValue('role', v as 'admin' | 'sales' | 'warehouse')}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="warehouse">Warehouse</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SettingsPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<User | null>(null);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.data || []);
    } catch {
      toast({ title: 'Failed to load users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { loadUsers(); }, []);

  function openCreate() {
    setEditUser(null);
    setFormOpen(true);
  }

  function openEdit(user: User) {
    setEditUser(user);
    setFormOpen(true);
  }

  function handleClose() {
    setFormOpen(false);
    setEditUser(null);
  }

  function handleSuccess() {
    handleClose();
    loadUsers();
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage users and application settings">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </PageHeader>

      <DataTable
        columns={[
          { key: 'name', header: 'Name', sortable: true },
          { key: 'email', header: 'Email' },
          {
            key: 'role',
            header: 'Role',
            accessor: (r: User) => <span className="capitalize">{r.role}</span>,
          },
          {
            key: 'is_active',
            header: 'Status',
            accessor: (r: User) => (
              <span className={`text-xs font-medium ${r.is_active ? 'text-green-600' : 'text-muted-foreground'}`}>
                {r.is_active ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          {
            key: 'created_at',
            header: 'Created',
            accessor: (r: User) => formatDate(Number(r.created_at)),
          },
          {
            key: 'actions',
            header: '',
            accessor: (r: User) => (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); openEdit(r); }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            ),
          },
        ]}
        data={users}
        loading={loading}
        emptyMessage="No users found."
      />

      <Dialog open={formOpen} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Edit User' : 'Add User'}</DialogTitle>
          </DialogHeader>
          {/* key forces full remount when switching between create/edit */}
          <UserForm
            key={editUser ? `edit-${editUser.id}` : 'create'}
            editUser={editUser}
            onSuccess={handleSuccess}
            onCancel={handleClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
