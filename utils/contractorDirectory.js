/**
 * SHARED CONTRACTOR DIRECTORY QUERIES
 * ===================================
 *
 * Contractors live in TWO collections:
 *   - `freelancer` — the legacy registration flow, discriminated by the
 *     hard-coded contractor `role` ObjectId.
 *   - `user`       — the unified multi-role model, where a contractor is any
 *     account whose `roles` array contains "contractor".
 *
 * Everything that needs a paginated, filterable contractor list (the
 * `/get/contractors` directory endpoint and the `/search/contractors`
 * filtered endpoint) goes through this module so both stay consistent and,
 * critically, so pagination is applied in the database rather than by
 * loading every document and slicing in memory.
 *
 * Each returned contractor is also enriched with:
 *   averageRating / totalReviews  — aggregated from the `reviewsRatings`
 *                                    collection (one batched query per page)
 *   gallery / galleryCount         — portfolio projects + images from the
 *                                    `portfolio` collection (one batched
 *                                    query per page)
 * Both enrichments are batched across the whole page, so the cost is two extra
 * queries per request regardless of page size — never a query per contractor.
 *
 * Pagination across two collections:
 *   Each source is sorted and read only as far as `skip + pageSize` documents,
 *   the two windows are merged, re-sorted with the same comparator and then
 *   sliced to the requested page. Because both windows are already ordered by
 *   the sort key, the slice is identical to paginating the combined set —
 *   without ever loading the full collection.
 */

const mongoose = require("mongoose");
const freelancerModel = require("../models/freelancer.model");
const userModel = require("../models/user.model");
const reviewModel = require("../models/reviews_ratings.model");
const professionModel = require("../models/contractorProfession.model");
const portfolioModel = require("../models/portifolio.model");

// The legacy `freelancer` role ObjectId that marks an account as a contractor.
// (Consultants use a different role id — see FreelancerController.consultants.)
const CONTRACTOR_ROLE_ID = "65c35d821f9b6742f96bbd96";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

// Gallery payloads are truncated so a contractor with a long portfolio history
// can't blow up a directory response. Both are overridable per request.
const DEFAULT_GALLERY_LIMIT = 6;
const DEFAULT_SNAPS_LIMIT = 6;
const MAX_GALLERY_LIMIT = 50;
const MAX_SNAPS_LIMIT = 50;

// Sorts that depend on the computed average rating rather than a stored field,
// so they can't be pushed into the database query.
const RATING_SORTS = new Set(["rating_desc", "rating_asc"]);

const SORT_OPTIONS = [
  "createdAt_desc",
  "createdAt_asc",
  "name_asc",
  "name_desc",
  "rating_desc",
  "rating_asc",
];

// Passwords and auth secrets must never leave the server. The legacy
// freelancer schema also carries `password`, `otp`, `otpToken` and reset
// tokens, which are all stripped from every directory projection.
const PUBLIC_FIELDS =
  "-password -otp -otpToken -passwordResetToken -passwordResetTokenExpires " +
  "-passwordChangedAt";

const UNIFIED_PUBLIC_FIELDS =
  "first_name last_name email tel_num country address gender location " +
  "profile_pic contractorProfile createdAt";

/** Escape user input so it is safe to embed in a RegExp. */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Parse `page` / `pageSize` query params, clamped to sane bounds. */
function parsePagination(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const requested = parseInt(query.pageSize, 10) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, requested));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

/** Normalise the `sort` query param, falling back to newest-first. */
function normaliseSort(sort) {
  return SORT_OPTIONS.includes(sort) ? sort : "createdAt_desc";
}

function toObjectId(value) {
  if (!value) return null;
  const str = String(value);
  return mongoose.Types.ObjectId.isValid(str)
    ? new mongoose.Types.ObjectId(str)
    : null;
}

function fullName(doc) {
  return `${doc.first_name || ""} ${doc.last_name || ""}`.trim();
}

/**
 * Compare strings the way MongoDB does (raw code-unit/byte order) instead of
 * `localeCompare`. `localeCompare` is locale- and case-aware, so it would sort
 * "alice" before "Bob" while Mongo's BSON ordering puts "Bob" first ("B" = 0x42
 * < "a" = 0x61). Any divergence between the per-collection window and the
 * in-memory merge would break pagination, so both sides must use byte order.
 */
