export function getWorkspaceDirections({ name, address, latitude, longitude }: {
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  const hasPin = typeof latitude === "number" && Math.abs(latitude) <= 90 &&
    typeof longitude === "number" && Math.abs(longitude) <= 180;
  const destination = hasPin ? `${latitude},${longitude}` : address?.trim() ? `${name}, ${address.trim()}` : null;
  return destination ? `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination })}` : null;
}
