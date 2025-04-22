import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  getCrystalClassName, 
  getCrystalSystemName,
  getCrystalClassInfo,
  CRYSTAL_CLASS_LOOKUP,
  CRYSTAL_SYSTEM_INFO 
} from '@/lib/crystal-classes';

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

    const classInfo = getCrystalClassInfo(id);
    const systemInfo = CRYSTAL_SYSTEM_INFO[classInfo.system] || {
      description: "No additional information available",
      examples: []
    };
    
    setResult({
      id,
      classInfo,
      systemInfo
    });
  };

  // Sample crystal class IDs from the API
  const sampleIds = [0, 2, 5, 8, 12, 13, 20, 27, 29, 32];

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Crystal Class Mapping Test</h2>
      <p className="text-gray-600 mb-6">
        This tool demonstrates how the Mindat API's numeric crystal class IDs 
        ("cclass" field) map to proper crystal class notations and systems.
      </p>
      
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Crystal Class Information</h3>
                <p><strong>System:</strong> {result.classInfo.system}</p>
                <p><strong>Class:</strong> {result.classInfo.class}</p>
                <p><strong>Example Mineral:</strong> {result.classInfo.example}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Crystal System Information</h3>
                <p><strong>Description:</strong> {result.systemInfo.description}</p>
                {result.systemInfo.examples.length > 0 && (
                  <p className="mt-2">
                    <strong>Examples:</strong> {result.systemInfo.examples.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-4">Crystal Class IDs from Mindat API</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleIds.map(id => {
            const classInfo = getCrystalClassInfo(id);
            return (
              <Card key={id} className="hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">
                    Class ID: {id}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-2"><strong>System:</strong> {classInfo.system}</p>
                  <p className="mb-2"><strong>Class:</strong> {classInfo.class}</p>
                  <p className="text-sm text-gray-600">Example: {classInfo.example}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}