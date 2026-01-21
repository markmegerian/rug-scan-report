import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Loader2, Search, Filter, FileText, Settings, DollarSign, User, Mail, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

interface AuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  admin_email?: string;
}

const ACTION_LABELS: Record<string, string> = {
  settings_updated: 'Settings Updated',
  payout_created: 'Payout Created',
  payout_completed: 'Payout Completed',
  payout_failed: 'Payout Failed',
  user_viewed: 'User Viewed',
  fee_updated: 'Fee Updated',
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  platform_settings: <Settings className="h-4 w-4" />,
  payout: <DollarSign className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
  notification_settings: <Bell className="h-4 w-4" />,
  email_template: <Mail className="h-4 w-4" />,
};

const ACTION_COLORS: Record<string, string> = {
  settings_updated: 'bg-blue-500/10 text-blue-600 border-blue-200',
  payout_created: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  payout_completed: 'bg-green-500/10 text-green-600 border-green-200',
  payout_failed: 'bg-red-500/10 text-red-600 border-red-200',
  user_viewed: 'bg-gray-500/10 text-gray-600 border-gray-200',
  fee_updated: 'bg-purple-500/10 text-purple-600 border-purple-200',
};

export const AuditLogTable = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch admin emails
      const adminIds = [...new Set((data || []).map(log => log.admin_user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, business_email')
        .in('user_id', adminIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p.full_name || p.business_email || 'Admin'])
      );

      setLogs(
        (data || []).map(log => ({
          ...log,
          details: (log.details || {}) as Record<string, unknown>,
          admin_email: profileMap.get(log.admin_user_id) || 'Unknown Admin',
        }))
      );
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(search.toLowerCase()) ||
      log.admin_email?.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(log.details).toLowerCase().includes(search.toLowerCase());

    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;

    return matchesSearch && matchesEntity;
  });

  const formatDetails = (details: Record<string, unknown>): string => {
    if (!details || Object.keys(details).length === 0) return '-';
    
    const entries = Object.entries(details)
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
      .slice(0, 3);
    
    return entries.join(', ') + (Object.keys(details).length > 3 ? '...' : '');
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Audit Log
        </CardTitle>
        <CardDescription>
          Track all administrative actions and changes made to the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="platform_settings">Settings</SelectItem>
              <SelectItem value="payout">Payouts</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="notification_settings">Notifications</SelectItem>
              <SelectItem value="email_template">Email Templates</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No audit logs found</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="hidden md:table-cell">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.admin_email}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={ACTION_COLORS[log.action] || 'bg-gray-500/10 text-gray-600'}
                      >
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {ENTITY_ICONS[log.entity_type] || <FileText className="h-4 w-4" />}
                        <span className="capitalize">{log.entity_type.replace('_', ' ')}</span>
                        {log.entity_id && (
                          <code className="text-xs bg-muted px-1 rounded">
                            {log.entity_id.slice(0, 8)}...
                          </code>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[300px] truncate">
                      {formatDetails(log.details)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
