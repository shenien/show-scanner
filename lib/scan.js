const { findAttraction, findEventsNear, bestImage } = require("./ticketmaster");
const { haversineMiles } = require("./geo");
const { stubhubSearchUrl } = require("./stubhub");

const ORIGIN = { lat: 33.9850, lon: -118.4695, label: "Venice, CA" };
const RADIUS_MILES = 50;
const REQUEST_DELAY_MS = 300;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildShow(band, event, attractionImage) {
  const venue = event._embedded?.venues?.[0];
  const lat = venue?.location?.latitude ? parseFloat(venue.location.latitude) : null;
  const lon = venue?.location?.longitude ? parseFloat(venue.location.longitude) : null;
  const distanceMiles =
    lat != null && lon != null ? Math.round(haversineMiles(ORIGIN.lat, ORIGIN.lon, lat, lon) * 10) / 10 : null;

  const eventImage = bestImage(event.images);
  const city = venue?.city?.name ?? null;

  return {
    band,
    date: event.dates?.start?.localDate ?? null,
    time: event.dates?.start?.localTime ?? null,
    venue: venue?.name ?? "Venue TBA",
    city,
    state: venue?.state?.stateCode ?? null,
    distanceMiles,
    image: attractionImage ?? eventImage,
    ticketUrl: stubhubSearchUrl(band, city),
    sourceUrl: event.url ?? null,
  };
}

async function runScan({ bands, apiKey }) {
  const shows = [];
  const bandsStatus = [];

  for (const band of bands) {
    try {
      const attraction = await findAttraction(apiKey, band);
      await sleep(REQUEST_DELAY_MS);

      if (!attraction) {
        bandsStatus.push({ name: band, found: false, eventCount: 0 });
        continue;
      }

      const attractionImage = bestImage(attraction.images);
      const events = await findEventsNear(apiKey, attraction.id, { ...ORIGIN, radiusMiles: RADIUS_MILES });
      await sleep(REQUEST_DELAY_MS);

      for (const event of events) {
        shows.push(buildShow(band, event, attractionImage));
      }
      bandsStatus.push({ name: band, found: true, eventCount: events.length });
    } catch (err) {
      bandsStatus.push({ name: band, found: false, error: String(err.message ?? err) });
    }
  }

  shows.sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));

  return {
    lastScanned: new Date().toISOString(),
    radiusMiles: RADIUS_MILES,
    origin: ORIGIN,
    shows,
    bandsStatus,
  };
}

module.exports = { runScan, ORIGIN, RADIUS_MILES };
