import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight, Building2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Business {
  id: string;
  user_id: string;
  business_name: string | null;
  full_name: string | null;
  business_email: string | null;
  created_at: string;
  jobCount: number;
  totalRevenue: number;
  outstandingBalance: number;
}

interface BusinessTableProps {
  businesses: Business[];
  loading?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const BusinessTable = ({ businesses, loading }: BusinessTableProps) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No businesses found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Jobs</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Balance Due</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {businesses.map((business) => (
            <TableRow
              key={business.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/admin/users/${business.user_id}`)}
            >
              <TableCell>
                <div className="font-medium">
                  {business.business_name || business.full_name || 'Unnamed Business'}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  {business.business_email || '—'}
                </div>
              </TableCell>
              <TableCell>
                {format(new Date(business.created_at), 'MMM d, yyyy')}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary">{business.jobCount}</Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(business.totalRevenue)}
              </TableCell>
              <TableCell className="text-right">
                {business.outstandingBalance > 0 ? (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    {formatCurrency(business.outstandingBalance)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" className="gap-1">
                  View
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
