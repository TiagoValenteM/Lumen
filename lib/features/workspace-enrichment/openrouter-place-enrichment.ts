type WorkspaceEnrichmentInput = {
  id: string;
  name: string;
  type: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  phone: string | null;
  description: string | null;
  short_description: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type WorkspaceEnrichmentResult = {
  suggested_fields: {
    core_details?: {
      name?: string | null;
      type?: "cafe" | "coworking" | "hotel_lobby" | "library" | "restaurant" | "other" | null;
      address?: string | null;
      city?: string | null;
      country?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    } | null;
    short_description?: string | null;
    description?: string | null;
    website?: string | null;
    phone?: string | null;
    opening_hours_note?: string | null;
    work_notes?: string[] | null;
    review_insights?: {
      summary: string | null;
      positives: string[] | null;
      cautions: string[] | null;
      remote_work_signal: string | null;
    } | null;
    work_details?: Record<string, string | number | boolean | null> | null;
  };
  field_sources: Record<string, string[]>;
  confidence: "low" | "medium" | "high";
  reviewer_notes: string;
};

type OpenRouterAnnotation = {
  type?: string;
  url_citation?: {
    url?: string;
    title?: string;
    content?: string;
  };
};

type OpenRouterChoice = {
  message?: {
    content?: string;
    annotations?: OpenRouterAnnotation[];
  };
};

type OpenRouterRequestMode = "schema" | "json";

const DEFAULT_PLACE_ENRICHMENT_MODEL = "openai/gpt-oss-20b:free";
const FREE_STRUCTURED_PLACE_ENRICHMENT_MODELS = [
  DEFAULT_PLACE_ENRICHMENT_MODEL,
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
];

export function getPlaceEnrichmentModel() {
  return process.env.OPENROUTER_PLACE_ENRICHMENT_MODEL || DEFAULT_PLACE_ENRICHMENT_MODEL;
}

const enrichmentSchema = {
  name: "lumen_workspace_enrichment",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["suggested_fields", "field_sources", "confidence", "reviewer_notes"],
    properties: {
      suggested_fields: {
        type: "object",
        additionalProperties: false,
        required: ["core_details", "short_description", "description", "website", "phone", "opening_hours_note", "work_notes", "review_insights", "work_details"],
        properties: {
          core_details: {
            type: ["object", "null"],
            additionalProperties: false,
            required: ["name", "type", "address", "city", "country", "latitude", "longitude"],
            properties: {
              name: { type: ["string", "null"] },
              type: { type: ["string", "null"], enum: ["cafe", "coworking", "hotel_lobby", "library", "restaurant", "other", null] },
              address: { type: ["string", "null"] },
              city: { type: ["string", "null"] },
              country: { type: ["string", "null"] },
              latitude: { type: ["number", "null"] },
              longitude: { type: ["number", "null"] },
            },
          },
          short_description: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          website: { type: ["string", "null"] },
          phone: { type: ["string", "null"] },
          opening_hours_note: { type: ["string", "null"] },
          work_notes: {
            type: ["array", "null"],
            items: { type: "string" },
          },
          review_insights: {
            type: ["object", "null"],
            additionalProperties: false,
            required: ["summary", "positives", "cautions", "remote_work_signal"],
            properties: {
              summary: { type: ["string", "null"] },
              positives: {
                type: ["array", "null"],
                items: { type: "string" },
              },
              cautions: {
                type: ["array", "null"],
                items: { type: "string" },
              },
              remote_work_signal: { type: ["string", "null"] },
            },
          },
          work_details: {
            type: ["object", "null"],
            additionalProperties: false,
            properties: {
              has_wifi: { type: ["boolean", "null"] },
              wifi_speed: { type: ["string", "null"], enum: ["slow", "moderate", "fast", "very_fast", null] },
              has_power_outlets: { type: ["boolean", "null"] },
              power_outlet_availability: { type: ["number", "null"] },
              seating_capacity: { type: ["number", "null"] },
              seating_comfort: { type: ["string", "null"], enum: ["uncomfortable", "adequate", "comfortable", "very_comfortable", null] },
              has_outdoor_seating: { type: ["boolean", "null"] },
              has_standing_desks: { type: ["boolean", "null"] },
              noise_level: { type: ["string", "null"], enum: ["quiet", "moderate", "loud", null] },
              music_volume: { type: ["number", "null"] },
              has_natural_light: { type: ["boolean", "null"] },
              has_air_conditioning: { type: ["boolean", "null"] },
              has_heating: { type: ["boolean", "null"] },
              has_restrooms: { type: ["boolean", "null"] },
              has_parking: { type: ["boolean", "null"] },
              has_bike_parking: { type: ["boolean", "null"] },
              is_accessible: { type: ["boolean", "null"] },
              allows_pets: { type: ["boolean", "null"] },
              has_food: { type: ["boolean", "null"] },
              has_veg: { type: ["boolean", "null"] },
              has_coffee: { type: ["boolean", "null"] },
              has_alcohol: { type: ["boolean", "null"] },
              price_range: { type: ["number", "null"] },
              laptop_friendly: { type: ["boolean", "null"] },
              time_limit_hours: { type: ["number", "null"] },
              minimum_purchase_required: { type: ["boolean", "null"] },
              good_for_meetings: { type: ["boolean", "null"] },
              good_for_calls: { type: ["boolean", "null"] },
              good_for_groups: { type: ["boolean", "null"] },
            },
          },
        },
      },
      field_sources: {
        type: "object",
        additionalProperties: {
          type: "array",
          items: { type: "string" },
        },
      },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      reviewer_notes: { type: "string" },
    },
  },
} as const;

