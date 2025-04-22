import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { CRYSTAL_CLASS_LOOKUP } from '@/lib/crystal-classes';

/**
 * Simple component showing just the crystal class ID mappings table
 */
export default function MappingDataContent() {
  // Get all crystal classes sorted by ID
  const crystalClasses = Object.entries(CRYSTAL_CLASS_LOOKUP)
    .map(([id, info]) => ({
      id: parseInt(id),
      ...info
    }))
    .sort((a, b) => a.id - b.id);
  
  // CSV data for copy/download
  const csvContent = [
    'Class ID,Crystal System,Crystal Class,Example Mineral',
    ...crystalClasses.map(item => 
      `${item.id},"${item.system}","${item.class}","${item.example}"`
    )
  ].join('\n');

  const handleCopyCSV = () => {
    navigator.clipboard.writeText(csvContent);
  };

  const handleDownloadCSV = () => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'crystal_classes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="py-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Mindat API Crystal Class ID Mappings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Simple mapping table of Mindat API crystal class IDs (<code>cclass</code> field) to their 
            crystal systems and class notations.
          </p>
          
          <div className="flex gap-2 mb-4">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleCopyCSV}
              className="flex items-center gap-1"
            >
              <Copy className="h-4 w-4" />
              <span>Copy CSV</span>
            </Button>
            <Button 
              size="sm"
              onClick={handleDownloadCSV}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              <span>Download CSV</span>
            </Button>
          </div>
          
          <div className="border rounded-md overflow-auto max-h-[600px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Class ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Crystal System
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Crystal Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Example Mineral
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-200">
                {crystalClasses.map((item) => (
                  <tr key={`class-${item.id}`} className="hover:bg-muted/50">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium">
                      {item.id}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm">
                      {item.system}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm">
                      {item.class}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm">
                      {item.example}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}