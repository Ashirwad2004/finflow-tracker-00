/**
 * Returns the thumbnail URL from a product image URL.
 * If the image is a WebP image, we replace it with `_thumb.webp`.
 */
export const getThumbnailUrl = (url: string | null | undefined): string => {
    if (!url) return "";
    if (url.includes("_thumb.webp")) return url;
    if (url.endsWith(".webp")) {
        return url.replace(/\.webp$/, "_thumb.webp");
    }
    return url;
};

/**
 * Extracts the storage path from a Supabase public storage URL.
 * E.g., extracts "user_id/12345.webp" from "https://.../product-images/user_id/12345.webp".
 */
export const getPathFromPublicUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    try {
        const parts = url.split("/product-images/");
        if (parts.length > 1) {
            return decodeURIComponent(parts[1]);
        }
    } catch (e) {
        console.error("Failed to parse image URL:", url, e);
    }
    return null;
};

/**
 * Compresses an image file on the client side and converts it to WebP format.
 */
export const compressAndConvertToWebP = (file: File, maxWidth: number, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                // Scale down if width exceeds maxWidth
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Failed to get canvas 2d context"));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error("Failed to convert image to WebP blob"));
                        }
                    },
                    "image/webp",
                    quality
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};