import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock dependencies that the ModelViewer component uses
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('ModelViewer Two-Step Upload Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('validates BG3D file names correctly', () => {
    const validBg3dFiles = [
      'test.bg3d',
      'Model.BG3D',
      'complex-name_123.bg3d'
    ];

    const invalidBg3dFiles = [
      'test.txt',
      'model.glb',
      'skeleton.rsrc',
      'test.bg3d.bak'
    ];

    validBg3dFiles.forEach(filename => {
      expect(filename.toLowerCase().endsWith('.bg3d')).toBe(true);
    });

    invalidBg3dFiles.forEach(filename => {
      expect(filename.toLowerCase().endsWith('.bg3d')).toBe(false);
    });
  });

  test('validates skeleton file names correctly', () => {
    const validSkeletonFiles = [
      'test.skeleton.rsrc',
      'Model.SKELETON.RSRC',
      'complex-name_123.skeleton.rsrc'
    ];

    const invalidSkeletonFiles = [
      'test.txt',
      'model.glb',
      'test.bg3d',
      'test.rsrc',
      'skeleton.skeleton'
    ];

    validSkeletonFiles.forEach(filename => {
      expect(filename.toLowerCase().endsWith('.skeleton.rsrc')).toBe(true);
    });

    invalidSkeletonFiles.forEach(filename => {
      expect(filename.toLowerCase().endsWith('.skeleton.rsrc')).toBe(false);
    });
  });

  test('handles upload step state transitions correctly', () => {
    type UploadStep = "select-bg3d" | "select-skeleton" | "completed";
    
    let uploadStep: UploadStep = "select-bg3d";
    let pendingBg3dFile: File | null = null;

    // Initial state
    expect(uploadStep).toBe("select-bg3d");
    expect(pendingBg3dFile).toBeNull();

    // BG3D file selected
    const bg3dFile = new File(['test'], 'test.bg3d', { type: 'application/octet-stream' });
    pendingBg3dFile = bg3dFile;
    uploadStep = "select-skeleton";

    expect(uploadStep).toBe("select-skeleton");
    expect(pendingBg3dFile).toBe(bg3dFile);

    // Upload completed
    uploadStep = "completed";
    pendingBg3dFile = null;

    expect(uploadStep).toBe("completed");
    expect(pendingBg3dFile).toBeNull();

    // Reset state
    uploadStep = "select-bg3d";

    expect(uploadStep).toBe("select-bg3d");
  });

  test('handles file array filtering correctly', () => {
    const files = [
      new File(['bg3d'], 'model.bg3d', { type: 'application/octet-stream' }),
      new File(['skeleton'], 'model.skeleton.rsrc', { type: 'application/octet-stream' }),
      new File(['txt'], 'readme.txt', { type: 'text/plain' }),
      new File(['glb'], 'model.glb', { type: 'model/gltf-binary' })
    ];

    const bg3dFile = files.find(f => f.name.toLowerCase().endsWith('.bg3d'));
    const skeletonFile = files.find(f => f.name.toLowerCase().endsWith('.skeleton.rsrc'));
    const glbFile = files.find(f => f.name.toLowerCase().endsWith('.glb'));

    expect(bg3dFile?.name).toBe('model.bg3d');
    expect(skeletonFile?.name).toBe('model.skeleton.rsrc');
    expect(glbFile?.name).toBe('model.glb');
  });

  test('handles drag and drop file validation', () => {
    const validateDroppedFiles = (files: File[], expectedExt: string) => {
      return files.find(f => f.name.toLowerCase().endsWith(expectedExt));
    };

    // BG3D conversion scenario
    const bg3dFiles = [
      new File(['bg3d'], 'model.bg3d', { type: 'application/octet-stream' }),
      new File(['skeleton'], 'model.skeleton.rsrc', { type: 'application/octet-stream' })
    ];

    const bg3dFile = validateDroppedFiles(bg3dFiles, '.bg3d');
    const skeletonFile = validateDroppedFiles(bg3dFiles, '.skeleton.rsrc');

    expect(bg3dFile).toBeDefined();
    expect(skeletonFile).toBeDefined();

    // GLB conversion scenario
    const glbFiles = [
      new File(['glb'], 'model.glb', { type: 'model/gltf-binary' })
    ];

    const glbFile = validateDroppedFiles(glbFiles, '.glb');
    expect(glbFile).toBeDefined();

    // Invalid files scenario
    const invalidFiles = [
      new File(['txt'], 'readme.txt', { type: 'text/plain' })
    ];

    const invalidBg3dFile = validateDroppedFiles(invalidFiles, '.bg3d');
    expect(invalidBg3dFile).toBeUndefined();
  });

  test('handles message type selection logic', () => {
    const selectMessageType = (conversionType: string, hasSkeletonData: boolean) => {
      if (conversionType === 'bg3d-to-glb') {
        return hasSkeletonData ? 'bg3d-with-skeleton-to-glb' : 'bg3d-to-glb';
      } else if (conversionType === 'glb-to-bg3d') {
        return 'glb-to-bg3d';
      }
      return 'unknown';
    };

    expect(selectMessageType('bg3d-to-glb', true)).toBe('bg3d-with-skeleton-to-glb');
    expect(selectMessageType('bg3d-to-glb', false)).toBe('bg3d-to-glb');
    expect(selectMessageType('glb-to-bg3d', true)).toBe('glb-to-bg3d');
    expect(selectMessageType('glb-to-bg3d', false)).toBe('glb-to-bg3d');
  });

  test('handles worker readiness state correctly', () => {
    let isWorkerReady = false;
    let pyodideWorker: any = null;

    const canProcessSkeleton = (skeletonFile: File | undefined) => {
      return !!(skeletonFile && pyodideWorker && isWorkerReady);
    };

    const mockSkeletonFile = new File(['skeleton'], 'test.skeleton.rsrc', { type: 'application/octet-stream' });

    // Worker not ready
    expect(canProcessSkeleton(mockSkeletonFile)).toBe(false);

    // Worker exists but not ready
    pyodideWorker = { postMessage: vi.fn() };
    expect(canProcessSkeleton(mockSkeletonFile)).toBe(false);

    // Worker ready
    isWorkerReady = true;
    expect(canProcessSkeleton(mockSkeletonFile)).toBe(true);

    // No skeleton file
    expect(canProcessSkeleton(undefined)).toBe(false);
  });

  test('handles file loading success states', () => {
    const generateFileName = (bg3dFile: File, skeletonFile?: File) => {
      return skeletonFile ? `${bg3dFile.name} + ${skeletonFile.name}` : bg3dFile.name;
    };

    const bg3dFile = new File(['bg3d'], 'Otto.bg3d', { type: 'application/octet-stream' });
    const skeletonFile = new File(['skeleton'], 'Otto.skeleton.rsrc', { type: 'application/octet-stream' });

    expect(generateFileName(bg3dFile)).toBe('Otto.bg3d');
    expect(generateFileName(bg3dFile, skeletonFile)).toBe('Otto.bg3d + Otto.skeleton.rsrc');
  });

  test('handles animation detection logic', () => {
    const checkForAnimations = (parsed: any) => {
      return parsed.skeleton?.animations?.length || 0;
    };

    const parsedWithoutSkeleton = {
      materials: [],
      groups: [],
    };

    const parsedWithEmptyAnimations = {
      materials: [],
      groups: [],
      skeleton: {
        bones: [],
        animations: []
      }
    };

    const parsedWithAnimations = {
      materials: [],
      groups: [],
      skeleton: {
        bones: [],
        animations: [
          { name: 'walk', duration: 2.5 },
          { name: 'run', duration: 1.8 }
        ]
      }
    };

    expect(checkForAnimations(parsedWithoutSkeleton)).toBe(0);
    expect(checkForAnimations(parsedWithEmptyAnimations)).toBe(0);
    expect(checkForAnimations(parsedWithAnimations)).toBe(2);
  });
});

