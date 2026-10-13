#!/usr/bin/env node
// Downloads GDG Cochabamba's events from gdg.community.dev into the repo
// (src/data/events.json + banners in src/assets/events/) so the site never
// queries an external service at runtime. Re-run and commit when events change.
//
// Usage: node scripts/sync-community-events.mjs

import fs from "node:fs";
import path from "node:path";

const CHAPTER_ID = 906;
const API = `https://gdg.community.dev/api/event_slim/for_chapter/${CHAPTER_ID}/?page_size=100`;
const ROOT = path.resolve(import.meta.dirname, "..");
const DATA_FILE = path.join(ROOT, "src/data/events.json");
const IMG_DIR = path.join(ROOT, "src/assets/events");

const SERIES = [
  ["devfest", /devfest/i],
  ["io-extended", /i\/?o\s*extended|google\s*i\/o/i],
  ["build-with-ai", /build\s*with\s*ai|road\s*to\s*build/i],
  ["techjoin", /tech\s*join/i],
  ["wgj", /women\s*game\s*jam|\bwgj\b/i],
  ["iwd", /\biwd\b|women'?s\s*day|women\s*techmakers|\bwtm\b|cloud\s*queens|wiñay\s*tech/i],
];
const seriesOf = (title) => SERIES.find(([, re]) => re.test(title))?.[0] ?? "custom";

// Banners come at 2560px/dpr 2; ask Cloudinary for a 960px JPEG instead.
const smallBanner = (url) =>
  url.replace("dpr_2.0", "dpr_1.0").replace("f_auto", "f_jpg").replace("/v1/", "/c_scale,w_960/v1/");

// Cards show a teaser; the full description lives on gdg.community.dev.
const MAX_DESCRIPTION = 160;
function teaser(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  // gdg.community.dev already cuts long texts mid-word and appends "...".
  const truncated = /(\.\.\.|…)$/.test(clean);
  if (!truncated && clean.length <= MAX_DESCRIPTION) return clean;
  const cut = clean.replace(/\s*(\.\.\.|…)$/, "").slice(0, MAX_DESCRIPTION + 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:.–-]+$/, "")}…`;
}

async function fetchAll() {
  const events = [];
  for (let url = API; url; ) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    const page = await res.json();
    events.push(...page.results);
    url = page.links?.next ?? null;
  }
  return events.filter((e) => !e.is_hidden);
}

const events = await fetchAll();
fs.mkdirSync(IMG_DIR, { recursive: true });

const data = [];
for (const e of events) {
  const title = e.title.replace(/\s+/g, " ").trim();
  const defaultBanner = !e.banner || /DefaultEventBanner/.test(e.cropped_banner_url ?? "");
  let banner = null;
  if (e.cropped_banner_url) {
    // Name files after the source image so banners shared by several events are stored once.
    const source = decodeURIComponent(path.basename(new URL(e.cropped_banner_url).pathname));
    banner = `${source.replace(/\.[a-z]+$/i, "").replace(/[^A-Za-z0-9_-]+/g, "-")}.jpg`;
    const file = path.join(IMG_DIR, banner);
    if (!fs.existsSync(file)) {
      const res = await fetch(smallBanner(e.cropped_banner_url));
      if (res.ok) fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      else banner = null;
    }
  }
  data.push({
    id: String(e.id),
    title,
    type: seriesOf(title),
    start: e.start_date,
    end: e.end_date,
    url: e.static_url,
    description: teaser(e.description_short ?? ""),
    virtual: Boolean(e.is_virtual_event),
    banner,
    defaultBanner,
  });
}
data.sort((a, b) => b.start.localeCompare(a.start));

// Drop banners of events that no longer exist.
const keep = new Set(data.map((e) => e.banner).filter(Boolean));
for (const f of fs.readdirSync(IMG_DIR)) if (!keep.has(f)) fs.unlinkSync(path.join(IMG_DIR, f));

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + "\n");

const bytes = [...keep].reduce((sum, f) => sum + fs.statSync(path.join(IMG_DIR, f)).size, 0);
const byType = data.reduce((acc, e) => ((acc[e.type] = (acc[e.type] ?? 0) + 1), acc), {});
console.log(`${data.length} events → src/data/events.json`);
console.log(`${keep.size} banners → src/assets/events (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
console.log("by type:", JSON.stringify(byType));
