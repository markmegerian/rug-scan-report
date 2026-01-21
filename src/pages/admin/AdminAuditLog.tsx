import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AuditLogTable } from '@/components/admin/AuditLogTable';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2 } from 'lucide-react';

const AdminAuditLog = () => {
  const { isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      
      <main className="container max-w-6xl py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <History className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-display font-bold">Audit Log</h1>
          </div>
          <p className="text-muted-foreground">
            Complete history of all administrative actions and platform changes.
          </p>
        </div>

        <AuditLogTable />
      </main>
    </div>
  );
};

export default AdminAuditLog;