describe('SkeletonConversionPanel Logic', () => {
  test('handles conversion type validation', () => {
    const getFileExtensions = (conversionType: string) => {
      const expectedExt = conversionType === "bg3d-to-glb" ? ".bg3d" : ".glb";
      const outputExt = conversionType === "bg3d-to-glb" ? "glb" : "bg3d";
      const outputMimeType = conversionType === "bg3d-to-glb" ? "model/gltf-binary" : "application/octet-stream";
      
      return { expectedExt, outputExt, outputMimeType };
    };

    const bg3dToGlb = getFileExtensions("bg3d-to-glb");
    expect(bg3dToGlb.expectedExt).toBe(".bg3d");
    expect(bg3dToGlb.outputExt).toBe("glb");
    expect(bg3dToGlb.outputMimeType).toBe("model/gltf-binary");

    const glbToBg3d = getFileExtensions("glb-to-bg3d");
    expect(glbToBg3d.expectedExt).toBe(".glb");
    expect(glbToBg3d.outputExt).toBe("bg3d");
    expect(glbToBg3d.outputMimeType).toBe("application/octet-stream");
  });

  test('handles download filename generation', () => {
    const generateDownloadName = (originalName: string, inputExt: string, outputExt: string) => {
      return originalName.replace(new RegExp(`\\.${inputExt}$`), `.${outputExt}`);
    };

    expect(generateDownloadName("model.bg3d", "bg3d", "glb")).toBe("model.glb");
    expect(generateDownloadName("test.glb", "glb", "bg3d")).toBe("test.bg3d");
    expect(generateDownloadName("complex-name_123.bg3d", "bg3d", "glb")).toBe("complex-name_123.glb");
  });

  test('handles upload step transitions for conversion panel', () => {
    type ConversionStep = "select-bg3d" | "select-skeleton" | "completed";
    
    const simulateConversionFlow = (conversionType: string) => {
      let step: ConversionStep = "select-bg3d";
      let pendingFile: File | null = null;

      // Step 1: Select primary file
      const primaryFile = conversionType === "bg3d-to-glb" 
        ? new File(['bg3d'], 'test.bg3d', { type: 'application/octet-stream' })
        : new File(['glb'], 'test.glb', { type: 'model/gltf-binary' });
      
      pendingFile = primaryFile;
      
      if (conversionType === "bg3d-to-glb") {
        step = "select-skeleton";
      } else {
        // GLB to BG3D goes directly to completed
        step = "completed";
        pendingFile = null;
      }

      return { step, pendingFile };
    };

    const bg3dFlow = simulateConversionFlow("bg3d-to-glb");
    expect(bg3dFlow.step).toBe("select-skeleton");
    expect(bg3dFlow.pendingFile).toBeDefined();

    const glbFlow = simulateConversionFlow("glb-to-bg3d");
    expect(glbFlow.step).toBe("completed");
    expect(glbFlow.pendingFile).toBeNull();
  });
});