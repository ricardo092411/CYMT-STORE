import { supabase } from "./supabase";

export async function uploadImage(file: File): Promise<string> {
  const extension = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(fileName, file);

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

export async function uploadImages(files: FileList): Promise<string[]> {
  const urls: string[] = [];

  for (const file of Array.from(files)) {
    const url = await uploadImage(file);
    urls.push(url);
  }

  return urls;
}