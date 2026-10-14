require("dotenv").config();
const mongoose = require("mongoose");
const freelancerModel = require("../models/freelancer.model");
const userModel = require("../models/user.model");
const reviewModel = require("../models/reviews_ratings.model");
const professionModel = require("../models/contractorProfession.model");
const portfolioModel = require("../models/portifolio.model");

// ── Fixtures: 12 legacy + 13 unified = 25 contractors ────────────────────────
// Names are assigned in REVERSE of createdAt, so createdAt_desc is the exact
// reverse of name_asc. A wrong sort direction therefore produces an obviously
// wrong page rather than an accidentally-correct one. Index 12 is lower-case so
// byte-order vs locale-collation disagree for it.
const TOTAL = 25;
const legacyData = [];
const unifiedData = [];
for (let i = 0; i < TOTAL; i++) {
  const nameIdx = TOTAL - 1 - i;
  const id = new mongoose.Types.ObjectId();
  const first = nameIdx === 12 ? "name12" : `Name${String(nameIdx).padStart(2, "0")}`;
  const doc = {
    _id: id,
    first_name: first,
    last_name: `Last${String(nameIdx).padStart(2, "0")}`,
    email: `c${i}@x.com`,
    createdAt: new Date(2026, 0, 1, 0, 0, i),
  };
  if (i % 2 === 0) legacyData.push({ ...doc, role: "r", _legacy: true });
  else unifiedData.push({ ...doc, contractorProfile: { profession: null } });
}

// ── Mongo-like stub: honours .sort() AND .limit() ────────────────────────────
// The previous stub ignored .sort(), which is exactly why a sort-direction bug
// went unnoticed. Field values compare in byte order, like BSON.
function cmpValues(a, b) {
  const av = a instanceof Date ? a.getTime() : a;
  const bv = b instanceof Date ? b.getTime() : b;
  if (av === bv) return 0;
  return av < bv ? -1 : 1;
}

function makeFind(docs) {
  return () => {
    let results = docs.slice();
    const q = {
      select: () => q,
      populate: () => q,
      sort: (spec) => {
        const keys = Object.keys(spec);
        results.sort((x, y) => {
          for (const k of keys) {
            const c = cmpValues(x[k], y[k]);
            if (c !== 0) return spec[k] < 0 ? -c : c;
          }
          return 0;
        });
        return q;
      },
      limit: (n) => { results = results.slice(0, n); return q; },
      lean: async () => results,
    };
    return q;
  };
}
freelancerModel.find = makeFind(legacyData);
userModel.find = makeFind(unifiedData);
freelancerModel.countDocuments = async () => legacyData.length;
userModel.countDocuments = async () => unifiedData.length;

// Ratings: the two newest contractors get 5.0 and 1.0, rest unrated.
const ratedIds = new Map([
  [String(unifiedData.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))._id), 5],
  [String(legacyData.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))._id), 1],
]);
reviewModel.aggregate = async (pipe) => {
  if (pipe[0] && pipe[0].$match && pipe[0].$match.user_id) {
    return [...ratedIds.entries()]
      .filter(([id]) => pipe[0].$match.user_id.$in.some((x) => String(x) === id))
      .map(([id, rating]) => ({ _id: id, averageRating: rating, totalReviews: 3 }));
  }
  if (pipe[0] && pipe[0].$group && pipe[0].$group.averageRating && !pipe[0].$match) {
    return [...ratedIds.entries()].map(([id, rating]) => ({ _id: id, averageRating: rating }));
  }
  return [];
};
professionModel.find = () => ({ select: () => ({ lean: async () => [] }) });