function compareStrings(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function timeOf(doc) {
  const value = doc.createdAt ? new Date(doc.createdAt).getTime() : 0;
  return Number.isNaN(value) ? 0 : value;
}

/**
 * Comparator for the merged (in-memory) window. Must order identically to the
 * database-side sort so that paginating the combined set stays consistent.
 * (See `dbSortFor` — the two must stay in lockstep.)
 */
function comparatorFor(sort) {
  switch (sort) {
    case "createdAt_asc":
      return (a, b) => timeOf(a) - timeOf(b);
    case "name_asc":
      return (a, b) => compareStrings(fullName(a), fullName(b));
    case "name_desc":
      return (a, b) => compareStrings(fullName(b), fullName(a));
    case "rating_asc":
      return (a, b) => (a.averageRating ?? 0) - (b.averageRating ?? 0);
    case "rating_desc":
      return (a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0);
    case "createdAt_desc":
    default:
      return (a, b) => timeOf(b) - timeOf(a);
  }
}

/**
 * The database-side sort matching each option, used to pick the top
 * `skip + pageSize` candidates from EACH collection before merging them.
 *
 * The direction here MUST equal the direction in `comparatorFor`. Each source is
 * queried in the final sort order so that the union of the two per-collection
 * top-N windows is guaranteed to contain the true global page. Querying one
 * collection in the opposite direction would return that collection's *worst*
 * candidates and silently drop the correct ones — e.g. for `name_desc`,
 * fetching each source's 60 alphabetically-earliest names can never surface a
 * late-page name that sorts 5th from the top.
 */
function dbSortFor(sort) {
  switch (sort) {
    case "createdAt_asc":
      return { createdAt: 1 };
    case "name_asc":
      return { first_name: 1, last_name: 1 };
    case "name_desc":
      return { first_name: -1, last_name: -1 };
    case "createdAt_desc":
    default:
      return { createdAt: -1 };
  }
}

/**
 * Resolve the `profession` filter, accepting either a profession ObjectId or a
 * profession name (so clients can filter with the exact string they display).
 * Returns null when no profession filter was requested, otherwise an array of
 * ObjectIds — possibly empty, which correctly matches nothing.
 */
async function resolveProfessionFilter(value) {
  if (value === undefined || value === null || value === "") return null;

  const asId = toObjectId(value);
  if (asId) return [asId];

  const professions = await professionModel
    .find({ name: { $regex: escapeRegex(value), $options: "i" } })
    .select("_id")
    .lean();

  return professions.map((p) => p._id);
}

/**
 * Resolve the `minRating` filter to the ids of contractors whose average
 * rating clears the threshold. Returns null when no rating filter was
 * requested, otherwise an array of ids — possibly empty, which correctly
 * matches nothing.
 *
 * Ratings live in `reviewsRatings`, keyed by the reviewed user's id, so the
 * average is computed there rather than stored on the contractor document.
 */
async function resolveRatingFilter(minRating) {
  const threshold = parseFloat(minRating);
  if (isNaN(threshold) || threshold <= 0) return null;

  const rows = await reviewModel.aggregate([
    { $group: { _id: "$user_id", averageRating: { $avg: "$rating" } } },
    { $match: { averageRating: { $gte: threshold } } },
    { $project: { _id: 1 } },
  ]);

  return rows.map((row) => row._id);
}

/**
 * Build the Mongo filter for both collections from the request query.
 *
 * Supported query params:
 *   name               partial, case-insensitive match on first/last name
 *   profession         profession ObjectId or profession name
 *   minRating          minimum average rating (1-5)
 *   country            partial, case-insensitive
 *   location           partial match on `location` or `address`
 *   skills             comma-separated; matches contractors having ANY of them
 *   minExperience      minimum years of experience
 *   active             true/false account status
 *   q                  free text over name, location, address, skills and bio
 *
 * Conditions are collected into `$and` so that the free-text `q` search and the
 * explicit filters can both contribute `$or` clauses without colliding.
 */
async function buildFilters(query = {}) {
  const legacy = { role: CONTRACTOR_ROLE_ID };
  const unified = { roles: { $in: ["contractor"] } };
  const legacyClauses = [];
  const unifiedClauses = [];

  const name = (query.name || "").trim();
  if (name) {
    const rx = { $regex: escapeRegex(name), $options: "i" };
    legacyClauses.push({ $or: [{ first_name: rx }, { last_name: rx }] });
    unifiedClauses.push({ $or: [{ first_name: rx }, { last_name: rx }] });
  }

  const professionIds = await resolveProfessionFilter(query.profession);
  if (professionIds) {
    legacyClauses.push({ profession: { $in: professionIds } });
    unifiedClauses.push({ "contractorProfile.profession": { $in: professionIds } });
  }

  // Filter by trade category, matched case-insensitively because the label is
  // free text typed by hand on the profile. Applies to both collections so one
  // query parameter covers legacy and unified contractors alike.
  const workingCategory = (query.working_category || query.category || "").trim();
  if (workingCategory) {
    const rx = { $regex: escapeRegex(workingCategory), $options: "i" };
    legacyClauses.push({ working_category: rx });
    unifiedClauses.push({ "contractorProfile.working_category": rx });
  }

  const minRatingIds = await resolveRatingFilter(query.minRating);
  if (minRatingIds) {
    const idFilter = { _id: { $in: minRatingIds } };
    legacyClauses.push(idFilter);
    unifiedClauses.push(idFilter);
  }

  const country = (query.country || "").trim();
  if (country) {
    const rx = { $regex: escapeRegex(country), $options: "i" };
    legacyClauses.push({ country: rx });
    unifiedClauses.push({ country: rx });
  }

  const location = (query.location || "").trim();
  if (location) {
    const rx = { $regex: escapeRegex(location), $options: "i" };
    legacyClauses.push({ $or: [{ location: rx }, { address: rx }] });
    unifiedClauses.push({ $or: [{ location: rx }, { address: rx }] });
  }

  const skills = (query.skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (skills.length) {
    const anySkill = { $in: skills.map((s) => ({ $regex: escapeRegex(s), $options: "i" })) };
    legacyClauses.push({ skills: anySkill });
    unifiedClauses.push({ "contractorProfile.skills": anySkill });
  }

  const minExperience = parseInt(query.minExperience, 10);
  if (!isNaN(minExperience) && minExperience > 0) {
    legacyClauses.push({ yearsOfExperience: { $gte: minExperience } });
    unifiedClauses.push({ "contractorProfile.yearsOfExperience": { $gte: minExperience } });
  }

  if (query.active !== undefined && query.active !== "") {
    const active = String(query.active) === "true";
    legacyClauses.push({ active });
    unifiedClauses.push({ active });
  }

  const freeText = (query.q || "").trim();
  if (freeText) {
    const rx = { $regex: escapeRegex(freeText), $options: "i" };
    const or = [
      { first_name: rx },
      { last_name: rx },
      { location: rx },
      { address: rx },
      { skills: rx },
      { bio: rx },
    ];
    legacyClauses.push({ $or: or });
    unifiedClauses.push({
      $or: [
        { first_name: rx },
        { last_name: rx },
        { location: rx },
        { address: rx },
        { "contractorProfile.skills": rx },
        { "contractorProfile.bio": rx },
      ],
    });
  }

  if (legacyClauses.length) legacy.$and = legacyClauses;
  if (unifiedClauses.length) unified.$and = unifiedClauses;

  return { legacy, unified };
}

/**
 * Normalise a populated profession into the `{ _id, name }` shape the Flutter
 * app parses (models/JobPost.dart calls Profession.fromJson on it).
 *
 * The legacy `freelancer` collection gets this shape from
 * `.populate("profession", "name")`. Unified users store theirs at
 * `contractorProfile.profession`, so without an explicit populate that field
 * comes back as a bare ObjectId string — clients then see a blank profession
 * name, and contractor_jobs.dart crashes calling fromJson on a string.
 */
function shapeProfession(populated) {
  if (!populated) return null;
  // Already populated (object with a name).
  if (typeof populated === "object" && populated.name !== undefined) {
    return { _id: populated._id, name: populated.name };
  }
  // Not populated, or the referenced profession was deleted — fall back to the
  // id only so the client can still render something rather than nothing.
  return { _id: populated, name: "" };
}

/**
 * Reshape a unified `user` contractor into the freelancer-like document shape
 * the Flutter app already parses, so callers can treat both collections as one
 * list. Keeps `_source` so clients can tell where a record came from.
 */
function normaliseUnifiedUser(user) {
  const profile = user.contractorProfile || {};
  return {
    _id: user._id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    tel_num: user.tel_num,
    profile_pic: user.profile_pic,
    gender: user.gender,
    country: user.country,
    address: user.address,
    location: user.location,
    profession: shapeProfession(profile.profession),
    working_category: profile.working_category ?? "",
    bio: profile.bio ?? "",
    skills: profile.skills ?? [],
    certifications: profile.certifications ?? [],
    yearsOfExperience: profile.yearsOfExperience ?? 0,
    profileCompleted: profile.profileCompleted ?? false,
    active: user.active,
    role: "contractor",
    createdAt: user.createdAt,
    _source: "unified",
  };
}

/** Attach averageRating / totalReviews to a page of contractors. */
async function attachRatings(contractors) {
  if (!contractors.length) return contractors;

  const ids = contractors.map((c) => c._id);
  const rows = await reviewModel.aggregate([
    { $match: { user_id: { $in: ids } } },
    {
      $group: {
        _id: "$user_id",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const byId = new Map(rows.map((row) => [String(row._id), row]));
  return contractors.map((contractor) => {
    const stats = byId.get(String(contractor._id));
    return {
      ...contractor,
      averageRating: stats ? Math.round(stats.averageRating * 10) / 10 : 0,
      totalReviews: stats ? stats.totalReviews : 0,
    };
  });
}

/**
 * Read each collection only as far as `skip + pageSize`, then merge + slice.
 * Used for the sorts that Mongo can order directly.
 */
async function paginatedWindow({ legacy, unified, sort, skip, pageSize }) {
  const window = skip + pageSize;
  const dbSort = dbSortFor(sort);

  const [legacyRows, unifiedRows] = await Promise.all([
    freelancerModel
      .find(legacy)
      .select(PUBLIC_FIELDS)
      .sort(dbSort)
      .limit(window)
      .populate("profession", "name")
      .lean(),
    userModel
      .find(unified)
      .select(UNIFIED_PUBLIC_FIELDS)
      .sort(dbSort)
      .limit(window)
      // Without this the unified branch returns a raw ObjectId where the
      // legacy branch returns { _id, name }.
      .populate("contractorProfile.profession", "name")
      .lean(),
  ]);

  const merged = [
    ...legacyRows.map((row) => ({ ...row, _source: "legacy" })),
    ...unifiedRows.map(normaliseUnifiedUser),
  ].sort(comparatorFor(sort));

  return merged.slice(skip, skip + pageSize);
}

/**
 * Exact pagination for rating-sorted results. The average rating is computed
 * rather than stored, so the ordering can't be pushed into either collection's
 * query: rank the matching ids by rating first, take the requested slice, then
 * load the full documents for just those ids.
 */
async function ratingRankedPage({ legacy, unified, sort, skip, pageSize }) {
  const [legacyIds, unifiedIds, ratingRows] = await Promise.all([
    freelancerModel.find(legacy).select("_id").sort({ createdAt: -1 }).lean(),
    userModel.find(unified).select("_id").sort({ createdAt: -1 }).lean(),
    reviewModel.aggregate([
      { $group: { _id: "$user_id", averageRating: { $avg: "$rating" } } },
    ]),
  ]);

  const averageById = new Map(ratingRows.map((row) => [String(row._id), row.averageRating]));
  const tagged = [
    ...legacyIds.map((row) => ({ id: row._id, averageRating: averageById.get(String(row._id)) ?? 0 })),
    ...unifiedIds.map((row) => ({ id: row._id, averageRating: averageById.get(String(row._id)) ?? 0 })),
  ].sort(comparatorFor(sort));

  const pageIds = tagged.slice(skip, skip + pageSize);
  if (!pageIds.length) return [];

  const ids = pageIds.map((entry) => entry.id);
  const [legacyRows, unifiedRows] = await Promise.all([
    freelancerModel
      .find({ _id: { $in: ids } })
      .select(PUBLIC_FIELDS)
      .populate("profession", "name")
      .lean(),
    userModel
      .find({ _id: { $in: ids } })
      .select(UNIFIED_PUBLIC_FIELDS)
      .populate("contractorProfile.profession", "name")
      .lean(),
  ]);

  const documents = new Map([
    ...legacyRows.map((row) => [String(row._id), { ...row, _source: "legacy" }]),
    ...unifiedRows.map((user) => [String(user._id), normaliseUnifiedUser(user)]),
  ]);

  return pageIds
    .map((entry) => documents.get(String(entry.id)))
    .filter(Boolean);
}

/** Clamp a numeric query param into [min, max], with a default. */
function clampInt(value, { fallback, min, max }) {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Parse the gallery options from the request query.
 *
 *   includeGallery  "false" to omit galleries entirely (default: included)
 *   galleryLimit    max portfolio projects per contractor (default 6, max 50)
 *   snapsLimit      max images per project (default 6, max 50)
 */
function parseGalleryOptions(query = {}) {
  const includeGallery =
    query.includeGallery === undefined
      ? true
      : String(query.includeGallery).toLowerCase() !== "false";
  return {
    includeGallery,
    galleryLimit: clampInt(query.galleryLimit, {
      fallback: DEFAULT_GALLERY_LIMIT,
      min: 0,
      max: MAX_GALLERY_LIMIT,
    }),
    snapsLimit: clampInt(query.snapsLimit, {
      fallback: DEFAULT_SNAPS_LIMIT,
      min: 0,
      max: MAX_SNAPS_LIMIT,
    }),
  };
}

/**
 * Attach each contractor's portfolio ("gallery") to the page of results.
 *
 * Portfolio entries live in a separate `portfolio` collection keyed by
 * `ownerId`, so the whole page is resolved with ONE batched `$in` query rather
 * than a query per contractor. Projects are returned newest-first, truncated to
 * `galleryLimit`; `galleryCount` still reports the true total so clients can
 * tell that a gallery was truncated.
 */
async function attachGalleries(contractors, options = {}) {
  const { includeGallery, galleryLimit, snapsLimit } = {
    galleryLimit: DEFAULT_GALLERY_LIMIT,
    snapsLimit: DEFAULT_SNAPS_LIMIT,
    ...options,
  };

  if (!includeGallery || !contractors.length) {
    return contractors.map((c) => ({ ...c, gallery: [], galleryCount: 0 }));
  }

  const rows = await portfolioModel
    .find({ ownerId: { $in: contractors.map((c) => c._id) } })
    // `__v` is requested explicitly: clients reuse their existing portfolio
    // model, whose `fromJson` reads `__v` as a non-nullable int.
    .select("ownerId clientName projectName description snaps createdAt updatedAt __v")
    .sort({ _id: -1 })
    .lean();

  const byOwner = new Map();
  for (const row of rows) {
    const key = String(row.ownerId);
    if (!byOwner.has(key)) byOwner.set(key, []);
    byOwner.get(key).push({
      _id: row._id,
      clientName: row.clientName,
      projectName: row.projectName,
      description: row.description,
      snaps: Array.isArray(row.snaps) ? row.snaps.slice(0, snapsLimit) : [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      __v: row.__v,
    });
  }

  return contractors.map((contractor) => {
    const projects = byOwner.get(String(contractor._id)) || [];
    return {
      ...contractor,
      gallery: projects.slice(0, galleryLimit),
      // True total, even when `gallery` was truncated for payload size.
      galleryCount: projects.length,
    };
  });
}

/**
 * Paginated, filterable contractor list.
 *
 * @param {object} query  Express `req.query` (see buildFilters for params).
 * @returns {Promise<{totalDocuments:number,totalPages:number,currentPage:number,pageSize:number,data:object[]}>}
 */
async function listContractors(query = {}) {
  const { page, pageSize, skip } = parsePagination(query);
  const sort = normaliseSort(query.sort);
  const galleryOptions = parseGalleryOptions(query);
  const { legacy, unified } = await buildFilters(query);

  const [legacyTotal, unifiedTotal] = await Promise.all([
    freelancerModel.countDocuments(legacy),
    userModel.countDocuments(unified),
  ]);
  const totalDocuments = legacyTotal + unifiedTotal;

  const data = RATING_SORTS.has(sort)
    ? await ratingRankedPage({ legacy, unified, sort, skip, pageSize })
    : await paginatedWindow({ legacy, unified, sort, skip, pageSize });

  const rated = await attachRatings(data);

  return {
    totalDocuments,
    totalPages: Math.ceil(totalDocuments / pageSize),
    currentPage: page,
    pageSize,
    data: await attachGalleries(rated, galleryOptions),
  };
}

module.exports = {
  CONTRACTOR_ROLE_ID,
  SORT_OPTIONS,
  parsePagination,
  normaliseSort,
  parseGalleryOptions,
  buildFilters,
  normaliseUnifiedUser,
  attachRatings,
  attachGalleries,
  listContractors,
  // Exported so tests can assert the database-side sort and the in-memory
  // comparator stay in agreement — that pairing is easy to break silently.
  dbSortFor,
  comparatorFor,
};