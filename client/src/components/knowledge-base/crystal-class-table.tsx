import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CRYSTAL_CLASS_LOOKUP } from '@/lib/crystal-classes';

export function CrystalClassTable() {
  // Convert the lookup object to an array for easier mapping
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

  // Group by crystal system for better organization
  const groupedBySystems = crystalClasses.reduce((acc, item) => {
    if (!acc[item.system]) {
      acc[item.system] = [];
    }
    acc[item.system].push(item);
    return acc;
  }, {} as Record<string, typeof crystalClasses>);

  const systemOrder = [
    "Isometric", 
    "Hexagonal", 
    "Tetragonal", 
    "Trigonal",
    "Orthorhombic", 
    "Monoclinic", 
    "Triclinic"
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Crystal Class Reference</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          <p>
            This reference table maps the Mindat API's <code>cclass</code> numeric values to 
            their corresponding crystal class notation and system. Use this when working with 
            mineral data from the API.
          </p>
        </div>

        <Table>
          <TableCaption>
            Crystal Class Reference Table derived from Mindat API mineral data
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">cclass ID</TableHead>
              <TableHead>Crystal System</TableHead>
              <TableHead>Crystal Class</TableHead>
              <TableHead className="text-right">Example Mineral</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {systemOrder.map(system => (
              <React.Fragment key={system}>
                {groupedBySystems[system]?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell>{item.system}</TableCell>
                    <TableCell>{item.class}</TableCell>
                    <TableCell className="text-right">{item.example}</TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>

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