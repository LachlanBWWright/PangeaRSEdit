declare module "gltf-validator" {
  export interface ValidationMessage {
    severity: number; // 1=Error,2=Warning,3=Info,4=Hint
    code: string;
    message: string;
    pointer?: string;
    offset?: number;
  }

  export interface ValidationIssues {
    numErrors: number;
    numWarnings: number;
    numInfos: number;
    numHints: number;
    messages: ValidationMessage[];
  }

  export interface ValidationResult {
    issues: ValidationIssues;
    // other properties exist but are not needed for the tests
  }

  // Returns a version string.
  export function version(): string;

  // Returns an array of supported extension names.
  export function supportedExtensions(): string[];

  // External resource loader signature
  export type ExternalResourceFunction = (uri: string) => Promise<Uint8Array>;

  // Validation options
  export interface ValidationOptions {
    uri?: string; // Absolute or relative asset URI that will be copied to validation report.
    format?: string; // 'glb' or 'gltf' to skip auto-detection; other values ignored.
    externalResourceFunction?: ExternalResourceFunction; // Function for loading external resources.
    writeTimestamp?: boolean; // default true
    maxIssues?: number; // 0 for unlimited
    ignoredIssues?: string[];
    onlyIssues?: string[]; // cannot be used with ignoredIssues
    severityOverrides?: { [issueCode: string]: number };
  }

  // Validate bytes (Uint8Array) with optional options
  export function validateBytes(
    data: Uint8Array,
    options?: ValidationOptions,
  ): Promise<ValidationResult>;

  // Validate a JSON string representing a glTF
  export function validateString(
    json: string,
    options?: ValidationOptions,
  ): Promise<ValidationResult>;
}
