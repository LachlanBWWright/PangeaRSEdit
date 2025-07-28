import { useState, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Eye, EyeOff, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import BG3DGltfWorker from "../modelParsers/bg3dGltfWorker?worker";
import { BG3DGltfWorkerMessage, BG3DGltfWorkerResponse } from "../modelParsers/bg3dGltfWorker";

// Component to load and display GLTF model
function ModelMesh({ url, visible }: { url: string; visible: boolean }) {
  const { scene } = useGLTF(url);
  
  if (!visible) {
    return null;
  }
  
  return <primitive object={scene} position={[0, 0, 0]} scale={1} />;
}

export function ModelViewer() {
  const [gltfUrl, setGltfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<Array<{ name: string; visible: boolean }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.bg3d')) {
      toast({
        title: "Invalid File",
        description: "Please select a BG3D file",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      const worker = new BG3DGltfWorker();
      
      const result = await new Promise<BG3DGltfWorkerResponse>((resolve, reject) => {
        worker.onmessage = (e) => {
          resolve(e.data);
          worker.terminate();
        };
        
        worker.onerror = (e) => {
          reject(e);
          worker.terminate();
        };
        
        const message: BG3DGltfWorkerMessage = {
          type: "bg3d-to-glb",
          buffer: arrayBuffer
        };
        
        worker.postMessage(message);
      });

      if (result.type === "error") {
        throw new Error(result.error);
      }

      if (result.type === "bg3d-to-glb") {
        const glbBlob = new Blob([result.result], { type: "model/gltf-binary" });
        const url = URL.createObjectURL(glbBlob);
        setGltfUrl(url);
        
        // Initialize models list (we'll expand this when we can inspect the GLTF)
        setModels([{ name: file.name.replace('.bg3d', ''), visible: true }]);
        
        toast({
          title: "Model Loaded",
          description: `Successfully loaded ${file.name}`,
        });
      }
    } catch (error) {
      console.error("Error loading BG3D file:", error);
      toast({
        title: "Error Loading Model",
        description: error instanceof Error ? error.message : "Failed to load BG3D file",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const bg3dFile = files.find(file => file.name.toLowerCase().endsWith('.bg3d'));
    if (bg3dFile) {
      handleFileUpload(bg3dFile);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const toggleModelVisibility = (index: number) => {
    setModels(prev => prev.map((model, i) => 
      i === index ? { ...model, visible: !model.visible } : model
    ));
  };

  const loadTestModel = async () => {
    try {
      // Load the Otto.bg3d test file
      const response = await fetch('/src/modelParsers/testSkeletons/Otto.bg3d');
      const arrayBuffer = await response.arrayBuffer();
      const file = new File([arrayBuffer], 'Otto.bg3d', { type: 'application/octet-stream' });
      await handleFileUpload(file);
    } catch (error) {
      console.error("Error loading test model:", error);
      toast({
        title: "Error Loading Test Model",
        description: "Failed to load Otto.bg3d test file",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <div className="flex flex-1 gap-4 p-4">
        {/* Left sidebar - Controls */}
        <div className="w-80 space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Model Upload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400 mb-2">
                  Drop a BG3D file here or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supports .bg3d files
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".bg3d"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              
              <Button 
                onClick={loadTestModel} 
                variant="outline" 
                className="w-full"
                disabled={loading}
              >
                Load Otto.bg3d Test Model
              </Button>
              
              {loading && (
                <p className="text-center text-gray-400">Loading model...</p>
              )}
            </CardContent>
          </Card>

          {models.length > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Model Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {models.map((model, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={model.visible}
                          onCheckedChange={() => toggleModelVisibility(index)}
                        />
                        <span className="text-sm">{model.name}</span>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleModelVisibility(index)}
                        >
                          {model.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main viewport - 3D Scene */}
        <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden">
          {gltfUrl ? (
            <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
              <ambientLight intensity={0.4} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <Environment preset="studio" />
              
              {/* Load the GLTF model */}
              <ModelMesh url={gltfUrl} visible={models[0]?.visible ?? true} />
              
              <OrbitControls 
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
              />
            </Canvas>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
                  <Upload className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Model Loaded</h3>
                <p>Upload a BG3D file to start viewing 3D models</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <Toaster />
    </div>
  );
}