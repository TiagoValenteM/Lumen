import { createClient } from "@/lib/supabase/client";

/**
 * Resolves avatar URL from storage path or returns full URL if already absolute
 */
export function resolveAvatarUrl(avatarPath: string | null): string | null {
  if (!avatarPath) return null;
  if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {
    return avatarPath;
  }
  const supabase = createClient();
  const { data } = supabase.storage.from("avatars").getPublicUrl(avatarPath);
  return data.publicUrl ?? null;
}

/**
 * Gets display name from profile data with fallback chain
 */
export function getDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  tag: string | null | undefined,
  email: string | null | undefined
): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  return tag || email || "User";
}

/**
 * Gets initials from display name (first 2 characters of first 2 words)
 */
export function getInitials(displayName: string): string {
  return displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2) || "U";
}
