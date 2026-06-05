"use client";

import type { CityWorkspaceCollection } from "@/lib/features/cities/workspace-discovery";

type CityCollectionStripProps = {
  collections: CityWorkspaceCollection[];
  onSelect: (collection: CityWorkspaceCollection) => void;
};

export function CityCollectionStrip({ collections, onSelect }: CityCollectionStripProps) {
  if (!collections.length) return null;

  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {collections.map((collection) => (
        <button
          key={collection.label}
          type="button"
          className="rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
          onClick={() => onSelect(collection)}
        >
          <span className="text-sm font-medium">{collection.label}</span>
          <span className="mt-2 block text-2xl font-semibold tabular-nums">{collection.count}</span>
        </button>
      ))}
    </div>
  );
}
