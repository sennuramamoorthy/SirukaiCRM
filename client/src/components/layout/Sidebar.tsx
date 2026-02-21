import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShoppingCart, FileText, Package,
  BarChart3, Truck, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'sales', 'warehouse'] },
  { to: '/customers', label: 'Customers', icon: Users, roles: ['admin', 'sales', 'warehouse'] },
  { to: '/orders', label: 'Orders', icon: ShoppingCart, roles: ['admin', 'sales', 'warehouse'] },
  { to: '/invoices', label: 'Invoices', icon: FileText, roles: ['admin', 'sales'] },
  { to: '/inventory', label: 'Inventory', icon: Package, roles: ['admin', 'sales', 'warehouse'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'sales'] },
  { to: '/supply-chain', label: 'Supply Chain', icon: Truck, roles: ['admin', 'warehouse'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const user = useAuthStore((s) => s.user);

  const visibleItems = navItems.filter((item) =>
    user?.role ? item.roles.includes(user.role) : false
  );

  return (
    <aside
      className={cn(
        'flex flex-col bg-gray-900 text-gray-100 transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-700">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        {!sidebarCollapsed && (
          <span className="font-semibold text-white text-lg">CRM Pro</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center py-4 border-t border-gray-700 text-gray-400 hover:text-white transition-colors"
      >
        {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
      </button>
    </aside>
  );
}
