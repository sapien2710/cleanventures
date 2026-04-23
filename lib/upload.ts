import { API_BASE, getAccessToken } from "./api-client";

/**
 * Upload a local image URI to the backend.
 * @param localUri  - The local file URI from expo-image-picker (e.g. file:///...)
 * @param type      - "venture-image" or "avatar"
 * @returns         - The public URL of the uploaded image
 */
export async function uploadImage(
  localUri: string,
  type: "venture-image" | "avatar"
): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  // Determine filename and mime type from URI
  const filename = localUri.split("/").pop() ?? "image.jpg";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const formData = new FormData();
  // React Native's FormData accepts { uri, name, type } objects
  formData.append("file", {
    uri: localUri,
    name: filename,
    type: mimeType,
  } as any);

  const endpoint = type === "avatar" ? "/upload/avatar" : "/upload/venture-image";

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Do NOT set Content-Type — fetch sets it automatically with boundary for multipart
    },
    body: formData,
  });

  if (!response.ok) {
    let msg = `Upload failed (${response.status})`;
    try {
      const err = await response.json();
      msg = err.error ?? msg;
    } catch {}
    throw new Error(msg);
  }

  const { url } = await response.json();
  return url as string;
}
