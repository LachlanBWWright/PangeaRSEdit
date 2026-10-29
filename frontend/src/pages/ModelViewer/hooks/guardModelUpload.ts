import type { UseFileUploadOptions } from "./useFileUpload";

export interface CurrentUploadOptions extends UseFileUploadOptions {
  isCurrent: () => boolean;
}

function guarded<T>(isCurrent: () => boolean, commit: (value: T) => void) {
  return (value: T) => { if (isCurrent()) commit(value); };
}

export function guardModelUpload(options: UseFileUploadOptions, isCurrent: () => boolean): CurrentUploadOptions {
  return { isCurrent,
    onGltfUrlChange: (url) => { if (isCurrent()) options.onGltfUrlChange(url); else URL.revokeObjectURL(url); },
    onGltfBufferChange: guarded(isCurrent, options.onGltfBufferChange),
    onBg3dParsedChange: guarded(isCurrent, options.onBg3dParsedChange),
    onTexturesChange: guarded(isCurrent, options.onTexturesChange),
    onLoadingChange: guarded(isCurrent, options.onLoadingChange),
    onUploadStepChange: guarded(isCurrent, options.onUploadStepChange),
  };
}
