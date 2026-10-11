import fs from "node:fs";

const catalogue = JSON.parse(fs.readFileSync("data/catalogue.json", "utf8"));
const jobs = JSON.parse(fs.readFileSync("data/jobs.json", "utf8"));
const homes = JSON.parse(fs.readFileSync("data/homes.json", "utf8"));
const venues = JSON.parse(fs.readFileSync("data/venues.json", "utf8"));

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;

const lines = [
  "-- Seed data. Run after 001_london_life.sql",
  "",
  "insert into homes (id, name, zone, width, height, rent_pence, buy_pence) values",
  homes
    .map(
      (home) =>
        `(${[quote(home.id), quote(home.name), home.zone, home.width, home.height, home.rentPence, home.buyPence === null ? "null" : home.buyPence].join(", ")})`,
    )
    .join(",\n") + " on conflict (id) do nothing;",
  "",
  "insert into venues (id, name, zone) values",
  venues
    .map((venue) => `(${[quote(venue.id), quote(venue.name), venue.zone].join(", ")})`)
    .join(",\n") + " on conflict (id) do nothing;",
  "",
  "insert into catalogue_items (id, name, category, footprint, wall, price_pence, tier, blocks, effects) values",
  catalogue
    .map((item) => {
      const wall = item.footprint === "wall";
      const footprint = wall ? "null" : `'{${item.footprint.join(",")}}'`;
      const effects = `${quote(JSON.stringify({ effect: item.effect, action: item.action }))}::jsonb`;
      return `(${[quote(item.id), quote(item.name), quote(item.category), footprint, wall, item.pricePence, item.tier, item.blocks, effects].join(", ")})`;
    })
    .join(",\n") + " on conflict (id) do nothing;",
  "",
  "insert into jobs (id, name, venue, pay_per_hour_pence, hours, skill, skill_required, energy_cost, xp_skill, tips) values",
  jobs
    .map(
      (job) =>
        `(${[quote(job.id), quote(job.name), quote(job.venue), job.payPerHourPence, job.hours, job.skill ? quote(job.skill) : "null", job.skillRequired, job.energyCost, quote(job.xpSkill), job.tips].join(", ")})`,
    )
    .join(",\n") + " on conflict (id) do nothing;",
  "",
];

fs.writeFileSync("supabase/migrations/002_seed.sql", lines.join("\n"));
console.log(`catalogue ${catalogue.length}`);
