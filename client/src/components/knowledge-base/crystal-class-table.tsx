import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CRYSTAL_CLASS_LOOKUP } from '@/lib/crystal-classes';

export function CrystalClassTable() {
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Crystal Class Reference</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          <p>
            This reference maps the Mindat API's <code>cclass</code> numeric values to 
            their corresponding crystal class notation and system.
          </p>
        </div>

        <div className="border rounded-md overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  cclass ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Crystal System
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Crystal Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Example Mineral
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {crystalClasses.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.system}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.class}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.example}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <h3 className="font-medium mb-2">Note:</h3>
          <p>
            The crystal class notation (such as "2/m - Prismatic") describes the symmetry elements 
            present in the crystal structure. These notations follow the Hermann-Mauguin system, 
            which is widely used in crystallography.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}