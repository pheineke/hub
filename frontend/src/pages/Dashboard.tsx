import { useStore } from '../store/useStore';
import { appRegistry } from '../apps/registry';
import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { Layers, WifiOff } from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableAppCard } from '../components/SortableAppCard';
import { useState, useEffect } from 'react';


export default function Dashboard() {
  const { user, installedApps, isOnline, updateUserPreferences } = useStore();
  const [items, setItems] = useState<string[]>([]);
  
  useEffect(() => {
    const prefsOrder = user?.preferences?.dashboardOrder || [];
    // Only show installed apps, sorted by prefsOrder if available
    const ordered = [...installedApps].sort((a, b) => {
      const idxA = prefsOrder.indexOf(a);
      const idxB = prefsOrder.indexOf(b);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
    setItems(ordered);
  }, [installedApps, user?.preferences?.dashboardOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newItems = arrayMove(items, oldIndex, newIndex);
        updateUserPreferences({ dashboardOrder: newItems });
        return newItems;
      });
    }
  };

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
      
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={items}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {items.map(appId => {
              const app = appRegistry[appId];
              if (!app) return null;
              
              return (
                <SortableAppCard
                  key={appId}
                  appId={appId}
                  app={app}
                  isOnline={isOnline}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