export function buildWorkspaceEnrichmentSnapshot(workspace: WorkspaceEnrichmentInput) {
  return {
    id: workspace.id,
    name: workspace.name,
    type: workspace.type,
    address: workspace.address,
    city: workspace.city,
    country: workspace.country,
    website: workspace.website,
    phone: workspace.phone,
    description: workspace.description,
    short_description: workspace.short_description,
    latitude: workspace.latitude,
    longitude: workspace.longitude,
  };
}

export async function enrichWorkspaceWithOpenRouter(workspace: WorkspaceEnrichmentInput) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured.");

  const requestedModel = getPlaceEnrichmentModel();
  const models = Array.from(new Set([requestedModel, ...FREE_STRUCTURED_PLACE_ENRICHMENT_MODELS]));
  const errors: string[] = [];

  for (const model of models) {
    for (const mode of ["schema", "json"] as OpenRouterRequestMode[]) {
      try {
        return await requestOpenRouterEnrichment(apiKey, model, workspace, mode);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown OpenRouter error.";
        errors.push(`${model} (${mode}): ${message}`);
      }
    }
  }

  throw new Error(`OpenRouter enrichment failed after free-model fallbacks. ${errors.join(" | ")}`);
}

async function requestOpenRouterEnrichment(
  apiKey: string,
  model: string,
  workspace: WorkspaceEnrichmentInput,
  mode: OpenRouterRequestMode,
) {
  const plugins = [
    ...(mode === "schema" ? [{ id: "response-healing" }] : []),
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title": "Lumen workspace enrichment",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: [
            "You enrich pending Lumen workspace submissions for a human reviewer.",
            "Use web search when public verification would improve the suggestion, especially for address, website, opening hours, amenities, remote-work suitability, and review patterns.",
            "Prefer official websites, official social profiles, reputable directories, map/business profiles, and source pages that clearly refer to the exact place.",
            "Never infer amenities from generic cafe/coworking expectations. If the submitted data or public sources do not explicitly support a detail, return null for that detail.",
            "You may use public review snippets, source-provided review summaries, and reputable review pages to infer patterns, but do not copy individual review text verbatim.",
            "Do not scrape or reproduce Google Maps reviews. If Google review data is only visible as protected Maps content, summarize only high-level, source-attributed patterns or leave review_insights null.",
            "Do not suggest images or image URLs.",
            "Keep copy neutral, concise, and useful for remote workers. Mention uncertainty in reviewer_notes.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Find public information for this place when useful and suggest missing or improved fields.",
            workspace: buildWorkspaceEnrichmentSnapshot(workspace),
            output_rules: [
              "short_description should be one sentence under 160 characters.",
              "description should be 2-4 sentences and useful for deciding whether to work there.",
              "core_details should include corrected canonical name, workspace type, full address, city, country, and coordinates when source-backed for this exact place.",
              "For core_details.type, use only cafe, coworking, hotel_lobby, library, restaurant, or other.",
              "For core_details.latitude and longitude, only include coordinates when the source clearly points to the exact same place.",
              "work_notes should include only source-backed details relevant to laptop work, calls, meetings, seating, noise, outlets, WiFi, food, or stay duration.",
              "review_insights should summarize review patterns across public sources: positives, cautions, and any remote-work signal. Do not quote private/protected reviews.",
              "work_details should cover every known source-backed amenity/workability value: WiFi, outlets, seating, comfort, outdoor seating, standing desks, noise, music volume, natural light, climate, restrooms, parking, bike parking, accessibility, pets, food, vegetarian options, coffee, alcohol, price, laptop friendliness, time limits, minimum purchase, meetings, calls, and groups.",
              "Use null for any work_details field that is not clearly supported.",
              "For boolean work_details, true requires explicit support. false requires explicit contradiction. Otherwise use null.",
              "For numeric scales, only use a number when the source clearly supports it; otherwise null.",
              "Do not include images or image_candidates.",
              "field_sources values must list URLs used for each suggested field, or submitted_data when the value came only from the user's submission.",
              "Return JSON only. If the exact nested schema is hard, return root-level core_details, short_description, description, website, phone, work_notes, review_insights, and work_details.",
            ],
          }),
        },
      ],
      tools: [{ type: "openrouter:web_search" }],
      ...(plugins.length > 0 ? { plugins } : {}),
      provider: {
        require_parameters: true,
      },
      response_format: mode === "schema"
        ? {
            type: "json_schema",
            json_schema: enrichmentSchema,
          }
        : { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1800,
    }),
  });

  const rawResponse = await response.json();
  if (!response.ok) {
    const message = rawResponse?.error?.message || rawResponse?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  const choice = (rawResponse.choices?.[0] || {}) as OpenRouterChoice;
  const content = choice.message?.content;
  if (!content) throw new Error("OpenRouter returned an empty enrichment response.");

  return {
    model,
    result: parseEnrichmentContent(content),
    citations: extractCitations(choice.message?.annotations || []),
    rawResponse,
  };
}

