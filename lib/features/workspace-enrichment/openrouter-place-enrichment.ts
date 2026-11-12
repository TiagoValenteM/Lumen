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
  field_evidence: Record<string, {
    confidence: "low" | "medium" | "high";
    basis: "confirmed" | "review_signal" | "likely" | "unknown" | "conflicting";
    source_quality: "official" | "directory" | "review_pattern" | "submitted_data" | "model_knowledge" | "unknown";
    evidence: string | null;
    source: string | null;
  }>;
  unknown_fields: string[];
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
export type PlaceEnrichmentMode = "full" | "no_web" | "text_only" | "details_only";
type OpenRouterAttempt = {
  mode: OpenRouterRequestMode;
  webSearch: boolean;
  requireParameters: boolean;
};

const DEFAULT_PLACE_ENRICHMENT_MODEL = "openai/gpt-oss-20b:free";
const FREE_STRUCTURED_PLACE_ENRICHMENT_MODELS = [
  DEFAULT_PLACE_ENRICHMENT_MODEL,
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-nano-9b-v2:free",
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
    required: ["suggested_fields", "field_evidence", "unknown_fields", "field_sources", "confidence", "reviewer_notes"],
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
      field_evidence: {
        type: "object",
        additionalProperties: {
          type: "object",
          additionalProperties: false,
          required: ["confidence", "basis", "source_quality", "evidence", "source"],
          properties: {
            confidence: { type: "string", enum: ["low", "medium", "high"] },
            basis: { type: "string", enum: ["confirmed", "review_signal", "likely", "unknown", "conflicting"] },
            source_quality: { type: "string", enum: ["official", "directory", "review_pattern", "submitted_data", "model_knowledge", "unknown"] },
            evidence: { type: ["string", "null"] },
            source: { type: ["string", "null"] },
          },
        },
      },
      unknown_fields: {
        type: "array",
        items: { type: "string" },
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

export async function enrichWorkspaceWithOpenRouter(
  workspace: WorkspaceEnrichmentInput,
  enrichmentMode: PlaceEnrichmentMode = "full",
) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured.");

  const requestedModel = getPlaceEnrichmentModel();
  const models = Array.from(new Set([
    ...(FREE_STRUCTURED_PLACE_ENRICHMENT_MODELS.includes(requestedModel) ? [requestedModel] : []),
    ...FREE_STRUCTURED_PLACE_ENRICHMENT_MODELS,
  ]));
  const attempts = buildAttemptsForMode(enrichmentMode);
  const errors: string[] = [];
  const deadline = performance.now() + 95_000;

  modelLoop: for (const model of models) {
    for (const attempt of attempts) {
      const remaining = Math.floor(deadline - performance.now());
      if (remaining <= 0) break modelLoop;
      try {
        return await requestOpenRouterEnrichment(
          apiKey, model, workspace, attempt, enrichmentMode, AbortSignal.timeout(Math.min(remaining, 18_000)),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown OpenRouter error.";
        errors.push(`${model} (${formatAttempt(attempt)}): ${message}`);
      }
    }
  }

  throw new Error(
    `OpenRouter enrichment failed after structured free-model fallbacks. Last errors: ${summarizeOpenRouterErrors(errors)}`,
  );
}

async function requestOpenRouterEnrichment(
  apiKey: string,
  model: string,
  workspace: WorkspaceEnrichmentInput,
  attempt: OpenRouterAttempt,
  enrichmentMode: PlaceEnrichmentMode,
  signal: AbortSignal,
) {
  const plugins = [
    ...(attempt.mode === "schema" ? [{ id: "response-healing" }] : []),
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal,
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
            attempt.webSearch
              ? "Use web search when public verification would improve the suggestion, especially for address, website, opening hours, amenities, remote-work suitability, and review patterns."
              : "Web search is unavailable for this fallback attempt. Use submitted data and only high-confidence general public knowledge; mark uncertain amenities as unknown.",
            "Prefer official websites, official social profiles, reputable directories, map/business profiles, and source pages that clearly refer to the exact place.",
            "Never infer amenities from generic cafe/coworking expectations. Use null when there is no submitted data, public fact, directory signal, or repeated review pattern for a detail.",
            "You may use public review snippets, source-provided review summaries, and reputable review pages to infer patterns, but do not copy individual review text verbatim.",
            "Do not scrape or reproduce Google Maps reviews. If Google review data is only visible as protected Maps content, summarize only high-level, source-attributed patterns or leave review_insights null.",
            "Do not suggest images or image URLs.",
            "Keep copy neutral, concise, and useful for remote workers. Every non-null suggestion must have field_evidence with confidence, basis, source_quality, evidence, and source.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            task: getTaskForMode(enrichmentMode),
            workspace: buildWorkspaceEnrichmentSnapshot(workspace),
            output_rules: [
              getScopeRuleForMode(enrichmentMode),
              "short_description should be one sentence under 160 characters.",
              "description should be 2-4 sentences and useful for deciding whether to work there.",
              "core_details should include corrected canonical name, workspace type, full address, city, country, and coordinates when source-backed for this exact place.",
              "For core_details.type, use only cafe, coworking, hotel_lobby, library, restaurant, or other.",
              "For core_details.latitude and longitude, only include coordinates when the source clearly points to the exact same place.",
              "work_notes should include only source-backed details relevant to laptop work, calls, meetings, seating, noise, outlets, WiFi, food, or stay duration.",
              "review_insights should summarize review patterns across public sources: positives, cautions, and any remote-work signal. Do not quote private/protected reviews.",
              "work_details should cover every known source-backed amenity/workability value: WiFi, outlets, seating, comfort, outdoor seating, standing desks, noise, music volume, natural light, climate, restrooms, parking, bike parking, accessibility, pets, food, vegetarian options, coffee, alcohol, price, laptop friendliness, time limits, minimum purchase, meetings, calls, and groups.",
              "If a work_note mentions WiFi, outlets, quiet spaces, reading rooms, laptop/study suitability, food/drink rules, coffee, outdoor seating, calls, meetings, or groups, map that same information into the matching work_details field instead of leaving it only as text.",
              "For boolean work_details, true can be high confidence from an official source or medium confidence from repeated reputable directory/review signals. false requires explicit contradiction or repeated negative signals. Otherwise use null.",
              "For numeric scales, use conservative values only when there is direct evidence or a strong repeated signal; otherwise null.",
              "For common cafe signals such as WiFi, outlets, laptop friendliness, seating, noise, food, coffee, and outdoor seating, prefer a low or medium confidence suggestion over null when review/directory patterns support it.",
              "Do not include images or image_candidates.",
              "field_evidence keys must use dot paths such as core_details.address, short_description, website, work_details.has_wifi, review_insights.summary.",
              "field_evidence.basis must be confirmed for official/direct facts, review_signal for public review or directory patterns, likely for weak but useful patterns, unknown when leaving null, and conflicting when sources disagree.",
              "field_evidence.source_quality must be official, directory, review_pattern, submitted_data, model_knowledge, or unknown.",
              "unknown_fields should list important fields that remain null or unclear, especially WiFi, outlets, laptop friendliness, seating, and noise.",
              attempt.webSearch
                ? "field_sources values must list URLs used for each suggested field, or submitted_data when the value came only from the user's submission."
                : "field_sources values must use submitted_data for submitted facts, model_knowledge for high-confidence general knowledge, or unknown when no evidence exists.",
              "Return JSON only. If the exact nested schema is hard, still include suggested_fields, field_evidence, unknown_fields, field_sources, confidence, and reviewer_notes.",
            ],
          }),
        },
      ],
      ...(attempt.webSearch ? { tools: [{ type: "openrouter:web_search" }] } : {}),
      ...(plugins.length > 0 ? { plugins } : {}),
      ...(attempt.requireParameters
        ? {
            provider: {
              require_parameters: true,
            },
          }
        : {}),
      response_format: attempt.mode === "schema"
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
  const fieldEvidence = normalizeFieldEvidence(candidate.field_evidence);
  const workNotes = Array.isArray(suggestedSource.work_notes)
    ? suggestedSource.work_notes.filter((note): note is string => typeof note === "string")
    : null;
  const workDetails = inferWorkDetailsFromNotes(
    normalizeWorkDetails(suggestedSource.work_details),
    workNotes || [],
    fieldEvidence,
    fieldSources,
  );

  return {
    suggested_fields: {
      core_details: normalizeCoreDetails(suggestedSource.core_details),
      short_description: getStringOrNull(suggestedSource.short_description),
      description: getStringOrNull(suggestedSource.description),
      website: getStringOrNull(suggestedSource.website),
      phone: getStringOrNull(suggestedSource.phone),
      opening_hours_note: getStringOrNull(suggestedSource.opening_hours_note),
      work_notes: workNotes,
      review_insights: normalizeReviewInsights(suggestedSource.review_insights),
      work_details: workDetails,
    },
    field_evidence: fieldEvidence,
    unknown_fields: normalizeStringList(candidate.unknown_fields) || [],
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

function inferWorkDetailsFromNotes(
  details: Record<string, string | number | boolean | null> | null,
  notes: string[],
  fieldEvidence: WorkspaceEnrichmentResult["field_evidence"],
  fieldSources: Record<string, string[]>,
) {
  const inferred = { ...(details || {}) };
  const setInferred = (
    key: string,
    value: string | number | boolean,
    note: string,
    confidence: "low" | "medium" = "medium",
  ) => {
    if (inferred[key] !== undefined && inferred[key] !== null) return;
    inferred[key] = value;
    const path = `work_details.${key}`;
    if (!fieldEvidence[path]) {
      fieldEvidence[path] = {
        confidence,
        basis: "review_signal",
        source_quality: "review_pattern",
        evidence: `Inferred from AI work note: "${note}"`,
        source: null,
      };
    }
    if (!fieldSources[path]) fieldSources[path] = fieldSources.work_notes || ["ai_work_note"];
  };

  for (const note of notes) {
    const text = note.toLowerCase();
    // Core work facts require an explicit structured suggestion; a mention can describe a restriction.
    if (/quiet|silent|reading room|study room/.test(text)) setInferred("noise_level", "quiet", note);
    if (/reading room|study room|seating|seats?|tables?|desk/.test(text)) setInferred("seating_comfort", "adequate", note, "low");
    if (/food|drink|beverage/.test(text)) {
      if (/strict|not allowed|no food|no drink|prohibit|restricted/.test(text)) {
        setInferred("has_food", false, note);
        setInferred("minimum_purchase_required", false, note, "low");
      } else {
        setInferred("has_food", true, note, "low");
      }
    }
    if (/coffee|espresso|cafe|café/.test(text)) setInferred("has_coffee", true, note, "low");
    if (/outdoor|terrace|patio/.test(text)) setInferred("has_outdoor_seating", true, note);
    if (/meeting room|meetings?/.test(text)) setInferred("good_for_meetings", true, note);
    if (/call|phone booth|booth/.test(text)) setInferred("good_for_calls", true, note);
    if (/group|groups?/.test(text)) setInferred("good_for_groups", true, note);
  }

  return Object.keys(inferred).length > 0 ? inferred : null;
}

function buildAttemptsForMode(mode: PlaceEnrichmentMode): OpenRouterAttempt[] {
  if (mode === "no_web") {
    return [
      { mode: "schema", webSearch: false, requireParameters: true },
      { mode: "json", webSearch: false, requireParameters: false },
    ];
  }

  return [
    { mode: "schema", webSearch: true, requireParameters: true },
    { mode: "json", webSearch: true, requireParameters: false },
    { mode: "schema", webSearch: false, requireParameters: true },
    { mode: "json", webSearch: false, requireParameters: false },
  ];
}

function getTaskForMode(mode: PlaceEnrichmentMode) {
  if (mode === "text_only") {
    return "Improve only public-facing copy, notes, opening-hours note, and review insights for this exact workspace.";
  }
  if (mode === "details_only") {
    return "Research only structured workability and amenity details for this exact workspace.";
  }
  if (mode === "no_web") {
    return "Enrich this workspace using submitted data and reliable model knowledge only.";
  }
  return "Research and enrich this pending workspace for a human reviewer.";
}

function getScopeRuleForMode(mode: PlaceEnrichmentMode) {
  if (mode === "text_only") {
    return "Only fill short_description, description, opening_hours_note, work_notes, and review_insights. Keep core_details and work_details null unless needed by the schema.";
  }
  if (mode === "details_only") {
    return "Only fill work_details and any field_evidence, field_sources, and unknown_fields needed for those work_details. Keep public copy and core_details null unless needed by the schema.";
  }
  if (mode === "no_web") {
    return "Do not claim current opening hours, coordinates, amenities, or review patterns unless they are submitted by the user or very high-confidence public knowledge.";
  }
  return "Fill any source-backed field that would help a reviewer approve or correct this workspace.";
}

function formatAttempt(attempt: OpenRouterAttempt) {
  return [
    attempt.mode,
    attempt.webSearch ? "web" : "no-web",
    attempt.requireParameters ? "strict" : "relaxed",
  ].join("/");
}

function summarizeOpenRouterErrors(errors: string[]) {
  const uniqueMessages = Array.from(new Set(errors.map((error) => error.replace(/\s+/g, " ").trim())));
  return uniqueMessages.slice(-6).join(" | ");
}

function normalizeFieldEvidence(value: unknown): WorkspaceEnrichmentResult["field_evidence"] {
  if (!isRecord(value)) return {};

  const normalized: WorkspaceEnrichmentResult["field_evidence"] = {};
  for (const [key, evidenceValue] of Object.entries(value)) {
    if (!isRecord(evidenceValue)) continue;
    const confidence = evidenceValue.confidence;
    const basis = evidenceValue.basis;
    normalized[key] = {
      confidence: confidence === "medium" || confidence === "high" || confidence === "low" ? confidence : "low",
      basis:
        basis === "confirmed" ||
        basis === "review_signal" ||
        basis === "likely" ||
        basis === "unknown" ||
        basis === "conflicting"
          ? basis
          : "unknown",
      evidence: getStringOrNull(evidenceValue.evidence),
      source: getStringOrNull(evidenceValue.source),
      source_quality: normalizeSourceQuality(evidenceValue.source_quality),
    };
  }
  return normalized;
}

function normalizeSourceQuality(value: unknown): WorkspaceEnrichmentResult["field_evidence"][string]["source_quality"] {
  if (
    value === "official" ||
    value === "directory" ||
    value === "review_pattern" ||
    value === "submitted_data" ||
    value === "model_knowledge" ||
    value === "unknown"
  ) {
    return value;
  }
  return "unknown";
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

  const booleanKeys = new Set([
    "has_wifi",
    "has_power_outlets",
    "has_outdoor_seating",
    "has_standing_desks",
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
  const numberKeys = new Set([
    "power_outlet_availability",
    "seating_capacity",
    "music_volume",
    "price_range",
    "time_limit_hours",
  ]);
  const enumKeys = {
    wifi_speed: new Set(["slow", "moderate", "fast", "very_fast"]),
    seating_comfort: new Set(["uncomfortable", "adequate", "comfortable", "very_comfortable"]),
    noise_level: new Set(["quiet", "moderate", "loud"]),
  } as const;

  const normalized: Record<string, string | number | boolean | null> = {};
  for (const [key, detailValue] of Object.entries(value)) {
    if (booleanKeys.has(key)) {
      if (typeof detailValue === "boolean" || detailValue === null) normalized[key] = detailValue;
      continue;
    }
    if (numberKeys.has(key)) {
      const numberValue = getNumberOrNull(detailValue);
      if (numberValue === null && detailValue !== null) continue;
      if (key === "seating_capacity") normalized[key] = numberValue === null ? null : Math.max(0, Math.min(1000, Math.round(numberValue)));
      else if (key === "time_limit_hours") normalized[key] = numberValue === null ? null : Math.max(0, Math.min(24, numberValue));
      else normalized[key] = numberValue === null ? null : Math.max(0, Math.min(5, numberValue));
      continue;
    }
    if (key in enumKeys) {
      const allowed = enumKeys[key as keyof typeof enumKeys];
      const stringValue = getStringOrNull(detailValue);
      if (stringValue === null || allowed.has(stringValue)) {
        normalized[key] = stringValue;
      }
      continue;
    }
    if (detailValue === null) {
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
