declare module "gltf-validator" {
  export interface ValidationMessage {
    severity: number;
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
  export interface ValidationResult { issues: ValidationIssues }
  export interface ValidationOptions {
    uri?: string;
    format?: string;
    externalResourceFunction?: (uri: string) => Promise<Uint8Array>;
    writeTimestamp?: boolean;
    maxIssues?: number;
    ignoredIssues?: string[];
    onlyIssues?: string[];
    severityOverrides?: Record<string, number>;
  }
  export function version(): string;
  export function supportedExtensions(): string[];
  export function validateBytes(data: Uint8Array, options?: ValidationOptions): Promise<ValidationResult>;
  export function validateString(json: string, options?: ValidationOptions): Promise<ValidationResult>;
}
