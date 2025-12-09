/**
 * Node.js bridge to Python rsrcdump for perfect byte-for-byte accuracy
 * This bypasses Pyodide and uses actual Python directly
 */

import { spawn } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

/**
 * Convert skeleton resource JSON to binary using Python rsrcdump
 * @param jsonData The skeleton resource as JSON
 * @param structSpecs The struct specifications for rsrcdump
 * @returns Promise<ArrayBuffer> The binary skeleton file
 */
export async function loadBytesFromJsonPython(
  jsonData: unknown,
  structSpecs: string[] = [],
): Promise<ArrayBuffer> {
  // Create temporary files
  const tmpJsonPath = join(tmpdir(), `skeleton-${Date.now()}.json`);
  const tmpBinPath = join(tmpdir(), `skeleton-${Date.now()}.rsrc`);

  try {
    // Write JSON to temp file
    writeFileSync(tmpJsonPath, JSON.stringify(jsonData));

    // Build Python command
    const pythonScript = `
import json
import sys
import rsrcdump

# Read JSON from file
with open('${tmpJsonPath.replace(/\\/g, "\\\\")}', 'r') as f:
    json_blob = json.load(f)

# Convert to binary
binary_data = rsrcdump.load_bytes_from_json(
    json_blob,
    ${JSON.stringify(structSpecs)},
    [],
    [],
    True
)

# Write binary to file
with open('${tmpBinPath.replace(/\\/g, "\\\\")}', 'wb') as f:
    f.write(binary_data)

print("SUCCESS")
`;

    // Execute Python script
    return new Promise((resolve, reject) => {
      const python = spawn("python3", ["-c", pythonScript]);

      let stdout = "";
      let stderr = "";

      python.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      python.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      python.on("close", (code) => {
        try {
          if (code !== 0) {
            reject(
              new Error(
                `Python process exited with code ${code}\nSTDERR: ${stderr}\nSTDOUT: ${stdout}`,
              ),
            );
            return;
          }

          if (!stdout.includes("SUCCESS")) {
            reject(
              new Error(
                `Python script did not complete successfully\nSTDERR: ${stderr}\nSTDOUT: ${stdout}`,
              ),
            );
            return;
          }

          // Read the generated binary file
          const binaryData = readFileSync(tmpBinPath);
          resolve(binaryData.buffer);
        } catch (error) {
          reject(error);
        } finally {
          // Clean up temp files
          try {
            try {
              unlinkSync(tmpJsonPath);
            } catch (e) {
              console.warn("Failed to unlink tmpJsonPath:", e);
            }
          } catch (e) {
            console.warn("Error during cleanup of tmpJsonPath:", e);
          }
          try {
            unlinkSync(tmpBinPath);
          } catch (e) {
            console.warn("Failed to unlink tmpBinPath:", e);
          }
        }
      });

      python.on("error", (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  } catch (error) {
    // Clean up on error
    try {
      unlinkSync(tmpJsonPath);
    } catch (e) {
      console.warn("Failed to unlink tmpJsonPath on error:", e);
    }
    try {
      unlinkSync(tmpBinPath);
    } catch (e) {
      console.warn("Failed to unlink tmpBinPath on error:", e);
    }
    throw error;
  }
}

/**
 * Parse skeleton resource binary to JSON using Python rsrcdump
 * @param binaryData The binary skeleton file
 * @param structSpecs The struct specifications for rsrcdump
 * @returns Promise<any> The parsed skeleton resource as JSON
 */
export async function saveToJsonPython(
  binaryData: ArrayBuffer,
  structSpecs: string[] = [],
): Promise<unknown> {
  // Create temporary files
  const tmpBinPath = join(tmpdir(), `skeleton-${Date.now()}.rsrc`);
  const tmpJsonPath = join(tmpdir(), `skeleton-${Date.now()}.json`);

  try {
    // Write binary to temp file
    writeFileSync(tmpBinPath, new Uint8Array(binaryData));

    // Build Python command
    const pythonScript = `
import json
import rsrcdump

# Read binary from file
with open('${tmpBinPath.replace(/\\/g, "\\\\")}', 'rb') as f:
    binary_data = f.read()

# Convert to JSON
json_str = rsrcdump.save_to_json(
    binary_data,
    ${JSON.stringify(structSpecs)},
    [],
    []
)

# Parse and write JSON to file
json_obj = json.loads(json_str)
with open('${tmpJsonPath.replace(/\\/g, "\\\\")}', 'w') as f:
    json.dump(json_obj, f)

print("SUCCESS")
`;

    // Execute Python script
    return new Promise((resolve, reject) => {
      const python = spawn("python3", ["-c", pythonScript]);

      let stdout = "";
      let stderr = "";

      python.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      python.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      python.on("close", (code) => {
        try {
          if (code !== 0) {
            reject(
              new Error(
                `Python process exited with code ${code}\nSTDERR: ${stderr}\nSTDOUT: ${stdout}`,
              ),
            );
            return;
          }

          if (!stdout.includes("SUCCESS")) {
            reject(
              new Error(
                `Python script did not complete successfully\nSTDERR: ${stderr}\nSTDOUT: ${stdout}`,
              ),
            );
            return;
          }

          // Read the generated JSON file
          const jsonData = JSON.parse(readFileSync(tmpJsonPath, "utf-8"));
          resolve(jsonData);
        } catch (error) {
          reject(error);
        } finally {
          // Clean up temp files
          try {
            unlinkSync(tmpBinPath);
          } catch (e) {
            console.warn("Failed to unlink tmpBinPath:", e);
          }
          try {
            unlinkSync(tmpJsonPath);
          } catch (e) {
            console.warn("Failed to unlink tmpJsonPath:", e);
          }
        }
      });

      python.on("error", (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  } catch (error) {
    // Clean up on error
    try {
      unlinkSync(tmpBinPath);
    } catch (e) {
      console.warn("Failed to unlink tmpBinPath on error:", e);
    }
    try {
      unlinkSync(tmpJsonPath);
    } catch (e) {
      console.warn("Failed to unlink tmpJsonPath on error:", e);
    }
    throw error;
  }
}
