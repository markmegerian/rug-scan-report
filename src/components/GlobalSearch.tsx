import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Briefcase, User, FileText, Loader2 } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SearchResult {
  id: string;
  type: 'job' | 'client' | 'rug';
  title: string;
  subtitle: string;
  url: string;
}

const GlobalSearch: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Keyboard shortcut handler
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2 || !user) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];
      const searchTerm = `%${searchQuery}%`;

      // Search jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, job_number, client_name, status')
        .eq('user_id', user.id)
        .or(`job_number.ilike.${searchTerm},client_name.ilike.${searchTerm}`)
        .limit(5);

      if (jobs) {
        jobs.forEach((job) => {
          searchResults.push({
            id: job.id,
            type: 'job',
            title: `Job #${job.job_number}`,
            subtitle: job.client_name,
            url: `/jobs/${job.id}`,
          });
        });
      }

      // Search inspections (rugs)
      const { data: inspections } = await supabase
        .from('inspections')
        .select('id, rug_number, rug_type, job_id')
        .eq('user_id', user.id)
        .or(`rug_number.ilike.${searchTerm},rug_type.ilike.${searchTerm}`)
        .limit(5);

      if (inspections) {
        inspections.forEach((inspection) => {
          searchResults.push({
            id: inspection.id,
            type: 'rug',
            title: `Rug #${inspection.rug_number}`,
            subtitle: inspection.rug_type,
            url: `/jobs/${inspection.job_id}`,
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleSelect = (url: string) => {
    setOpen(false);
    setQuery('');
    navigate(url);
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'job':
        return <Briefcase className="h-4 w-4 text-primary" />;
      case 'client':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'rug':
        return <FileText className="h-4 w-4 text-amber-500" />;
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search jobs, clients, rugs..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && query.length >= 2 && results.length === 0 && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}
        {!loading && query.length < 2 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>Type at least 2 characters to search</p>
            <p className="mt-1 text-xs">
              Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-xs">⌘K</kbd> or{' '}
              <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-xs">/</kbd> anytime to search
            </p>
          </div>
        )}
        {results.length > 0 && (
          <CommandGroup heading="Results">
            {results.map((result) => (
              <CommandItem
                key={`${result.type}-${result.id}`}
                onSelect={() => handleSelect(result.url)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="rounded-md bg-muted p-1.5">{getIcon(result.type)}</div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium truncate">{result.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default GlobalSearch;