require("dotenv").config();
const mongoose = require("mongoose");
const freelancerModel = require("../models/freelancer.model");
const userModel = require("../models/user.model");
const reviewModel = require("../models/reviews_ratings.model");
const professionModel = require("../models/contractorProfession.model");
const portfolioModel = require("../models/portifolio.model");

// ── Build a fake combined dataset: 12 legacy + 13 unified = 25 contractors ──
const legacyData = [];
const unifiedData = [];
for (let i = 0; i < 25; i++) {
  const id = new mongoose.Types.ObjectId();
  const doc = {
    _id: id,
    first_name: `First${i}`,
    last_name: `Last${String(i).padStart(2, "0")}`,
    email: `c${i}@x.com`,
    // Deliberately interleaved createdAt so neither collection is contiguous
    createdAt: new Date(2026, 0, 1, 0, 0, i),
  };
  if (i % 2 === 0) legacyData.push({ ...doc, role: "r", _legacy: true });
  else unifiedData.push({ ...doc, contractorProfile: { profession: null } });
}

const base = new Date(2026, 0, 1).getTime();
const byCreatedAtDesc = (a, b) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
legacyData.sort(byCreatedAtDesc);
unifiedData.sort(byCreatedAtDesc);

// ── Stub the mongoose query chain ────────────────────────────────────────────
function makeFind(docs) {
  return () => {
    let results = docs.slice();
    const q = {
      select: () => q,
      populate: () => q,
      sort: () => q,
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

// Ratings: contractor 0 gets 5.0, contractor 1 gets 1.0, rest unrated.
const ratedIds = new Map([
  [String(legacyData[0]._id), 5],
  [String(unifiedData[0]._id), 1],
]);
reviewModel.aggregate = async (pipe) => {
  if (pipe[0] && pipe[0].$match && pipe[0].$match.user_id) {
    return [...ratedIds.entries()]
      .filter(([id]) => pipe[0].$match.user_id.$in.some((x) => String(x) === id))
      .map(([id, rating]) => ({
        _id: id, averageRating: rating, totalReviews: 3,
      }));
  }
  if (pipe[0] && pipe[0].$group && pipe[0].$group.averageRating && !pipe[0].$match) {
    return [...ratedIds.entries()].map(([id, rating]) => ({ _id: id, averageRating: rating }));
  }
  return [];
};
professionModel.find = () => ({ select: () => ({ lean: async () => [] }) });

// ── Portfolio fixtures ───────────────────────────────────────────────────────
// legacyData[0] gets 3 projects (one with 5 snaps) so truncation is testable;
// everyone else gets none. Assert the lookup is a single batched $in query.
let portfolioQueries = 0;
portfolioModel.find = (filter) => {
  portfolioQueries++;
  const wanted = new Set((filter.ownerId.$in || []).map(String));
  let rows = [];
  const q = {
    select: () => q,
    sort: () => q,
    lean: async () => rows,
  };
  if (wanted.has(String(legacyData[0]._id))) {
    rows = [
      { _id: "p1", ownerId: legacyData[0]._id, projectName: "P1", clientName: "C1",
        description: "d1", snaps: ["s1","s2","s3","s4","s5"], createdAt: new Date() },
      { _id: "p2", ownerId: legacyData[0]._id, projectName: "P2", clientName: "C2",
        description: "d2", snaps: ["s1"], createdAt: new Date() },
      { _id: "p3", ownerId: legacyData[0]._id, projectName: "P3", clientName: "C3",
        description: "d3", snaps: [], createdAt: new Date() },
    ];
  }
  return q;
};

const { listContractors } = require("../utils/contractorDirectory");

const ids = (page) => page.data.map((d) => String(d._id));

(async () => {
  // The expected full ordering: newest-first across BOTH collections.
  const expected = [...legacyData, ...unifiedData].sort(byCreatedAtDesc);
  let pass = true;
  const seen = [];

  for (const pageSize of [5, 7, 10]) {
    seen.length = 0;
    const total = expected.length;
    const totalPages = Math.ceil(total / pageSize);
    for (let page = 1; page <= totalPages; page++) {
      const r = await listContractors({ page, pageSize });
      const got = ids(r);
      const want = expected
        .slice((page - 1) * pageSize, page * pageSize)
        .map((d) => String(d._id));
      const ok = JSON.stringify(got) === JSON.stringify(want);
      if (!ok) { pass = false; console.log(`  MISMATCH pageSize=${pageSize} page=${page}`); console.log("   got ", got); console.log("   want", want); }
      seen.push(...got);
      if (r.totalDocuments !== total) { pass = false; console.log(`  BAD total pageSize=${pageSize} page=${page}: ${r.totalDocuments} != ${total}`); }
      if (r.totalPages !== totalPages) { pass = false; console.log(`  BAD totalPages: ${r.totalPages} != ${totalPages}`); }
      if (r.currentPage !== page) { pass = false; console.log(`  BAD currentPage: ${r.currentPage} != ${page}`); }
    }
    // No duplicates and nothing missed across the whole paged walk.
    if (new Set(seen).size !== total) { pass = false; console.log(`  DUPLICATES/MISSES at pageSize=${pageSize}`); }
    console.log(`pageSize=${pageSize}: walked ${seen.length}/${total} docs, unique=${new Set(seen).size} -> ${pass ? "OK" : "FAIL"}`);
  }

  // name_asc ordering
  const namePage = await listContractors({ page: 1, pageSize: 5, sort: "name_asc" });
  const names = namePage.data.map((d) => `${d.first_name} ${d.last_name}`);
  const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
  const nameOk = JSON.stringify(names) === JSON.stringify(sortedNames);
  if (!nameOk) { pass = false; console.log("  BAD name_asc", names); }
  console.log("sort=name_asc ->", nameOk ? "OK" : "FAIL", names.slice(0, 2));

  // rating_desc: rated (5.0) must come first
  const ratingPage = await listContractors({ page: 1, pageSize: 5, sort: "rating_desc" });
  console.log("sort=rating_desc -> first rating:", ratingPage.data[0].averageRating,
    "| ratings:", ratingPage.data.map((d) => d.averageRating).join(","));
  const ratingOk = ratingPage.data[0].averageRating === 5;
  if (!ratingOk) { pass = false; }

  // Every returned doc must carry rating stats + be sanitised
  const anyDoc = ratingPage.data[0];
  const shapeOk = "averageRating" in anyDoc && "totalReviews" in anyDoc;
  if (!shapeOk) { pass = false; console.log("  MISSING rating stats"); }
  console.log("rating stats attached ->", shapeOk ? "OK" : "FAIL");

  // ── Galleries ──────────────────────────────────────────────────────────────
  // legacyData[0] owns 3 projects (5, 1 and 0 snaps).
  const galPage = await listContractors({ page: 1, pageSize: 25 });
  const owner = galPage.data.find((d) => String(d._id) === String(legacyData[0]._id));
  const empty  = galPage.data.find((d) => String(d._id) !== String(legacyData[0]._id));

  const galOk =
    Array.isArray(owner.gallery) &&
    owner.gallery.length === 3 &&
    owner.galleryCount === 3 &&
    owner.gallery[0].projectName === "P1" &&
    owner.gallery[0].snaps.length === 5 &&
    owner.gallery[2].snaps.length === 0 &&
    !("ownerId" in owner.gallery[0]) &&
    Array.isArray(empty.gallery) && empty.gallery.length === 0 && empty.galleryCount === 0;
  if (!galOk) { pass = false; console.log("  BAD gallery", JSON.stringify(owner.gallery, null, 2)); }
  console.log("gallery attached ->", galOk ? "OK" : "FAIL",
    `(${owner.gallery.length} projects, ${owner.gallery[0].snaps.length} snaps)`);

  // Truncation: galleryLimit=2 / snapsLimit=2, but galleryCount stays truthful.
  const truncPage = await listContractors({ page: 1, pageSize: 25, galleryLimit: 2, snapsLimit: 2 });
  const t = truncPage.data.find((d) => String(d._id) === String(legacyData[0]._id));
  const truncOk = t.gallery.length === 2 && t.gallery[0].snaps.length === 2 && t.galleryCount === 3;
  if (!truncOk) { pass = false; console.log("  BAD truncation", JSON.stringify(t.gallery)); }
  console.log("gallery truncation ->", truncOk ? "OK" : "FAIL",
    `(gallery=${t.gallery.length}, snaps=${t.gallery[0].snaps.length}, count=${t.galleryCount})`);

  // includeGallery=false must skip the portfolio query entirely.
  const before = portfolioQueries;
  const noGal = await listContractors({ page: 1, pageSize: 25, includeGallery: "false" });
  const skipped = portfolioQueries === before;
  const noGalOk = skipped &&
    noGal.data.every((d) => Array.isArray(d.gallery) && d.gallery.length === 0 && d.galleryCount === 0);
  if (!noGalOk) { pass = false; console.log("  BAD includeGallery=false"); }
  console.log("includeGallery=false ->", noGalOk ? "OK" : "FAIL", "(portfolio query skipped)");

  // One batched $in query per page, never one per contractor.
  const before2 = portfolioQueries;
  await listContractors({ page: 1, pageSize: 100 });
  const batched = portfolioQueries - before2 === 1;
  if (!batched) { pass = false; console.log(`  NOT BATCHED: ${portfolioQueries - before2} portfolio queries`); }
  console.log("batched gallery lookup ->", batched ? "OK" : "FAIL", "(1 query for the whole page)");

  console.log(pass ? "\nALL PAGINATION TESTS PASSED" : "\nFAILURES DETECTED");
  process.exit(pass ? 0 : 1);
})();