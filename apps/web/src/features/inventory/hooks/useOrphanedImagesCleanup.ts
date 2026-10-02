import { useEffect } from "react";
import { supabase } from "@/core/integrations/supabase/client";
import { getPathFromPublicUrl } from "@/core/utils/image";

/**
 * Runs orphaned product image cleanup asynchronously in the background.
 * Scoped to current user, runs at most once every 7 days.
 */
export function useOrphanedImagesCleanup(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const runCleanup = async () => {
      const LAST_RUN_KEY = `last_image_cleanup_${userId}`;
      const lastRun = localStorage.getItem(LAST_RUN_KEY);
      const now = Date.now();

      // Only run once every 7 days (weekly)
      const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      if (lastRun && now - parseInt(lastRun, 10) < ONE_WEEK_MS) {
        return;
      }

      try {
        // 1. Get all products for this user
        const { data: dbProducts } = await (supabase as any)
          .from("products")
          .select("image_url")
          .eq("user_id", userId);

        // 2. Extract referenced paths
        const referencedPaths = new Set<string>();
        (dbProducts as any[])?.forEach((p: any) => {
          if (p.image_url) {
            const path = getPathFromPublicUrl(p.image_url);
            if (path) {
              referencedPaths.add(path);
              if (path.endsWith(".webp")) {
                referencedPaths.add(path.replace(/\.webp$/, "_thumb.webp"));
              } else {
                const ext = path.split(".").pop();
                if (ext) {
                  referencedPaths.add(path.replace(`.${ext}`, `_thumb.webp`));
                }
              }
            }
          }
        });

        // 3. List all files in the user's storage folder
        const { data: files } = await supabase.storage
          .from("product-images")
          .list(userId, { limit: 1000 });

        if (!files || files.length === 0) return;

        const filesToDelete: string[] = [];
        const oneHourAgo = now - 60 * 60 * 1000; // 1 hour safety margin

        files.forEach((file) => {
          if (file.name === ".emptyFolderPlaceholder") return;

          const filePath = `${userId}/${file.name}`;

          if (!referencedPaths.has(filePath)) {
            const fileCreatedAt = file.created_at
              ? new Date(file.created_at).getTime()
              : 0;
            if (fileCreatedAt < oneHourAgo) {
              filesToDelete.push(filePath);
            }
          }
        });

        if (filesToDelete.length > 0) {
          console.log(
            `[Cleanup] Deleting ${filesToDelete.length} orphaned images...`
          );
          await supabase.storage.from("product-images").remove(filesToDelete);
        }

        localStorage.setItem(LAST_RUN_KEY, now.toString());
      } catch (err) {
        console.error("[Cleanup] Failed to clean orphaned images:", err);
      }
    };

    runCleanup();
  }, [userId]);
}
