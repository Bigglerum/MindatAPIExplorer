import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { searchMineralsBySpaceGroup } from '@/lib/mindat-service';

interface SpaceGroupMineralSearchProps {
  spaceGroup?: string;
  system?: string;
  onSelect: (mineral: any) => void;
}

export default function SpaceGroupMineralSearch({ 
  spaceGroup, 
  system, 
  onSelect 
}: SpaceGroupMineralSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Query for minerals matching the search term and space group
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['minerals-by-space-group', searchTerm, spaceGroup, system],
    queryFn: () => searchMineralsBySpaceGroup({ 
      name: searchTerm, 
      space_group: spaceGroup,
      crystal_system: system
    }),
    enabled: isSearching,
  });

  const handleSearch = () => {
    setIsSearching(true);
    refetch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search for minerals with specific space group (e.g., Quartz, Galena)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-grow"
        />
        <Button onClick={handleSearch}>Search</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-sm text-destructive">
          Error fetching minerals. Please try again.
        </div>
      ) : data && isSearching ? (
        <div className="rounded border overflow-x-auto max-h-[300px]">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Mineral Name</TableHead>
                <TableHead>Space Group</TableHead>
                <TableHead>Crystal System</TableHead>
                <TableHead>Formula</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No minerals found matching "{searchTerm}" with this space group.
                  </TableCell>
                </TableRow>
              ) : (
                data.results.map((mineral: any) => (
                  <TableRow 
                    key={mineral.id} 
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => onSelect(mineral)}
                  >
                    <TableCell>{mineral.name}</TableCell>
                    <TableCell className="font-mono">{mineral.space_group || '—'}</TableCell>
                    <TableCell>{mineral.crystal_system || '—'}</TableCell>
                    <TableCell className="font-mono">{mineral.formula || mineral.ima_formula || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : null}
      
      {isSearching && data && data.count > 0 && (
        <div className="text-sm text-muted-foreground text-right">
          Showing {Math.min(data.results.length, data.count)} of {data.count} minerals
        </div>
      )}
    </div>
  );
}