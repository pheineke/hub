import { useStore } from '../store/useStore';
import { appRegistry } from '../apps/registry';
import { Check, Download, Layers, WifiOff } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export default function AppStore() {
  const { installedApps, installApp, uninstallApp, isOnline } = useStore();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">App Store</h2>
      <p className="text-gray-500 mb-8">Discover and install tools for your dashboard.</p>

      {!isOnline && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-xl flex items-center gap-3">
          <WifiOff className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">You are currently offline. Installation and uninstallation of apps are disabled.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Object.values(appRegistry).map(app => {
          const isInstalled = installedApps.includes(app.id);
          const IconComponent = (LucideIcons as any)[app.icon] || Layers;

          return (
            <div key={app.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full relative overflow-hidden">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{app.name}</h3>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-500 dark:text-gray-400">Hub Module</span>
                    {app.offlineCapable && (
                      <span className="text-xs font-semibold px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-md text-green-600 dark:text-green-400 flex items-center gap-1">
                        <WifiOff className="w-3 h-3" /> Offline Capable
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 flex-grow mb-6">
                {app.description}
              </p>
              
              <button
                disabled={!isOnline}
                onClick={() => isInstalled ? uninstallApp(app.id) : installApp(app.id)}
                className={`w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                  !isOnline ? "opacity-50 cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400" :
                  isInstalled 
                    ? "bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 dark:bg-gray-700 dark:text-gray-200"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
                }`}
              >
                {isInstalled ? (
                  <>
                    <Check className="w-4 h-4" /> Installed
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Install
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
