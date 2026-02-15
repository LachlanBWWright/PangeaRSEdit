import { fromPromise } from "@/types/result";

export async function uploadFileToGoogleDrive(
  file: File,
  accessToken: string,
): Promise<{ fileId: string } | { error: string }> {
  const metadata = {
    name: file.name,
  };
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  form.append("file", file);

  const response = await fromPromise(
    fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }),
  );
  if (response.isErr()) {
    return { error: response.error.message };
  }
  if (!response.value.ok) {
    const details = await response.value.text();
    return { error: `Upload failed (${response.value.status}): ${details}` };
  }
  const parsed = await fromPromise(response.value.json());
  if (parsed.isErr()) {
    return { error: parsed.error.message };
  }
  const fileId = Reflect.get(parsed.value, "id");
  if (typeof fileId !== "string") {
    return { error: "Google Drive upload succeeded but no file id was returned." };
  }
  return { fileId };
}

export async function downloadFileFromGoogleDrive(
  fileId: string,
  accessToken: string,
): Promise<{ blob: Blob; filename: string } | { error: string }> {
  const response = await fromPromise(
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  );
  if (response.isErr()) {
    return { error: response.error.message };
  }
  if (!response.value.ok) {
    const details = await response.value.text();
    return { error: `Download failed (${response.value.status}): ${details}` };
  }
  const blobResult = await fromPromise(response.value.blob());
  if (blobResult.isErr()) {
    return { error: blobResult.error.message };
  }

  const metadataResponse = await fromPromise(
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  );
  let filename = fileId;
  if (!metadataResponse.isErr() && metadataResponse.value.ok) {
    const metadata = await fromPromise(metadataResponse.value.json());
    if (!metadata.isErr()) {
      const name = Reflect.get(metadata.value, "name");
      if (typeof name === "string" && name.length > 0) {
        filename = name;
      }
    }
  }
  return { blob: blobResult.value, filename };
}
