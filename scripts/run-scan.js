const fs = require("fs");
const path = require("path");
const { runScan } = require("../lib/scan");

const BANDS_PATH = path.join(__dirname, "..", "data", "bands.json");
const SHOWS_PATH = path.join(__dirname, "..", "data", "shows.json");

async function main() {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    console.error("TICKETMASTER_API_KEY is not set.");
    process.exit(1);
  }

  const bands = JSON.parse(fs.readFileSync(BANDS_PATH, "utf-8"));
  console.log(`Scanning ${bands.length} bands...`);

  const result = await runScan({ bands, apiKey });
  fs.writeFileSync(SHOWS_PATH, JSON.stringify(result, null, 2) + "\n");

  console.log(`Found ${result.shows.length} shows. Wrote ${SHOWS_PATH}.`);
  const notFound = result.bandsStatus.filter(b => !b.found);
  if (notFound.length > 0) {
    console.log("Not found on Ticketmaster:", notFound.map(b => b.name).join(", "));
  }
}

main().catch(err => {
  console.error("Scan script failed:", err);
  process.exit(1);
});
