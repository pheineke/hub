import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { appRegistry } from '../apps/registry';
import { ArrowLeft } from 'lucide-react';

export default function AppView() {
  const { appId } = useParams();
  const app = appRegistry[appId || ''];
  const navigate = useNavigate();

  if (!app) return <Navigate to="/" />;

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)} 
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <app.widget />
      </div>
    </div>
  );
}
