const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

const MAX_DRIVER_ID_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_DRIVER_ID_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
]);

interface CloudinaryUploadResponse {
  public_id?: string;
  secure_url?: string;
  error?: {
    message?: string;
  };
}

export interface UploadedDriverIdImage {
  idImagePath: string;
  idImageUrl: string;
}

// Cloudinary Upload URL - validates public upload config and builds the unsigned upload endpoint.
function getCloudinaryUploadUrl() {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Driver document upload is not configured yet. Add the Cloudinary public env values and restart the app.');
  }

  return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
}

// Image MIME Resolver - prefers blob type and falls back to file extension for local image URIs.
function inferImageMimeType(imageUri: string, blobType: string) {
  if (blobType) {
    return blobType;
  }

  const normalizedUri = imageUri.toLowerCase();

  if (normalizedUri.endsWith('.png')) {
    return 'image/png';
  }

  if (normalizedUri.endsWith('.heic')) {
    return 'image/heic';
  }

  if (normalizedUri.endsWith('.heif')) {
    return 'image/heif';
  }

  return 'image/jpeg';
}

// Driver ID Filename - creates a stable upload filename with the correct image extension.
function getDriverIdFileName(uid: string, mimeType: string) {
  const extension = mimeType === 'image/png'
    ? 'png'
    : mimeType === 'image/heic'
      ? 'heic'
      : mimeType === 'image/heif'
        ? 'heif'
        : 'jpg';

  return `driver-id-${uid}-${Date.now()}.${extension}`;
}

// Driver ID Upload - validates the selected ID image and uploads it to Cloudinary for review.
export async function uploadDriverIdImage(uid: string, imageUri: string): Promise<UploadedDriverIdImage> {
  const validationResponse = await fetch(imageUri);

  if (!validationResponse.ok) {
    throw new Error('We could not read the selected ID image. Please choose the file again.');
  }

  const imageBlob = await validationResponse.blob();
  const mimeType = inferImageMimeType(imageUri, imageBlob.type);

  if (!ALLOWED_DRIVER_ID_IMAGE_TYPES.has(mimeType)) {
    throw new Error('Please upload a JPG, PNG, or HEIC image for driver verification.');
  }

  if (imageBlob.size > MAX_DRIVER_ID_IMAGE_BYTES) {
    throw new Error('The selected ID image is too large. Please use an image smaller than 5 MB.');
  }

  const formData = new FormData();
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET ?? '');
  formData.append('file', {
    uri: imageUri,
    type: mimeType,
    name: getDriverIdFileName(uid, mimeType),
  } as never);

  const uploadResponse = await fetch(getCloudinaryUploadUrl(), {
    method: 'POST',
    body: formData as any,
  });

  const payload = await uploadResponse.json() as CloudinaryUploadResponse;

  if (!uploadResponse.ok || !payload.secure_url || !payload.public_id) {
    throw new Error(payload.error?.message || 'Driver document upload failed. Please try again.');
  }

  return {
    idImagePath: payload.public_id,
    idImageUrl: payload.secure_url,
  };
}
