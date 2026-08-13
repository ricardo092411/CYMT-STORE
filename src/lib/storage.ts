import { supabase } from "./supabase";

const PRODUCT_IMAGES_BUCKET = "product-images";

export type UploadedProductImage = {
  storageKey: string;
  publicUrl: string;
  originalFilename: string;
};

export function getProductImagePublicUrl(storageKey: string): string {
  const { data } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(storageKey);

  return data.publicUrl;
}

export async function uploadProductImage(file: File): Promise<UploadedProductImage> {
  const extension = file.name.split(".").pop();
  const storageKey = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(storageKey, file);

  if (error) {
    throw error;
  }

  return {
    storageKey,
    publicUrl: getProductImagePublicUrl(storageKey),
    originalFilename: file.name,
  };
}

export async function uploadProductImages(files: FileList): Promise<UploadedProductImage[]> {
  const uploadedImages: UploadedProductImage[] = [];

  for (const file of Array.from(files)) {
    uploadedImages.push(await uploadProductImage(file));
  }

  return uploadedImages;
}

export async function uploadImage(file: File): Promise<string> {
  const uploadedImage = await uploadProductImage(file);

  return uploadedImage.publicUrl;
}

export async function uploadImages(files: FileList): Promise<string[]> {
  const uploadedImages = await uploadProductImages(files);

  return uploadedImages.map((image) => image.publicUrl);
}
