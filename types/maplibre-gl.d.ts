declare module "maplibre-gl" {
  export type LngLatLike = [number, number];
  export type MapEventName = "load" | "click";

  export interface LngLat {
    lng: number;
    lat: number;
  }

  export interface MapMouseEvent {
    lngLat: LngLat;
  }

  export class LngLatBounds {
    constructor(bounds?: [LngLatLike, LngLatLike] | LngLatLike[]);
    extend(lngLat: LngLatLike): this;
  }

  export interface MapOptions {
    container: HTMLElement | string;
    style: unknown;
    center?: LngLatLike;
    zoom?: number;
    attributionControl?: boolean;
  }

  export class Map {
    constructor(options: MapOptions);
    setCenter(lngLat: LngLatLike): this;
    setZoom(zoom: number): this;
    flyTo(options: { center: LngLatLike; zoom?: number; essential?: boolean }): this;
    fitBounds(bounds: LngLatBounds, options?: { padding?: number | [number, number] }): this;
    addControl(control: unknown, position?: unknown): this;
    on(type: "load", listener: () => void): this;
    on(type: "click", listener: (event: MapMouseEvent) => void): this;
    remove(): void;
  }

  export interface MarkerOptions {
    color?: string;
    element?: HTMLElement;
    draggable?: boolean;
  }

  export class Marker {
    constructor(options?: MarkerOptions);
    setLngLat(lngLat: LngLatLike): this;
    getLngLat(): LngLat;
    setPopup(popup: Popup): this;
    addTo(map: Map): this;
    on(type: "dragend", listener: () => void): this;
    remove(): void;
  }

  export interface PopupOptions {
    offset?: number | number[] | { left?: number; right?: number; top?: number; bottom?: number };
  }

  export class Popup {
    constructor(options?: PopupOptions);
    setHTML(html: string): this;
  }
}