function parseEnrichmentContent(content: string): WorkspaceEnrichmentResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("OpenRouter response was not valid JSON.");
    parsed = JSON.parse(jsonMatch[0]);
  }

  return normalizeEnrichmentResult(parsed);
}

function normalizeEnrichmentResult(value: unknown): WorkspaceEnrichmentResult {
  const candidate = isRecord(value) ? value : {};
  const suggestedSource = isRecord(candidate.suggested_fields) ? candidate.suggested_fields : candidate;
  const fieldSources = isRecord(candidate.field_sources)
    ? Object.fromEntries(
        Object.entries(candidate.field_sources).map(([key, sources]) => [
          key,
          Array.isArray(sources) ? sources.filter((source): source is string => typeof source === "string") : [],
        ]),
      )
    : {};

  return {
    suggested_fields: {
      core_details: normalizeCoreDetails(suggestedSource.core_details),
      short_description: getStringOrNull(suggestedSource.short_description),
      description: getStringOrNull(suggestedSource.description),
      website: getStringOrNull(suggestedSource.website),
      phone: getStringOrNull(suggestedSource.phone),
      opening_hours_note: getStringOrNull(suggestedSource.opening_hours_note),
      work_notes: Array.isArray(suggestedSource.work_notes)
        ? suggestedSource.work_notes.filter((note): note is string => typeof note === "string")
        : null,
      review_insights: normalizeReviewInsights(suggestedSource.review_insights),
      work_details: normalizeWorkDetails(suggestedSource.work_details),
    },
    field_sources: fieldSources,
    confidence:
      candidate.confidence === "medium" || candidate.confidence === "high" || candidate.confidence === "low"
        ? candidate.confidence
        : "low",
    reviewer_notes: typeof candidate.reviewer_notes === "string"
      ? candidate.reviewer_notes
      : "AI returned a partial response. Review all suggestions against the listed sources before approval.",
  };
}

