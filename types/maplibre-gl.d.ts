declare module "maplibre-gl" {
  export type LngLatLike = [number, number];

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
    fitBounds(bounds: LngLatBounds, options?: { padding?: number | [number, number] }): this;
    addControl(control: unknown, position?: unknown): this;
    remove(): void;
  }

  export interface MarkerOptions {
    color?: string;
    element?: HTMLElement;
  }

  export class Marker {
    constructor(options?: MarkerOptions);
    setLngLat(lngLat: LngLatLike): this;
    setPopup(popup: Popup): this;
    addTo(map: Map): this;
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
