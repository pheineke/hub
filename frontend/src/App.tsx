import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AppStore from './pages/AppStore';
import Login from './pages/Login';
import Register from './pages/Register';
import AppView from './pages/AppView';
import ChangePassword from './pages/ChangePassword';
import Admin from './pages/Admin';
import { useStore } from './store/useStore';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = useStore((state) => state.token);
  const user = useStore((state) => state.user);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (user?.requires_password_change) {
    return <Navigate to="/change-password" replace />;
  }
  return children;
}

function AdminRoute({ children }: { children: JSX.Element }) {
  const token = useStore((state) => state.token);
  const user = useStore((state) => state.user);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (!user?.is_admin) {
    return <Navigate to="/" replace />;
  }
  return children;
}


function App() {
  const setIsOnline = useStore((state) => state.setIsOnline);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <Layout />
            </AdminRoute>
          }
        >
          <Route index element={<Admin />} />
        </Route>
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="store" element={<AppStore />} />
          <Route path="apps/:appId" element={<AppView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
