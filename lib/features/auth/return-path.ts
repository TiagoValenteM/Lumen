export const ADD_PLACE_PATH = "/add-workspace";
export const WRITE_REVIEW_HASH = "#write-review";

export function workspaceReviewPath(city: string, workspace: string) {
  return `/cities/${encodeURIComponent(city)}/${encodeURIComponent(workspace)}${WRITE_REVIEW_HASH}`;
}

export function getAuthReturnPath(value: string | null) {
  if (value === ADD_PLACE_PATH) return value;
  const parts = value?.match(/^\/cities\/([^/?#]+)\/([^/?#]+)#write-review$/);
  if (!parts) return "/";

  try {
    const [city, place] = parts.slice(1).map(decodeURIComponent);
    const safeSlug = (slug: string) => /^[\p{L}\p{N}_-][\p{L}\p{N}._~-]*$/u.test(slug);
    return safeSlug(city) && safeSlug(place) ? workspaceReviewPath(city, place) : "/";
  } catch {
    return "/";
  }
}

export function authHref(page: "/login" | "/signup", returnTo: string) {
  const path = getAuthReturnPath(returnTo);
  return path === "/" ? page : `${page}?${new URLSearchParams({ redirect: path })}`;
}
