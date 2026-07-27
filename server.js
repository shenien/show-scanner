const express = require("express");
const fs = require("fs");
const path = require("path");
const { runScan } = require("./lib/scan");
const { commitFile, configured: githubConfigured } = require("./lib/github");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const BANDS_PATH = path.join(__dirname, "data", "bands.json");
const SHOWS_PATH = path.join(__dirname, "data", "shows.json");

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

let bands = readJSON(BANDS_PATH);
let showsData = readJSON(SHOWS_PATH);
let lastScanTriggeredAt = 0;
const SCAN_COOLDOWN_MS = 5 * 60 * 1000;

function saveBands() {
  const content = JSON.stringify(bands, null, 2) + "\n";
  fs.writeFileSync(BANDS_PATH, content);
  if (githubConfigured()) {
    commitFile("data/bands.json", content, "Update band list").catch(err =>
      console.error("Failed to commit bands.json:", err.message)
    );
  }
}

function saveShows() {
  const content = JSON.stringify(showsData, null, 2) + "\n";
  fs.writeFileSync(SHOWS_PATH, content);
  if (githubConfigured()) {
    commitFile("data/shows.json", content, "Update scan results").catch(err =>
      console.error("Failed to commit shows.json:", err.message)
    );
  }
}

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/bands", (req, res) => res.json({ bands }));

app.post("/api/bands", (req, res) => {
  const name = (req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Band name is required." });
  const exists = bands.some(b => b.toLowerCase() === name.toLowerCase());
  if (exists) return res.status(409).json({ error: "That band is already on your list." });
  bands.push(name);
  saveBands();
  res.status(201).json({ bands });
});

app.delete("/api/bands/:name", (req, res) => {
  const target = req.params.name.toLowerCase();
  const before = bands.length;
  bands = bands.filter(b => b.toLowerCase() !== target);
  if (bands.length === before) return res.status(404).json({ error: "Band not found." });
  saveBands();
  res.json({ bands });
});

app.get("/api/shows", (req, res) => res.json(showsData));

app.post("/api/scan", async (req, res) => {
  const now = Date.now();
  if (now - lastScanTriggeredAt < SCAN_COOLDOWN_MS) {
    const waitSec = Math.ceil((SCAN_COOLDOWN_MS - (now - lastScanTriggeredAt)) / 1000);
    return res.status(429).json({ error: `Scanned recently. Try again in ${waitSec}s.`, showsData });
  }
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "TICKETMASTER_API_KEY is not configured." });

  lastScanTriggeredAt = now;
  try {
    showsData = await runScan({ bands, apiKey });
    saveShows();
    res.json(showsData);
  } catch (err) {
    console.error("Scan failed:", err);
    res.status(500).json({ error: "Scan failed. Check server logs." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Show Scanner listening on :${PORT}`));
