import "server-only";

import { getCloudinaryClient } from "@/lib/cloudinary";
import { COUNTRY_IMAGE_FOLDER } from "@/lib/countries/validation";

/**
 * Delete a country image by public ID. The folder prefix is validated so a
 * caller can never delete assets outside `study-abroad/countries`.
 */
export async function deleteCountryImage(publicId: string): Promise<void> {
  if (!publicId.startsWith(`${COUNTRY_IMAGE_FOLDER}/`)) {
    throw new Error("Refusing to delete an image outside the countries folder.");
  }
  const client = getCloudinaryClient();
  await client.uploader.destroy(publicId, { invalidate: true });
}
