const CLOUDINARY_MISSING_CONFIG_ERROR = "Cloudinary configuration missing";

export const CLOUDINARY_ROOT_FOLDER = "bowen_web";
export const CLOUDINARY_PHOTOS_FOLDER = `${CLOUDINARY_ROOT_FOLDER}/photos`;
export const CLOUDINARY_ALBUM_COVERS_FOLDER = `${CLOUDINARY_ROOT_FOLDER}/album-covers`;

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(CLOUDINARY_MISSING_CONFIG_ERROR);
  }

  return { cloudName, apiKey, apiSecret };
}

async function sha1Hex(value) {
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(value);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  const { createHash } = await import("node:crypto");
  return createHash("sha1").update(value).digest("hex");
}

async function signCloudinaryParams(params, apiSecret) {
  const sortedEntries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => [key, String(value)])
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  const valueToSign =
    sortedEntries.map(([key, value]) => `${key}=${value}`).join("&") + apiSecret;

  return sha1Hex(valueToSign);
}

function appendFormValue(formData, key, value) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  formData.append(key, String(value));
}

function buildUploadEndpoint(cloudName, action) {
  return `https://api.cloudinary.com/v1_1/${cloudName}/image/${action}`;
}

export async function uploadCloudinaryImage({
  file,
  fileName,
  folder = CLOUDINARY_PHOTOS_FOLDER,
  publicId,
  overwrite,
} = {}) {
  if (!file) {
    throw new Error("Cloudinary upload file is required");
  }

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.round(Date.now() / 1000).toString();
  const signedParams = {
    folder,
    public_id: publicId,
    overwrite: overwrite ? "true" : undefined,
    timestamp,
  };
  const signature = await signCloudinaryParams(signedParams, apiSecret);
  const formData = new FormData();

  if (typeof file === "string") {
    formData.append("file", file);
  } else if (fileName) {
    formData.append("file", file, fileName);
  } else {
    formData.append("file", file);
  }

  appendFormValue(formData, "api_key", apiKey);
  appendFormValue(formData, "timestamp", timestamp);
  appendFormValue(formData, "signature", signature);
  appendFormValue(formData, "folder", folder);
  appendFormValue(formData, "public_id", publicId);
  appendFormValue(formData, "overwrite", overwrite ? "true" : undefined);

  const response = await fetch(buildUploadEndpoint(cloudName, "upload"), {
    method: "POST",
    body: formData,
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message || "Cloudinary upload failed");
  }

  return {
    url: payload.secure_url,
    publicId: payload.public_id,
    raw: payload,
  };
}

export async function destroyCloudinaryImage(publicId) {
  if (!publicId) {
    throw new Error("Cloudinary public id is required");
  }

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.round(Date.now() / 1000).toString();
  const signedParams = {
    public_id: publicId,
    timestamp,
  };
  const signature = await signCloudinaryParams(signedParams, apiSecret);
  const formData = new FormData();

  appendFormValue(formData, "api_key", apiKey);
  appendFormValue(formData, "public_id", publicId);
  appendFormValue(formData, "timestamp", timestamp);
  appendFormValue(formData, "signature", signature);

  const response = await fetch(buildUploadEndpoint(cloudName, "destroy"), {
    method: "POST",
    body: formData,
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message || "Cloudinary delete failed");
  }

  return payload;
}

export function isCloudinaryConfigured() {
  try {
    getCloudinaryConfig();
    return true;
  } catch {
    return false;
  }
}

export function isCloudinaryUrl(url) {
  return typeof url === "string" && /https?:\/\/res\.cloudinary\.com\//.test(url);
}

export function parseCloudinaryPublicId(url) {
  if (!isCloudinaryUrl(url)) {
    return null;
  }

  try {
    const { pathname } = new URL(url);
    const segments = pathname.split("/").filter(Boolean);
    const uploadIndex = segments.indexOf("upload");

    if (uploadIndex === -1) {
      return null;
    }

    const assetSegments = segments.slice(uploadIndex + 1);

    if (assetSegments[0]?.startsWith("v")) {
      assetSegments.shift();
    }

    if (assetSegments.length === 0) {
      return null;
    }

    const lastSegment = assetSegments.pop();
    const extensionIndex = lastSegment.lastIndexOf(".");
    const normalizedLastSegment =
      extensionIndex === -1 ? lastSegment : lastSegment.slice(0, extensionIndex);

    return [...assetSegments, normalizedLastSegment].join("/");
  } catch {
    return null;
  }
}

export { CLOUDINARY_MISSING_CONFIG_ERROR };
