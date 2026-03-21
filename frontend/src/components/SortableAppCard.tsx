import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { Layers, WifiOff } from 'lucide-react';
import { AppManifest } from '../apps/registry';

interface Props {
  appId: string;
  app: AppManifest;
  isOnline: boolean;
}

export function SortableAppCard({ appId, app, isOnline }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: appId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const IconComponent = (LucideIcons as any)[app.icon] || Layers;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <Link
        to={`/apps/${appId}`}
        className={`block flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all group relative ${
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
    </div>
  );
}
