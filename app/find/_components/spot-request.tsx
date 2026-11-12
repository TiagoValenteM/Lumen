"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  canSendRequest, hasInterpretedPreferences, interpretLocally, MAX_REQUEST_LENGTH, validateInterpretation,
  type SpotInterpretation,
} from "@/lib/features/find-a-spot/preferences";

type RequestState = "idle" | "review" | "unrecognized" | "partial" | "unavailable" | "limited" | "private";

const messages: Record<Exclude<RequestState, "idle">, string> = {
  review: "Filters updated. Review them below.",
  unrecognized: "That request doesn’t fit the available filters. You can set them below.",
  partial: "Some details weren’t applied. Review the filters below.",
  unavailable: "AI couldn’t interpret this request. You can still set the filters below.",
  limited: "AI is at its request limit. You can still set the filters below.",
  private: "Remove links, contact details, or coordinates, or set the filters below.",
};

export function SpotRequest({ canUseAi, onInterpret }: {
  canUseAi: boolean;
  onInterpret: (interpretation: SpotInterpretation) => void;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [state, setState] = useState<RequestState>("idle");
  const [loading, setLoading] = useState(false);
  const [offerAi, setOfferAi] = useState(false);
  const [suggestion, setSuggestion] = useState<SpotInterpretation | null>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  function updateText(value: string) {
    pending.current?.abort();
    pending.current = null;
    setLoading(false);
    setOfferAi(false);
    setSuggestion(null);
    setState("idle");
    setText(value);
  }

  function handleLocal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || loading) return;
    setSuggestion(null);
    if (!canSendRequest(text)) {
      setState("private");
      return;
    }
    const result = interpretLocally(text);
    if (!result.unsupported && hasInterpretedPreferences(result)) {
      onInterpret(result);
      setState("review");
      setOfferAi(false);
    } else {
      setState("unrecognized");
      setOfferAi(true);
    }
  }

  async function handleAi() {
    if (pending.current || !canUseAi || !offerAi || !canSendRequest(text)) return;
    const controller = new AbortController();
    pending.current = controller;
    setOfferAi(false);
    setLoading(true);
    setState("idle");
    try {
      const response = await fetch("/api/find-a-spot/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(9000)]),
      });
      if (controller.signal.aborted) return;
      if (!response.ok) {
        setState(response.status === 429 ? "limited" : "unavailable");
        return;
      }
      const { interpretation } = await response.json();
      if (controller.signal.aborted) return;
      const result = validateInterpretation(interpretation);
      if (!result || !hasInterpretedPreferences(result)) {
        setState("unavailable");
        return;
      }
      setSuggestion(result);
    } catch {
      if (!controller.signal.aborted) setState("unavailable");
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setLoading(false);
      }
    }
  }

  return (
    <div className="space-y-2.5">
      <form onSubmit={handleLocal} className="space-y-2.5">
        <label htmlFor={id} className="block text-sm font-medium">What kind of spot do you need?</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id={id} autoComplete="off" maxLength={MAX_REQUEST_LENGTH} value={text} onChange={(event) => updateText(event.target.value)}
            placeholder="Somewhere quiet for two hours, with Wi-Fi" className="h-10 min-w-0 sm:flex-1" />
          <Button type="submit" variant="secondary" className="h-10 shrink-0" disabled={loading || !text.trim()}>
            Set filters <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </form>
      <div role="status" className="text-sm text-muted-foreground empty:sr-only">
        {loading ? <span className="inline-flex items-center gap-2"><LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" /> Interpreting request…</span> : suggestion && canUseAi ? "AI filters ready to review." : state === "idle" ? null : messages[state]}
      </div>
      {suggestion && canUseAi && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-muted/55 px-3 py-2.5">
          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <p>{[
              suggestion.activity === "focus" ? "Focus" : suggestion.activity === "call" ? "Take a call" : suggestion.activity === "general" ? "Work" : null,
              suggestion.minutes ? `${suggestion.minutes / 60} h` : null,
              suggestion.wifi === null ? null : suggestion.wifi ? "Require Wi-Fi" : "Wi-Fi optional",
              suggestion.power === null ? null : suggestion.power ? "Require outlets" : "Outlets optional",
            ].filter(Boolean).join(" · ")}</p>
            {suggestion.unsupported && <p className="text-xs text-muted-foreground">Some details couldn’t be turned into filters.</p>}
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            onInterpret(suggestion);
            setState(suggestion.unsupported ? "partial" : "review");
            setSuggestion(null);
          }}>Apply filters</Button>
        </div>
      )}
      {offerAi && canUseAi && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button variant="outline" size="sm" type="button" onClick={handleAi} aria-describedby={`${id}-privacy`}>
            <Sparkles aria-hidden="true" /> Try with AI
          </Button>
          <p id={`${id}-privacy`} className="text-xs text-muted-foreground">Sends only this text to OpenRouter. Don’t include personal details.</p>
        </div>
      )}
    </div>
  );
}
