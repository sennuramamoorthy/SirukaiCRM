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

const userSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email(),
  password: z.string().min(6, 'Min 6 chars').optional().or(z.literal('')),
  role: z.enum(['admin', 'sales', 'warehouse']),
});
type UserFormData = z.infer<typeof userSchema>;

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: number;
  created_at: number;
}

export function SettingsPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<User | null>(null);

  async function loadUsers() {
    const res = await api.get('/users');
    setUsers(res.data.data || []);
  }

  React.useEffect(() => { loadUsers(); }, []);

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    values: {
      name: editUser?.name ?? '',
      email: editUser?.email ?? '',
      password: '',
      role: (editUser?.role as 'admin' | 'sales' | 'warehouse') ?? 'sales',
    },
  });

  async function onSubmit(data: UserFormData) {
    try {
      if (editUser) {
        const payload: Record<string, string> = { name: data.name, email: data.email, role: data.role };
        if (data.password) payload.password = data.password;
        await api.put(`/users/${editUser.id}`, payload);
        toast({ title: 'User updated' });
      } else {
        await api.post('/users', data);
        toast({ title: 'User created' });
      }
      reset();
      setFormOpen(false);
      setEditUser(null);
      loadUsers();
    } catch {
      toast({ title: 'Failed to save user', variant: 'destructive' });
    }
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage users and application settings">
        <Button onClick={() => { setEditUser(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </PageHeader>

      <DataTable
        columns={[
          { key: 'name', header: 'Name', sortable: true },
          { key: 'email', header: 'Email' },
          { key: 'role', header: 'Role', accessor: (r: User) => <span className="capitalize">{r.role}</span> },
          { key: 'is_active', header: 'Status', accessor: (r: User) => (
            <span className={`text-xs font-medium ${r.is_active ? 'text-green-600' : 'text-muted-foreground'}`}>
              {r.is_active ? 'Active' : 'Inactive'}
            </span>
          )},
          { key: 'created_at', header: 'Created', accessor: (r: User) => formatDate(r.created_at) },
          { key: 'actions', header: '', accessor: (r: User) => (
            <Button variant="ghost" size="icon" onClick={() => { setEditUser(r); setFormOpen(true); }}>
              <Edit className="h-4 w-4" />
            </Button>
          )},
        ]}
        data={users}
        emptyMessage="No users found."
      />

      <Dialog open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setEditUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editUser ? 'Edit User' : 'Add User'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1"><Label>Name *</Label><Input {...register('name')} /></div>
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            <div className="space-y-1"><Label>Email *</Label><Input type="email" {...register('email')} /></div>
            <div className="space-y-1">
              <Label>Password {editUser ? '(leave blank to keep)' : '*'}</Label>
              <Input type="password" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Role *</Label>
              <Select defaultValue={editUser?.role ?? 'sales'} onValueChange={(v) => setValue('role', v as 'admin' | 'sales' | 'warehouse')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditUser(null); }}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
