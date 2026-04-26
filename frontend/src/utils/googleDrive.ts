import { ResultAsync } from "neverthrow";
import { mapErr } from "@/utils/mapErr";

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

  const uploadUrl =
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
  const fetchOptions: RequestInit = {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  };
  const response = await ResultAsync.fromPromise(
    fetch(uploadUrl, fetchOptions),
    mapErr,
  );
  if (response.isErr()) {
    return { error: response.error };
  }
  if (!response.value.ok) {
    const details = await response.value.text();
    return { error: `Upload failed (${response.value.status}): ${details}` };
  }
  const parsed = await ResultAsync.fromPromise(response.value.json(), mapErr);
  if (parsed.isErr()) {
    return { error: parsed.error };
  }
  const fileId = Reflect.get(parsed.value, "id");
  if (typeof fileId !== "string") {
    return {
      error: "Google Drive upload succeeded but no file id was returned.",
    };
  }
  return { fileId };
}

export async function downloadFileFromGoogleDrive(
  fileId: string,
  accessToken: string,
): Promise<{ blob: Blob; filename: string } | { error: string }> {
  const response = await ResultAsync.fromPromise(
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    mapErr,
  );
  if (response.isErr()) {
    return { error: response.error };
  }
  if (!response.value.ok) {
    const details = await response.value.text();
    return { error: `Download failed (${response.value.status}): ${details}` };
  }
  const blobResult = await ResultAsync.fromPromise(
    response.value.blob(),
    mapErr,
  );
  if (blobResult.isErr()) {
    return { error: blobResult.error };
  }

  const metadataResponse = await ResultAsync.fromPromise(
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    mapErr,
  );
  let filename = fileId;
  if (!metadataResponse.isErr() && metadataResponse.value.ok) {
    const metadata = await ResultAsync.fromPromise(
      metadataResponse.value.json(),
      mapErr,
    );
    if (!metadata.isErr()) {
      const name = Reflect.get(metadata.value, "name");
      if (typeof name !== "string" || name.length === 0)
        return { blob: blobResult.value, filename };
      filename = name;
    }
  }
  return { blob: blobResult.value, filename };
}
