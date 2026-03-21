import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Library, LogOut, Menu, X, User as UserIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import axios from 'axios';
import clsx from 'clsx';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, token, setUser, logout, fetchInstalledApps } = useStore();

  useEffect(() => {
    if (token) {
      axios.get('http://localhost:8001/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setUser(res.data);
        fetchInstalledApps();
      })
      .catch(err => {
        console.error("Auth failed:", err);
        logout();
      });
    } else {
      logout();
    }
  }, [token, setUser, logout, fetchInstalledApps]);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'App Store', href: '/store', icon: Library },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        "flex flex-col"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Hub</h1>
          <button className="lg:hidden" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                  isActive 
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                    : "hover:bg-gray-100 dark:hover:bg-gray-800/50"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0 space-y-2">
          {user && (
            <div className="flex items-center gap-3 px-4 py-2 mb-2 text-sm text-gray-500 dark:text-gray-400">
               <UserIcon className="w-4 h-4" />
               <span className="font-medium truncate">{user.username}</span>
            </div>
          )}
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Mobile */}
        <header className="lg:hidden h-16 shrink-0 flex items-center justify-between px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
           <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-600 dark:text-gray-300">
             <Menu className="w-6 h-6" />
           </button>
           <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Hub</h1>
           <div className="w-6" /> {/* Spacer */}
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
