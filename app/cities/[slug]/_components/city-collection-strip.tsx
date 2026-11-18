"use client";

import type { CityWorkspaceCollection } from "@/lib/features/cities/workspace-discovery";

type CityCollectionStripProps = {
  collections: CityWorkspaceCollection[];
  onSelect: (collection: CityWorkspaceCollection) => void;
};

export function CityCollectionStrip({ collections, onSelect }: CityCollectionStripProps) {
  if (!collections.length) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-2 sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
      {collections.map((collection) => (
        <button
          key={collection.label}
          type="button"
          className="flex min-h-11 items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 sm:block sm:p-4"
          onClick={() => onSelect(collection)}
        >
          <span className="text-sm font-medium">{collection.label}</span>
          <span className="font-semibold tabular-nums sm:mt-2 sm:block sm:text-2xl">{collection.count}</span>
        </button>
      ))}
    </div>
  );
}
