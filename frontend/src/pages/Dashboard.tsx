import { useStore } from '../store/useStore';
import { appRegistry } from '../apps/registry';
import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { Layers, WifiOff } from 'lucide-react';

export default function Dashboard() {
  const { installedApps, isOnline } = useStore();

  if (installedApps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center" style={{ minHeight: '60vh' }}>
        <h2 className="text-2xl font-bold mb-4">Welcome to Hub</h2>
        <p className="text-gray-500 mb-8 max-w-md">Your dashboard is empty. You can add tools and widgets from the App Store to customize your workspace.</p>
        <Link 
          to="/store" 
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
        >
          Go to App Store
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {installedApps.map(appId => {
          const app = appRegistry[appId];
          if (!app) return null;
          
          const IconComponent = (LucideIcons as any)[app.icon] || Layers;

          return (
            <Link
              key={appId}
              to={`/apps/${appId}`}
              className={`flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all group relative ${
                !isOnline && !app.offlineCapable ? 'opacity-60 grayscale hover:ring-0 cursor-not-allowed' : 'hover:ring-2 hover:ring-blue-500 hover:shadow-md'
              }`}
              onClick={(e) => {
                if (!isOnline && !app.offlineCapable) {
                  e.preventDefault();
                }
              }}
            >
              {!isOnline && !app.offlineCapable && (
                <div className="absolute top-3 right-3 text-red-500 bg-red-50 dark:bg-red-900/30 p-1.5 rounded-lg" title="Network unavailable">
                  <WifiOff className="w-4 h-4" />
                </div>
              )}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <IconComponent className="w-10 h-10" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-center line-clamp-1">{app.name}</h3>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
