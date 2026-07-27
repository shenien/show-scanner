const BASE = "https://app.ticketmaster.com/discovery/v2";

function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();
}

// Ticketmaster's keyword search mixes in tribute acts and cover bands
// (e.g. "Remake Yourself: Tribute to Incubus" outranks the real Incubus),
// so we require an exact normalized name match rather than trusting rank.
async function findAttraction(apiKey, bandName) {
  const url = `${BASE}/attractions.json?apikey=${apiKey}&keyword=${encodeURIComponent(bandName)}&classificationName=music&size=20`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ticketmaster attractions ${res.status}`);
  const json = await res.json();
  const attractions = json?._embedded?.attractions ?? [];
  if (attractions.length === 0) return null;

  const target = normalize(bandName);
  return attractions.find(a => normalize(a.name ?? "") === target) ?? null;
}

function bestImage(images) {
  if (!images || images.length === 0) return null;
  const widescreen = images
    .filter(img => img.ratio === "16_9")
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  if (widescreen.length > 0) return widescreen[0].url;
  const sorted = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return sorted[0]?.url ?? null;
}

// Events are matched by attractionId (not keyword) for the same reason —
// keyword search on events also surfaces tribute/cover shows.
async function findEventsNear(apiKey, attractionId, { lat, lon, radiusMiles }) {
  const url =
    `${BASE}/events.json?apikey=${apiKey}` +
    `&attractionId=${attractionId}` +
    `&latlong=${lat},${lon}` +
    `&radius=${radiusMiles}&unit=miles` +
    `&sort=date,asc&size=50`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ticketmaster events ${res.status}`);
  const json = await res.json();
  return json?._embedded?.events ?? [];
}

module.exports = { findAttraction, findEventsNear, bestImage };