function normalizeCoreDetails(value: unknown) {
  if (!isRecord(value)) return null;

  const type = getStringOrNull(value.type);
  const allowedTypes = new Set(["cafe", "coworking", "hotel_lobby", "library", "restaurant", "other"]);
  const latitude = getNumberOrNull(value.latitude);
  const longitude = getNumberOrNull(value.longitude);
  const normalized = {
    name: getStringOrNull(value.name),
    type: type && allowedTypes.has(type) ? type as "cafe" | "coworking" | "hotel_lobby" | "library" | "restaurant" | "other" : null,
    address: getStringOrNull(value.address),
    city: getStringOrNull(value.city),
    country: getStringOrNull(value.country),
    latitude,
    longitude,
  };

  return Object.values(normalized).some((detail) => detail !== null) ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getStringOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function getNumberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeWorkDetails(value: unknown) {
  if (!isRecord(value)) return null;

  const allowedKeys = new Set([
    "has_wifi",
    "wifi_speed",
    "has_power_outlets",
    "power_outlet_availability",
    "seating_capacity",
    "seating_comfort",
    "has_outdoor_seating",
    "has_standing_desks",
    "noise_level",
    "music_volume",
    "has_natural_light",
    "has_air_conditioning",
    "has_heating",
    "has_restrooms",
    "has_parking",
    "has_bike_parking",
    "is_accessible",
    "allows_pets",
    "has_food",
    "has_veg",
    "has_coffee",
    "has_alcohol",
    "price_range",
    "laptop_friendly",
    "time_limit_hours",
    "minimum_purchase_required",
    "good_for_meetings",
    "good_for_calls",
    "good_for_groups",
  ]);

  const normalized: Record<string, string | number | boolean | null> = {};
  for (const [key, detailValue] of Object.entries(value)) {
    if (!allowedKeys.has(key)) continue;
    if (
      typeof detailValue === "string" ||
      typeof detailValue === "number" ||
      typeof detailValue === "boolean" ||
      detailValue === null
    ) {
      normalized[key] = detailValue;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function normalizeReviewInsights(value: unknown) {
  if (!isRecord(value)) return null;

  const summary = getStringOrNull(value.summary);
  const positives = normalizeStringList(value.positives);
  const cautions = normalizeStringList(value.cautions);
  const remoteWorkSignal = getStringOrNull(value.remote_work_signal);

  if (!summary && !positives && !cautions && !remoteWorkSignal) return null;

  return {
    summary,
    positives,
    cautions,
    remote_work_signal: remoteWorkSignal,
  };
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) return null;
  const items = value
    .map(getStringOrNull)
    .filter((item): item is string => Boolean(item))
    .slice(0, 5);
  return items.length > 0 ? items : null;
}

function extractCitations(annotations: OpenRouterAnnotation[]) {
  return annotations
    .map((annotation) => annotation.url_citation)
    .filter((citation): citation is NonNullable<OpenRouterAnnotation["url_citation"]> => Boolean(citation?.url))
    .map((citation) => ({
      url: citation.url,
      title: citation.title || citation.url,
      content: citation.content || null,
    }));
}