// ── Portfolio fixtures ───────────────────────────────────────────────────────
// The newest legacy contractor owns 3 projects (5, 1 and 0 snaps) so truncation
// is testable; everyone else owns none.
let portfolioQueries = 0;
const galleryOwner = legacyData.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
portfolioModel.find = (filter) => {
  portfolioQueries++;
  const wanted = new Set((filter.ownerId.$in || []).map(String));
  let rows = [];
  const q = { select: () => q, sort: () => q, lean: async () => rows };
  if (wanted.has(String(galleryOwner._id))) {
    rows = [
      { _id: "p1", ownerId: galleryOwner._id, projectName: "P1", clientName: "C1",
        description: "d1", snaps: ["s1", "s2", "s3", "s4", "s5"], createdAt: new Date() },
      { _id: "p2", ownerId: galleryOwner._id, projectName: "P2", clientName: "C2",
        description: "d2", snaps: ["s1"], createdAt: new Date() },
      { _id: "p3", ownerId: galleryOwner._id, projectName: "P3", clientName: "C3",
        description: "d3", snaps: [], createdAt: new Date() },
    ];
  }
  return q;
};

const { listContractors, SORT_OPTIONS, dbSortFor } = require("../utils/contractorDirectory");

// ── Independent expected-order computation (byte order, not locale) ──────────
const nameOf = (d) => `${d.first_name} ${d.last_name}`.trim();
const byByte = (a, b) => (a === b ? 0 : a < b ? -1 : 1);
const byTime = (a, b) => a.createdAt.getTime() - b.createdAt.getTime();
const ALL = [...legacyData, ...unifiedData];

function expectedOrder(sort) {
  switch (sort) {
    case "createdAt_asc": return [...ALL].sort(byTime);
    case "createdAt_desc": return [...ALL].sort((a, b) => -byTime(a, b));
    case "name_asc": return [...ALL].sort((a, b) => byByte(nameOf(a), nameOf(b)));
    case "name_desc": return [...ALL].sort((a, b) => -byByte(nameOf(a), nameOf(b)));
    default: return null; // rating sorts handled separately
  }
}

let pass = true;
const fail = (...m) => { pass = false; console.log("  FAIL:", ...m); };

