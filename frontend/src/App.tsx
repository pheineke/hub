import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AppStore from './pages/AppStore';
import Login from './pages/Login';
import Register from './pages/Register';
import AppView from './pages/AppView';
import { useStore } from './store/useStore';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = useStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
