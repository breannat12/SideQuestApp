import type { Place } from "../types";

/**
 * Place search via the Geoapify Address Autocomplete API.
 *
 * Autocomplete is request-hungry — every burst of typing is a round trip — and
 * the free plan is a hard 3,000 credits/day, so this module spends them
 * carefully: nothing fires under MIN_QUERY chars, callers debounce, and repeat
 * queries are served from an in-process cache. Backspacing through a word
 * costs nothing the second time.
 *
 * Needs a key in `.env` as VITE_GEOAPIFY_KEY. It ships in the JS bundle, so
 * restrict it by domain (Geoapify dashboard → API key → allowed origins).
 * Without a key the location step falls back to a static preset list.
 */

const KEY  = import.meta.env.VITE_GEOAPIFY_KEY as string | undefined;
const BASE = "https://api.geoapify.com/v1/geocode/autocomplete";

/** False until a key is configured, so the UI can fall back instead of erroring. */
export const PLACES_ENABLED = Boolean(KEY);

/** Below this, results are too broad to be worth a credit. */
export const MIN_QUERY = 3;

/** Thrown for anything the caller should show a message about. */
export class PlacesError extends Error {}

// ── Cache ──────────────────────────────────────────────────────────────────

/**
 * Query → results, for the life of the page. Typing "blue bo", backspacing to
 * "blue" and typing forward again would otherwise bill for every step.
 */
const cache = new Map<string, Place[]>();

// ── Proximity bias ─────────────────────────────────────────────────────────

let proximity: Promise<[number, number] | null> | null = null;

/**
 * How the current fix was obtained. A browser fix is good to a few metres; an
 * IP fix is good to a city. Naming a street from the second one would invent a
 * precision that isn't there, so the reverse lookup below reads this first.
 */
let proximitySource: "browser" | "ip" | null = null;

/** Precise coords, but only if permission is already granted (see below). */
function fromBrowser(): Promise<[number, number] | null> {
  return (async () => {
    try {
      if (!navigator.geolocation || !navigator.permissions) return null;
      // Deliberately does not *request* permission — a prompt thrown over the
      // form mid-keystroke is hostile. Onboarding asks for it at a sane moment.
      const perm = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      if (perm.state !== "granted") return null;
      return await new Promise<[number, number] | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
          () => resolve(null),
          { timeout: 4000, maximumAge: 300_000 },
        );
      });
    } catch {
      return null;
    }
  })();
}

/** City-level coords from the request IP. Costs one credit, needs no prompt. */
async function fromIp(): Promise<[number, number] | null> {
  try {
    const res = await fetch(`https://api.geoapify.com/v1/ipinfo?apiKey=${KEY}`);
    if (!res.ok) return null;
    const data = await res.json() as { location?: { latitude?: number; longitude?: number } };
    const { latitude, longitude } = data.location ?? {};
    return typeof latitude === "number" && typeof longitude === "number"
      ? [longitude, latitude]
      : null;
  } catch {
    return null;
  }
}

/**
 * Where to centre results. This is not a nicety — unbiased, searching "blue
 * bottle" ranks a reservoir in Wyoming above the cafe down the street. Biasing
 * by country alone doesn't fix it (it can even surface other continents), so
 * the fallback has to be real coordinates, not a country code.
 *
 * Precise browser location when it's already permitted, city-level IP lookup
 * otherwise. Resolved once per page load; failing both just means no bias.
 */
function getProximity(): Promise<[number, number] | null> {
  if (proximity) return proximity;
  proximity = (async () => {
    const precise = await fromBrowser();
    if (precise) { proximitySource = "browser"; return precise; }
    const coarse = await fromIp();
    proximitySource = coarse ? "ip" : null;
    return coarse;
  })();
  return proximity;
}

// ── Where you are, and how far that is ─────────────────────────────────────

export interface Coords { lat: number; lng: number }

/**
 * Your own position, for measuring distances and for stamping a plan you're
 * creating "here". Shares one resolution with the search bias above, so asking
 * costs nothing extra.
 *
 * Precision depends on what's available: exact if geolocation is permitted,
 * city-level if it fell back to the IP lookup, and null if neither worked. A
 * city-level fix still orders plans sensibly relative to each other.
 */
export async function getMyCoords(): Promise<Coords | null> {
  const near = await getProximity();
  return near ? { lat: near[1], lng: near[0] } : null;
}

const EARTH_RADIUS_MILES = 3958.8;
const toRadians = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in miles. Plenty accurate at the scale of a city. */
export function distanceMiles(from: Coords, to: Coords): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * "0.3 mi" — the chip on a plan card. Kept coarse on purpose: the underlying
 * fix can be city-level, and "0.28 mi" would claim a precision that isn't there.
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) return "< 0.1 mi";
  if (miles < 10)  return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

// ── Reverse lookup: coordinates → a name a friend can read ─────────────────

const REVERSE = "https://api.geoapify.com/v1/geocode/reverse";

