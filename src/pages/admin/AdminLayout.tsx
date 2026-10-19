import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCurrentUser, selectIsAdmin, logout, loginAsCustomer } from '../../store/slices/authSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { setCategories, setProducts } from '../../store/slices/productSlice';
import { ConfirmDialogHost } from '../../components/common/ConfirmDialogHost';
import { api } from '../../services/api';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Image as ImageIcon,
  ScrollText,
  Sliders,
  Tag,
  Users,
  Star,
  Settings,
  Archive,
  FolderTree,
  ShoppingBag as StorefrontIcon,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Search,
  Menu,
  X,
  ExternalLink,
  Megaphone,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAppSelector(selectCurrentUser);
  const isAdmin = useAppSelector(selectIsAdmin);

  // Authentication & Access Control Enforcement
  useEffect(() => {
    if (!currentUser || !isAdmin) {
      navigate(`/admin/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
    }
  }, [currentUser, isAdmin, navigate, location.pathname]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dbInfo, setDbInfo] = useState<{ mode: string; status: string }>({
    mode: 'Checking...',
    status: 'loading',
  });

  useEffect(() => {
    api.getHealth()
      .then((h) => {
        if (h && h.database) {
          setDbInfo({
            mode: h.database.mode === 'mongodb_atlas' ? 'MongoDB Atlas Live' : 'Active In-Memory Fallback',
            status: h.status,
          });
        }
      })
      .catch((error: unknown) => {
        setDbInfo({
          mode: 'Unavailable',
          status: 'error',
        });
        dispatch(addNotification({
          type: 'error',
          title: 'Server Unavailable',
          message: error instanceof Error ? error.message : 'Could not verify server health.',
          duration: 4000,
        }));
      });
  }, [dispatch]);

  useEffect(() => {
    if (!currentUser || !isAdmin) return;
    let active = true;

    api.getAdminProducts()
      .then((products) => {
        if (active) dispatch(setProducts(products));
      })
      .catch((error: unknown) => {
        if (!active) return;
        dispatch(setProducts([]));
        dispatch(addNotification({
          type: 'error',
          title: 'Products Unavailable',
          message: error instanceof Error ? error.message : 'Could not load products from the server.',
          duration: 4000,
        }));
      });

    api.getAdminCategories()
      .then((categories) => {
        if (active) dispatch(setCategories(categories));
      })
      .catch((error: unknown) => {
        if (!active) return;
        dispatch(setCategories([]));
        dispatch(addNotification({
          type: 'error',
          title: 'Categories Unavailable',
          message: error instanceof Error ? error.message : 'Could not load categories from the server.',
          duration: 4000,
        }));
      });

    return () => {
      active = false;
    };
  }, [currentUser?.id, isAdmin, dispatch]);

  const navGroups = [
    {
      title: 'Core',
      items: [
        { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Catalog',
      items: [
        { label: 'Products', path: '/admin/products', icon: Package },
        { label: 'Categories', path: '/admin/categories', icon: Layers },
        { label: 'Brands', path: '/admin/brands', icon: Tag },
        { label: 'Collections', path: '/admin/collections', icon: FolderTree },
        { label: 'Inventory', path: '/admin/inventory', icon: Archive },
      ],
    },
    {
      title: 'Sales & Fulfillment',
      items: [
        { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
        { label: 'Coupons', path: '/admin/coupons', icon: Tag },
      ],
    },
    {
      title: 'Content & CMS',
      items: [
        { label: 'Advertisements', path: '/admin/advertisements', icon: Megaphone },
        { label: 'Banners', path: '/admin/banners', icon: Sliders },
        { label: 'Homepage CMS', path: '/admin/cms', icon: Sliders },
        { label: 'Media Library', path: '/admin/media', icon: ImageIcon },
      ],
    },
    {
      title: 'Customers & Social',
      items: [
        { label: 'Customers', path: '/admin/customers', icon: Users },
        { label: 'Reviews', path: '/admin/reviews', icon: Star },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Store Settings', path: '/admin/settings', icon: Settings },
        { label: 'Audit Logs', path: '/admin/audit-logs', icon: ScrollText },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Toggle admin sidebar"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/30">
              M
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display font-extrabold text-base tracking-tight text-white">
                Marketly Control Center
              </span>
              <span className="text-[10px] text-blue-400 font-medium">Single-Vendor Enterprise</span>
            </div>
          </Link>
        </div>

        {/* Database Status & Right Actions */}
        <div className="flex items-center gap-3">
          {/* DB Live Connection Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{dbInfo.mode}</span>
          </div>

          {/* Storefront Link */}
          <Link
            to="/"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            <StorefrontIcon className="w-3.5 h-3.5" />
            <span>View Storefront</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          {/* User profile dropdown / logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
              {currentUser?.name[0] || 'A'}
            </div>
            <div className="hidden md:block text-left text-xs leading-tight">
              <p className="font-bold text-white truncate max-w-[120px]">{currentUser?.name}</p>
              <p className="text-[10px] text-slate-400 capitalize">{currentUser?.role.replace('_', ' ')}</p>
            </div>
            <button
              onClick={() => {
                dispatch(logout());
                navigate('/');
              }}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Body: Sidebar + Content */}
      <div className="flex-1 flex">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200/80 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:z-auto flex flex-col justify-between ${
            sidebarOpen ? 'translate-x-0 top-14' : '-translate-x-full'
          }`}
        >
          <div className="overflow-y-auto p-4 space-y-6 flex-1">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3">
                  {group.title}
                </span>
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`
                        }
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Switcher */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={() => {
                dispatch(loginAsCustomer());
                navigate('/account');
              }}
              className="w-full py-2 px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <span>Switch to Customer View</span>
            </button>
          </div>
        </aside>

        {/* Content Outlet */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Global confirmation dialog host (replaces native confirm()) */}
      <ConfirmDialogHost />
    </div>
  );
};
