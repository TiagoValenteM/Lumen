export type UserWorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  city_slug: string | null;
  city_name: string | null;
  status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  rejection_reason?: string | null;
  short_description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};
