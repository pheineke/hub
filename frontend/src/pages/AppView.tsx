import { useParams, Navigate, Link } from 'react-router-dom';
import { appRegistry } from '../apps/registry';
import { ArrowLeft } from 'lucide-react';

export default function AppView() {
  const { appId } = useParams();
  const app = appRegistry[appId || ''];

  if (!app) return <Navigate to="/" />;

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      <div className="mb-4 shrink-0">
        <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>
      <div className="flex-1 min-h-0">
        <app.widget />
      </div>
    </div>
  );
}
