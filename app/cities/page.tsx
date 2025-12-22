"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, Building2, Loader2 } from "lucide-react";

interface City {
  id: string;
  name: string;
  slug: string;
  country: string;
  workspace_count: number;
}

interface CountryGroup {
  name: string;
  cities: City[];
}

export default function CitiesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [workspaceCounts, setWorkspaceCounts] = useState<Record<string, number>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchCities() {
      setLoading(true);
      const { data: cityData, error: cityError } = await supabase
        .from("cities")
        .select("id, name, slug, country, workspace_count")
        .order("country", { ascending: true })
        .order("name", { ascending: true });

      if (cityData && !cityError) {
        setCities(cityData);

        // Fetch live workspace counts grouped by city from approved workspaces
        const { data: workspaceData } = await supabase
          .from("workspaces")
          .select("city_id")
          .eq("status", "approved");

        if (workspaceData) {
          const counts = workspaceData.reduce<Record<string, number>>(
            (acc, row) => {
              if (!row.city_id) return acc;
              acc[row.city_id] = (acc[row.city_id] || 0) + 1;
              return acc;
            },
            {}
          );
          setWorkspaceCounts(counts);
        }
      }
      setLoading(false);
    }

    fetchCities();
  }, [supabase]);

  const groupedByCountry = useMemo(() => {
    const groups: Record<string, City[]> = {};
    cities.forEach((city) => {
      if (!groups[city.country]) {
        groups[city.country] = [];
      }
      groups[city.country].push(city);
    });
    return Object.entries(groups).map(([country, countryCities]) => ({
      name: country,
      cities: countryCities,
    }));
  }, [cities]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return groupedByCountry;

    const query = searchQuery.toLowerCase();
    return groupedByCountry
      .map((country) => {
        const countryMatches = country.name.toLowerCase().includes(query);
        const matchingCities = country.cities.filter((city) =>
          city.name.toLowerCase().includes(query)
        );

        return {
          ...country,
          cities: countryMatches ? country.cities : matchingCities,
        };
      })
      .filter((country) => country.cities.length > 0);
  }, [searchQuery, groupedByCountry]);

  const totalWorkspaces = useMemo(() => {
    return filteredData.reduce((acc, country) => {
      return (
        acc +
        country.cities.reduce((cityAcc, city) => {
          const count = workspaceCounts[city.id] ?? city.workspace_count ?? 0;
          return cityAcc + count;
        }, 0)
      );
    }, 0);
  }, [filteredData, workspaceCounts]);

  const totalCities = useMemo(() => {
    return filteredData.reduce((acc, country) => acc + country.cities.length, 0);
  }, [filteredData]);

  if (loading) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading cities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Building2 className="h-10 w-10" />
            Cities
          </h1>
          <p className="text-muted-foreground">
            Explore {totalCities} cities with {totalWorkspaces} workspaces across {filteredData.length} countries
          </p>
        </div>

        <div className="mb-8 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search cities or countries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredData.map((country) => (
            <div
              key={country.name}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                {country.name}
              </h2>
              <ul className="space-y-2">
                {country.cities.map((city) => (
                  <li key={city.slug}>
                    <a
                      href={`/cities/${city.slug}`}
                      className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center justify-between group w-full"
                    >
                      <span className="group-hover:underline">{city.name}</span>
                      {(workspaceCounts[city.id] ?? city.workspace_count ?? 0) > 0 && (
                        <span className="text-xs text-muted-foreground/60">
                          {workspaceCounts[city.id] ?? city.workspace_count ?? 0}
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              No cities found matching "{searchQuery}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
