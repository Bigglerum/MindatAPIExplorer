import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  CrystalClass, 
  CrystalClassResponse, 
  getCrystalClasses 
} from '@/lib/mindat-service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiStatusIndicator } from '@/components/ui/api-status-indicator';

const CrystalSystemOptions = [
  { value: "", label: "All Crystal Systems" },
  { value: "Amorphous", label: "Amorphous" },
  { value: "Hexagonal", label: "Hexagonal" },
  { value: "Icosahedral", label: "Icosahedral" },
  { value: "Isometric", label: "Isometric" },
  { value: "Monoclinic", label: "Monoclinic" },
  { value: "Orthorhombic", label: "Orthorhombic" },
  { value: "Tetragonal", label: "Tetragonal" },
  { value: "Triclinic", label: "Triclinic" },
  { value: "Trigonal", label: "Trigonal" },
];

export default function CrystalClasses() {
  const [system, setSystem] = useState("");
  const [symbol, setSymbol] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Query to fetch crystal classes
  const { data, isLoading, error } = useQuery({
    queryKey: ['crystalClasses', system, symbol, page, pageSize],
    queryFn: () => getCrystalClasses({ system, symbol, page, pageSize }),
  });

  // Check if we can go to the next/previous page
  const canPrevPage = page > 1;
  const canNextPage = data ? (page * pageSize) < data.count : false;

  // Handle pagination
  const goToPrevPage = () => setPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPage((prev) => prev + 1);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Crystal Classes</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Explore crystal classes from the Mindat database
          </p>
        </div>
        <ApiStatusIndicator />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Crystal Classes</CardTitle>
          <CardDescription>
            Use these filters to narrow down your search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Crystal System</label>
              <Select
                value={system}
                onValueChange={(value) => {
                  setSystem(value);
                  setPage(1); // Reset to first page on filter change
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Crystal System" />
                </SelectTrigger>
                <SelectContent>
                  {CrystalSystemOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Symbol</label>
              <Input
                placeholder="Filter by symbol (e.g., '2/m')"
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value);
                  setPage(1); // Reset to first page on filter change
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error 
              ? error.message 
              : "An error occurred while fetching crystal classes from the Mindat API."}
          </AlertDescription>
        </Alert>
      )}

      {/* Results table */}
      <Card>
        <CardHeader>
          <CardTitle>Crystal Classes</CardTitle>
          <CardDescription>
            {data ? `Showing ${Math.min((page - 1) * pageSize + 1, data.count)} - ${Math.min(page * pageSize, data.count)} of ${data.count} crystal classes` : "Loading crystal classes..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded border">
            <Table>
              <TableCaption>Crystal classes from the Mindat API</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Crystal System</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading crystal classes...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data?.results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10">
                      No crystal classes found with the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.results.map((crystalClass: CrystalClass) => (
                    <TableRow key={crystalClass.id}>
                      <TableCell>{crystalClass.id}</TableCell>
                      <TableCell>{crystalClass.system}</TableCell>
                      <TableCell className="font-mono">{crystalClass.symbol}</TableCell>
                      <TableCell>{crystalClass.name}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            disabled={!canPrevPage} 
            onClick={goToPrevPage}
          >
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {page} of {data ? Math.ceil(data.count / pageSize) : 1}
          </div>
          <Button 
            variant="outline" 
            disabled={!canNextPage} 
            onClick={goToNextPage}
          >
            Next
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}