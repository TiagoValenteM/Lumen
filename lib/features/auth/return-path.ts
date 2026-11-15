export function getAuthReturnPath(search: string) {
  const path = new URLSearchParams(search).get("redirect") ?? "";
  if (path === "/add-workspace") return path;
  if (/^\/cities\/[\w%.-]+\/[\w%.-]+#write-review$/.test(path) && !path.split("/").some((part) => /^(?:\.|%2e){1,2}(?:#|$)/i.test(part))) return path;
  return "/";
}
