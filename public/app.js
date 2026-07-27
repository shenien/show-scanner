const showGrid = document.getElementById("showGrid");
const bandChips = document.getElementById("bandChips");
const scanMeta = document.getElementById("scanMeta");
const statusDot = document.getElementById("statusDot");
const statusLabel = document.getElementById("statusLabel");
const scanBtn = document.getElementById("scanBtn");
const addBandForm = document.getElementById("addBandForm");
const addBandInput = document.getElementById("addBandInput");
const formError = document.getElementById("formError");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function formatDate(dateStr) {
  if (!dateStr) return "Date TBA";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function timeAgo(iso) {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function showCardHTML(show) {
  const noImg = !show.image;
  const location = [show.venue, [show.city, show.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  const distance = show.distanceMiles != null ? `${show.distanceMiles} mi away` : "";
  return `
    <a class="show-card${noImg ? " show-card-noimg" : ""}" href="${show.ticketUrl}" target="_blank" rel="noopener noreferrer">
      <div class="show-card-bg" ${show.image ? `style="background-image:url('${show.image}')"` : ""}></div>
      <div class="show-card-scrim"></div>
      <div class="show-card-body">
        <span class="show-card-date">${formatDate(show.date)}</span>
        <span class="show-card-band">${show.band}</span>
        <span class="show-card-venue">${location}${distance ? ` · ${distance}` : ""}</span>
        <div class="show-card-foot">
          <span>Get tickets on StubHub</span>
          <span class="show-card-arrow">→</span>
        </div>
      </div>
    </a>`;
}

function renderShows(data) {
  if (!data.shows || data.shows.length === 0) {
    showGrid.innerHTML = `<div class="empty-state">No shows found within ${data.radiusMiles ?? 50} miles of Venice, CA right now. Show Scanner checks again every morning.</div>`;
  } else {
    showGrid.innerHTML = data.shows.map(showCardHTML).join("");
  }
  attachCardInteractions();

  if (data.lastScanned) {
    scanMeta.textContent = `${data.shows.length} show${data.shows.length === 1 ? "" : "s"} found · last scanned ${timeAgo(data.lastScanned)}`;
    statusDot.classList.remove("stale");
    statusLabel.textContent = "SCANNED";
  } else {
    scanMeta.textContent = "No scan has run yet — hit “Scan now” to check for shows.";
    statusDot.classList.add("stale");
    statusLabel.textContent = "IDLE";
  }
}

function bandChipHTML(name, status) {
  const found = status ? status.found : true;
  return `
    <span class="band-chip${found ? "" : " not-found"}" data-band="${name}">
      <span class="chip-dot"></span>
      ${name}${found ? "" : " · not found"}
      <button class="chip-remove" data-remove="${name}" title="Remove ${name}">×</button>
    </span>`;
}

let currentShowsData = { shows: [], bandsStatus: [] };
let currentBands = [];

function renderBands() {
  const statusByName = Object.fromEntries((currentShowsData.bandsStatus ?? []).map(s => [s.name, s]));
  bandChips.innerHTML = currentBands.map(name => bandChipHTML(name, statusByName[name])).join("");
  bandChips.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => removeBand(btn.dataset.remove));
  });
}

async function loadAll() {
  const [bandsRes, showsRes] = await Promise.all([fetch("/api/bands"), fetch("/api/shows")]);
  const bandsJson = await bandsRes.json();
  const showsJson = await showsRes.json();
  currentBands = bandsJson.bands;
  currentShowsData = showsJson;
  renderShows(showsJson);
  renderBands();
}

async function removeBand(name) {
  await fetch(`/api/bands/${encodeURIComponent(name)}`, { method: "DELETE" });
  const res = await fetch("/api/bands");
  const json = await res.json();
  currentBands = json.bands;
  renderBands();
}

addBandForm.addEventListener("submit", async e => {
  e.preventDefault();
  const name = addBandInput.value.trim();
  formError.textContent = "";
  if (!name) return;
  const res = await fetch("/api/bands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    formError.textContent = err.error ?? "Couldn't add that band.";
    return;
  }
  const json = await res.json();
  currentBands = json.bands;
  addBandInput.value = "";
  renderBands();
});

scanBtn.addEventListener("click", async () => {
  scanBtn.disabled = true;
  scanBtn.textContent = "Scanning…";
  statusLabel.textContent = "SCANNING";
  try {
    const res = await fetch("/api/scan", { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      scanMeta.textContent = json.error ?? "Scan failed.";
    } else {
      currentShowsData = json;
      renderShows(json);
      renderBands();
    }
  } catch (err) {
    scanMeta.textContent = "Scan failed — check your connection.";
  } finally {
    scanBtn.disabled = false;
    scanBtn.textContent = "Scan now";
  }
});

function attachCardInteractions() {
  if (prefersReducedMotion) return;
  document.querySelectorAll(".show-card").forEach(card => {
    card.addEventListener("mouseenter", () => card.classList.add("tilting"));
    card.addEventListener("mousemove", e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mx", `${(x / rect.width) * 100}%`);
      card.style.setProperty("--my", `${(y / rect.height) * 100}%`);
      card.style.setProperty("--rx", `${((x / rect.width) - 0.5) * 6}deg`);
      card.style.setProperty("--ry", `${-((y / rect.height) - 0.5) * 6}deg`);
    });
    card.addEventListener("mouseleave", () => {
      card.classList.remove("tilting");
      card.style.setProperty("--rx", `0deg`);
      card.style.setProperty("--ry", `0deg`);
    });
  });
}

if (!prefersReducedMotion) {
  const root = document.documentElement;
  window.addEventListener("mousemove", e => {
    root.style.setProperty("--sx", `${(e.clientX / window.innerWidth) * 100}%`);
    root.style.setProperty("--sy", `${(e.clientY / window.innerHeight) * 100}%`);
  }, { passive: true });
}

loadAll();
