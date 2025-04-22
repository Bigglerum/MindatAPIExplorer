import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCrystalClassName, getCrystalSystemInfo } from '@/lib/crystal-classes';

/**
 * A test component for verifying crystal class mappings
 */
export function CrystalSystemTest() {
  const [classId, setClassId] = useState<string>('12');
  const [result, setResult] = useState<any>(null);

  const handleTest = () => {
    const id = parseInt(classId);
    if (isNaN(id)) {
      setResult({ error: 'Please enter a valid number' });
      return;
    }

    const name = getCrystalClassName(id);
    const info = getCrystalSystemInfo(id);
    
    setResult({
      id,
      name,
      info
    });
  };

  // Sample crystal class IDs from the API
  const sampleIds = [0, 2, 5, 7, 8, 10, 11, 12, 13, 20, 27, 29, 32];

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Crystal System Mapping Test</h2>
      
      <div className="flex gap-4 mb-6">
        <Input 
          type="number" 
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          placeholder="Enter crystal class ID"
          className="w-64"
        />
        <Button onClick={handleTest}>Test Crystal Class</Button>
      </div>
      
      {result && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Crystal Class ID: {result.id}</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>Crystal System:</strong> {result.name}</p>
            {result.info && (
              <>
                <p className="mt-2"><strong>Description:</strong> {result.info.description}</p>
                {result.info.examples.length > 0 && (
                  <p className="mt-2">
                    <strong>Examples:</strong> {result.info.examples.join(', ')}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
      
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-4">Sample Crystal Class IDs from API</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleIds.map(id => {
            const name = getCrystalClassName(id);
            return (
              <Card key={id} className="hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">
                    Class ID: {id} → {name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    {getCrystalSystemInfo(id).description.substring(0, 100)}
                    {getCrystalSystemInfo(id).description.length > 100 ? '...' : ''}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}