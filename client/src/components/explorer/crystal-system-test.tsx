import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  const [allClassIds, setAllClassIds] = useState<number[]>([]);

  // Get all crystal class IDs on component mount
  useEffect(() => {
    const ids = Object.keys(CRYSTAL_CLASS_LOOKUP).map(id => parseInt(id)).sort((a, b) => a - b);
    setAllClassIds(ids);
  }, []);

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

  // Sample crystal class IDs to show by default
  const commonIds = [2, 5, 8, 12, 13, 20, 27, 29, 32];

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Crystal Class Mapping Test</h2>
      <p className="text-gray-600 mb-6">
        This tool demonstrates how the Mindat API's numeric crystal class IDs 
        ("cclass" field) map to proper crystal class notations and systems.
        Enter any crystal class ID found in the API to see its corresponding crystal system and class.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input 
          type="number" 
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          placeholder="Enter crystal class ID"
          className="w-full sm:w-64"
        />
        <Button onClick={handleTest}>Test Crystal Class</Button>
      </div>
      
      {result && result.error ? (
        <Card className="mb-6 border-red-300">
          <CardContent className="pt-6">
            <p className="text-red-500">{result.error}</p>
          </CardContent>
        </Card>
      ) : result && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Crystal Class ID: {result.id}</CardTitle>
            <CardDescription>
              Detailed information about the crystal class and system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg mb-2">Crystal Class Information</h3>
                <p><strong>System:</strong> {result.classInfo.system}</p>
                <p><strong>Class:</strong> {result.classInfo.class}</p>
                <p><strong>Example Mineral:</strong> {result.classInfo.example}</p>
              </div>
              <div className="space-y-2">
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
      
      <div className="mt-8 space-y-6">
        <div>
          <h3 className="text-lg font-bold mb-4">Common Crystal Class IDs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {commonIds.map(id => {
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 text-xs"
                      onClick={() => {
                        setClassId(id.toString());
                        handleTest();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-bold mb-4">All Available Crystal Class IDs</h3>
          <div className="flex flex-wrap gap-2">
            {allClassIds.map(id => (
              <Button 
                key={id}
                variant={classId === id.toString() ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setClassId(id.toString());
                  handleTest();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                {id}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}