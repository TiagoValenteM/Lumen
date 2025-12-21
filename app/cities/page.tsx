"use client";

import { useState, useMemo } from "react";
import { citiesData } from "@/data/cities";
import { Input } from "@/components/ui/input";
import { Search, Building2 } from "lucide-react";

export default function CitiesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return citiesData;

    const query = searchQuery.toLowerCase();
    return citiesData
      .map((country) => {
        const countryMatches = country.name.toLowerCase().includes(query);
        const matchingCities = country.cities.filter((city) =>
          city.name.toLowerCase().includes(query)
        );

        // If country name matches, show all cities; otherwise show only matching cities
        return {
          ...country,
          cities: countryMatches ? country.cities : matchingCities,
        };
      })
      .filter((country) => country.cities.length > 0);
  }, [searchQuery]);

  const totalCities = useMemo(() => {
    return filteredData.reduce((acc, country) => acc + country.cities.length, 0);
  }, [filteredData]);

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Building2 className="h-10 w-10" />
            Cities
          </h1>
          <p className="text-muted-foreground">
            Explore {totalCities} cities across {filteredData.length} countries
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
                      className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center group"
                    >
                      <span className="group-hover:underline">{city.name}</span>
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