/**
 * What to call the spot you're standing on.
 *
 * A plan pinned "here" stores your coordinates, which is all a distance needs —
 * but a friend reading the card needs a *name*. Without one the card says
 * "Current Location", which describes where the host was and tells the reader
 * nothing.
 *
 * Resolved once, by the host, at the moment they share — not by each viewer on
 * every snapshot. One credit per plan instead of one per reader per render, and
 * the label that lands in Firestore is then the same everywhere it appears:
 * card, detail sheet, and the "now meets at…" notification.
 *
 * Granularity follows the fix behind the coordinates. A browser fix names the
 * building or street; an IP fix only ever names the neighbourhood or city,
 * because a street address derived from a city-level fix would be a fiction.
 *
 * Returns null rather than throwing — a plan whose label couldn't be resolved
 * is still a perfectly good plan, and blocking the share on a geocode would be
 * a poor trade.
 */
export async function describeCoords(at: Coords): Promise<string | null> {
  if (!PLACES_ENABLED) return null;

  const precise = proximitySource === "browser";
  const url = new URL(REVERSE);
  url.searchParams.set("lat", String(at.lat));
  url.searchParams.set("lon", String(at.lng));
  url.searchParams.set("apiKey", KEY!);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  // Asking the API itself for a coarse answer, rather than requesting a street
  // and discarding it, keeps the returned point honest too.
  if (!precise) url.searchParams.set("type", "city");

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as { results?: ReverseResult[] };
    const hit = data.results?.[0];
    if (!hit) return null;

    if (precise) {
      // `address_line1` is the business name for a venue and the street for a
      // plain address — the right headline either way, same as in search.
      const line = hit.address_line1 || hit.name || hit.street || "";
      const area = hit.suburb || hit.neighbourhood || hit.district || hit.city || "";
      // "Blue Bottle Coffee, Hayes Valley" — the venue alone can be ambiguous
      // across a city, and the area is what makes it findable.
      return [line, area && area !== line ? area : ""].filter(Boolean).join(", ") || null;
    }
    return hit.suburb || hit.neighbourhood || hit.district || hit.city || null;
  } catch {
    // Offline, blocked, out of quota. The caller keeps its placeholder.
    return null;
  }
}

/** Only the fields read off a reverse-geocode hit. */
interface ReverseResult {
  name?: string;
  street?: string;
  address_line1?: string;
  suburb?: string;
  neighbourhood?: string;
  district?: string;
  city?: string;
}

// ── Search ─────────────────────────────────────────────────────────────────

/**
 * Type-ahead results. Unlike Mapbox, Geoapify returns coordinates inline, so
 * what comes back here is already complete — no follow-up lookup once the user
 * picks one.
 */
export async function suggestPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (!PLACES_ENABLED || q.length < MIN_QUERY) return [];

  const hit = cache.get(q.toLowerCase());
  if (hit) return hit;

  const near = await getProximity();
  const url  = new URL(BASE);
  url.searchParams.set("text", q);
  url.searchParams.set("apiKey", KEY!);
  url.searchParams.set("limit", "8");
  url.searchParams.set("format", "json");
  if (near) url.searchParams.set("bias", `proximity:${near[0]},${near[1]}`);

  const res = await fetch(url);
  if (res.status === 401 || res.status === 403) {
    throw new PlacesError("Geoapify rejected the key — check VITE_GEOAPIFY_KEY and its allowed origins.");
  }
  if (res.status === 429) {
    throw new PlacesError("Daily search limit reached. Try again tomorrow.");
  }
  if (!res.ok) throw new PlacesError("Couldn't reach place search.");

  const data = await res.json() as { results?: RawResult[] };
  const places = (data.results ?? [])
    .filter((r) => typeof r.lat === "number" && typeof r.lon === "number")
    .map(toPlace);

  cache.set(q.toLowerCase(), places);
  return places;
}

function toPlace(r: RawResult): Place {
  // `address_line1` is the place name for a business and the street for a
  // plain address, which is exactly the right headline in both cases.
  const name = r.address_line1 || r.name || r.formatted || "";
  // Comes back dotted and coarse-to-fine ("catering.cafe"); the leaf is the
  // human-readable bit. `format=json` sends a single string, the GeoJSON form
  // sends an array — accept either.
  const rawCategory = r.category ?? r.categories?.find((c) => c.includes(".")) ?? "";
  return {
    id:       r.place_id ?? `${r.lat},${r.lon}`,
    name,
    address:  r.address_line2 || (r.formatted !== name ? r.formatted ?? "" : ""),
    category: rawCategory.split(".").pop()?.replace(/_/g, " ") ?? "",
    lat:      r.lat,
    lng:      r.lon,
  };
}

// ── Response shape (only the fields actually read) ──────────────────────────

interface RawResult {
  place_id?: string;
  name?: string;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  /** `format=json` returns a single dotted string here. */
  category?: string;
  /** The GeoJSON form returns an array instead. */
  categories?: string[];
  lat: number;
  lon: number;
}
