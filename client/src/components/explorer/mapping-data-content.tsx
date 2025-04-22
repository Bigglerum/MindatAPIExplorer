import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Copy } from 'lucide-react';
import { CRYSTAL_CLASS_LOOKUP } from '@/lib/crystal-classes';
import { downloadAsCSV } from '@/lib/utils';

export default function MappingDataContent() {
  // Convert the lookup object to an array for easier display
  const crystalClasses = Object.entries(CRYSTAL_CLASS_LOOKUP)
    .map(([id, info]) => ({
      id: parseInt(id),
      ...info
    }))
    .filter(item => item.system !== "Unknown") // Filter out Unknown entries
    .sort((a, b) => {
      // Sort by system, then by class
      if (a.system !== b.system) {
        return a.system.localeCompare(b.system);
      }
      return a.class.localeCompare(b.class);
    });

  // Function to handle CSV download
  const handleDownloadCSV = () => {
    const csvData = crystalClasses.map(item => ({
      'Class ID': item.id,
      'Crystal System': item.system,
      'Crystal Class': item.class,
      'Example Mineral': item.example
    }));
    
    downloadAsCSV(csvData, 'crystal-classes');
  };

  // Function to copy data as CSV to clipboard
  const handleCopyCSV = () => {
    const headers = ['Class ID', 'Crystal System', 'Crystal Class', 'Example Mineral'];
    const rows = crystalClasses.map(item => 
      [item.id, item.system, item.class, item.example].join(',')
    );
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    navigator.clipboard.writeText(csvContent)
      .then(() => {
        // Display success message (could use a toast notification here)
        alert('Crystal class data copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Crystal Class Reference</CardTitle>
              <CardDescription>
                Mapping of Mindat API cclass values to crystal systems and classes
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopyCSV}
                className="flex items-center gap-1"
              >
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">Copy</span>
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleDownloadCSV}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download CSV</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            <p>
              This reference table maps the Mindat API's <code>cclass</code> numeric values to 
              their corresponding crystal class notation and system. Use this when working with 
              mineral data from the API.
            </p>
          </div>

          <div className="border rounded-md overflow-auto max-h-[500px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    cclass ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Crystal System
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Crystal Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Example Mineral
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-200">
                {crystalClasses.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {item.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.system}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.class}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.example}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            <h3 className="font-medium mb-2">Note:</h3>
            <p>
              The crystal class notation (such as "2/m - Prismatic") describes the symmetry elements 
              present in the crystal structure. These notations follow the Hermann-Mauguin system, 
              which is widely used in crystallography.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}