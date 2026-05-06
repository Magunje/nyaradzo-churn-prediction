import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { clearStoredSession, getStoredSession, persistSession } from "./api/client";
import AppShell from "./components/AppShell";
import ClaimsManagementPage from "./pages/ClaimsManagementPage";
import DashboardPage from "./pages/DashboardPage";
import FileClaimPage from "./pages/FileClaimPage";
import LoginPage from "./pages/LoginPage";
import MaturedPoliciesPage from "./pages/MaturedPoliciesPage";
import PaymentUpdatesPage from "./pages/PaymentUpdatesPage";
import PolicyholderFormPage from "./pages/PolicyholderFormPage";
import PolicyholdersPage from "./pages/PolicyholdersPage";
import PredictionPage from "./pages/PredictionPage";
import ReportsPage from "./pages/ReportsPage";

function ProtectedRoute({ token, children }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const storedSession = getStoredSession();
  const [token, setToken] = useState(storedSession?.token || "");
  const [user, setUser] = useState(storedSession?.user || null);

  const handleLogin = (session) => {
    persistSession(session);
    setToken(session.access_token);
    setUser(session.user);
  };

  const handleLogout = () => {
    clearStoredSession();
    setToken("");
    setUser(null);
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={token ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute token={token}>
            <AppShell user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage token={token} />} />
        <Route path="policyholders" element={<PolicyholdersPage token={token} />} />
        <Route path="register-policy" element={<PolicyholderFormPage token={token} mode="create" />} />
        <Route path="policyholders/new" element={<PolicyholderFormPage token={token} mode="create" />} />
        <Route path="policyholders/:id/edit" element={<PolicyholderFormPage token={token} mode="edit" />} />
        <Route path="predict" element={<PredictionPage token={token} mode="adhoc" />} />
        <Route path="predict/:id" element={<PredictionPage token={token} mode="record" />} />
        <Route path="reports" element={<ReportsPage token={token} />} />
        <Route path="file-claim" element={<FileClaimPage token={token} />} />
        <Route path="claims-management" element={<ClaimsManagementPage />} />
        <Route path="matured-policies" element={<MaturedPoliciesPage token={token} />} />
        <Route path="payment-updates" element={<PaymentUpdatesPage token={token} />} />
      </Route>
      <Route path="*" element={<Navigate to={token ? "/" : "/login"} replace />} />
    </Routes>
  );
}