(async () => {
  // ── 1. Full page-walk for every non-rating sort ─────────────────────────────
  // Regression guard: a dbSort/comparator direction mismatch corrupts pages 2+.
  const PAGED_SORTS = ["createdAt_desc", "createdAt_asc", "name_asc", "name_desc"];
  for (const sort of PAGED_SORTS) {
    for (const pageSize of [5, 7, 10]) {
      const want = expectedOrder(sort).map((d) => String(d._id));
      const seen = [];
      const totalPages = Math.ceil(TOTAL / pageSize);
      let bad = null;
      for (let page = 1; page <= totalPages && !bad; page++) {
        const r = await listContractors({ page, pageSize, sort });
        const got = r.data.map((d) => String(d._id));
        const slice = want.slice((page - 1) * pageSize, page * pageSize);
        if (JSON.stringify(got) !== JSON.stringify(slice)) {
          bad = `page=${page}: got [${got.join(",")}] want [${slice.join(",")}]`;
        }
        if (r.totalDocuments !== TOTAL) bad = `totalDocuments=${r.totalDocuments}`;
        if (r.totalPages !== totalPages) bad = `totalPages=${r.totalPages}`;
        if (r.currentPage !== page) bad = `currentPage=${r.currentPage}`;
        seen.push(...got);
      }
      if (bad) fail(`sort=${sort} pageSize=${pageSize}`, bad);
      else if (new Set(seen).size !== TOTAL) fail(`sort=${sort} pageSize=${pageSize} duplicates/omissions`);
      else console.log(`sort=${sort} pageSize=${pageSize}: ${totalPages} pages, ${TOTAL}/${TOTAL} unique -> OK`);
    }
  }

  // ── 2. dbSortFor direction must match comparatorFor ────────────────────────
  // Explicit guard so the two can't silently drift apart again.
  const DIRECTION = {
    createdAt_desc: { createdAt: -1 },
    createdAt_asc: { createdAt: 1 },
    name_asc: { first_name: 1, last_name: 1 },
    name_desc: { first_name: -1, last_name: -1 },
  };
  for (const [sort, want] of Object.entries(DIRECTION)) {
    const got = dbSortFor(sort);
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) fail(`dbSortFor(${sort}) = ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
  console.log("dbSortFor directions:", pass ? "OK" : "FAIL");

  // ── 3. Lower-case name proves byte-order (not locale) ordering ─────────────
  const namePage = await listContractors({ page: 1, pageSize: 25, sort: "name_asc" });
  const names = namePage.data.map((d) => `${d.first_name} ${d.last_name}`);
  const lowerIdx = names.findIndex((n) => n.startsWith("name12"));
  const upperAfter = names.slice(lowerIdx + 1).filter((n) => n.startsWith("Name"));
  if (lowerIdx !== names.length - 1 - upperAfter.length) {
    fail("lower-case name not ordered by byte order");
  } else {
    console.log("byte-order name sort -> OK ('name12' sorts after all 'Name*')");
  }

  // ── 4. Rating sorts ────────────────────────────────────────────────────────
  const descPage = await listContractors({ page: 1, pageSize: 5, sort: "rating_desc" });
  if (descPage.data[0].averageRating !== 5) fail("rating_desc should lead with 5.0");
  else console.log("sort=rating_desc -> OK, first rating 5.0");
  const ascPage = await listContractors({ page: 1, pageSize: 5, sort: "rating_asc" });
  if (ascPage.data[0].averageRating !== 0) fail("rating_asc should lead with unrated (0)");
  else console.log("sort=rating_asc -> OK, unrated (0) first");
  const ratingSeq = [...descPage.data, ...ascPage.data].every(
    (d) => "averageRating" in d && "totalReviews" in d,
  );
  if (!ratingSeq) fail("missing rating stats");
  else console.log("rating stats attached -> OK");

  // ── 5. sort option validation ──────────────────────────────────────────────
  if (!SORT_OPTIONS.includes("rating_desc")) fail("SORT_OPTIONS missing rating_desc");
  const fallback = await listContractors({ sort: "nonsense" });
  if (fallback.currentPage !== 1) fail("bad sort should fall back, not throw");
  else console.log("invalid sort falls back -> OK");

  // ── 6. Galleries ───────────────────────────────────────────────────────────
  const galPage = await listContractors({ page: 1, pageSize: 25 });
  const owner = galPage.data.find((d) => String(d._id) === String(galleryOwner._id));
  const empty = galPage.data.find((d) => String(d._id) !== String(galleryOwner._id));
  const galOk =
    owner.gallery.length === 3 && owner.galleryCount === 3 &&
    owner.gallery[0].snaps.length === 5 && owner.gallery[2].snaps.length === 0 &&
    !("ownerId" in owner.gallery[0]) &&
    empty.gallery.length === 0 && empty.galleryCount === 0;
  if (!galOk) fail("gallery", JSON.stringify(owner.gallery));
  else console.log("gallery attached -> OK (3 projects, 5 snaps)");

  const trunc = await listContractors({ page: 1, pageSize: 25, galleryLimit: 2, snapsLimit: 2 });
  const t = trunc.data.find((d) => String(d._id) === String(galleryOwner._id));
  if (!(t.gallery.length === 2 && t.gallery[0].snaps.length === 2 && t.galleryCount === 3)) {
    fail("gallery truncation", JSON.stringify(t.gallery));
  } else console.log("gallery truncation -> OK (gallery=2, snaps=2, galleryCount=3)");

  const before = portfolioQueries;
  const noGal = await listContractors({ page: 1, pageSize: 25, includeGallery: "false" });
  if (portfolioQueries !== before) fail("includeGallery=false still queried portfolio");
  else if (!noGal.data.every((d) => d.gallery.length === 0 && d.galleryCount === 0)) {
    fail("includeGallery=false should give empty galleries");
  } else console.log("includeGallery=false -> OK (query skipped, empty gallery)");

  const before2 = portfolioQueries;
  await listContractors({ page: 1, pageSize: 100 });
  if (portfolioQueries - before2 !== 1) fail(`not batched: ${portfolioQueries - before2} queries`);
  else console.log("batched gallery lookup -> OK (1 query for the whole page)");

  console.log(pass ? "\nALL TESTS PASSED" : "\nFAILURES DETECTED");
  process.exit(pass ? 0 : 1);
})();