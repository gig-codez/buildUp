require("dotenv").config();
const mongoose = require("mongoose");
const freelancerModel = require("../models/freelancer.model");
const userModel = require("../models/user.model");
const reviewModel = require("../models/reviews_ratings.model");
const portfolioModel = require("../models/portifolio.model");

const oid = () => new mongoose.Types.ObjectId();

// A legacy contractor document carrying every schema field (incl. secrets).
const legacyFull = {
  _id: oid(),
  profile_pic: "https://cdn/legacy.jpg",
  email: "legacy@buildup.ug",
  password: "$2b$10$HASH",
  category: "Construction",
  first_name: "Grace",
  last_name: "Nabirye",
  tel_num: 256700111222,
  country: "Uganda",
  NIN_NUM: "NIN-1990-001",
  profession: oid(),
  balance: 45000,
  address: "Ntinda, Kampala",
  gender: "Female",
  role: oid(),
  otp: "123456",
  otpToken: "otp-tok",
  active: true,
  emailVerified: true,
  bio: "Mason with 8 years on commercial sites.",
  yearsOfExperience: 8,
  location: "Kampala",
  skills: ["Masonry", "Tiling"],
  certifications: ["NCC"],
  profileCompleted: true,
  passwordChangedAt: new Date("2026-01-01"),
  passwordResetToken: "reset-tok",
  passwordResetTokenExpires: new Date("2026-02-01"),
  createdAt: new Date("2026-05-01T09:00:00Z"),
  updatedAt: new Date("2026-06-01T09:00:00Z"),
  __v: 3,
};

// A unified `user` contractor document.
const unifiedFull = {
  _id: oid(),
  profile_pic: "https://cdn/unified.jpg",
  first_name: "Daniel",
  last_name: "Ouma",
  email: "daniel@buildup.ug",
  password: "$2b$10$HASH",
  tel_num: "256700333444",
  country: "Uganda",
  address: "Jinja",
  gender: "Male",
  location: "Jinja",
  roles: ["contractor", "client"],
  activeRole: "contractor",
  contractorProfile: {
    profession: oid(),
    NIN_NUM: "NIN-1995-777",
    bio: "Electrician, 5 years.",
    yearsOfExperience: 5,
    skills: ["Electrical", "Wiring"],
    certifications: ["ECCE"],
    profileCompleted: true,
  },
  createdAt: new Date("2026-05-15T09:00:00Z"),
  updatedAt: new Date("2026-06-15T09:00:00Z"),
  __v: 1,
};

// Stub the chain, applying the same projections Mongoose would.
freelancerModel.find = () => {
  const q = {
    // Honour negative projections so the output below reflects what Mongoose
    // would actually return from `.select(PUBLIC_FIELDS)`.
    select: (s) => {
      const excluded = s.split(/\s+/).filter((f) => f.startsWith("-")).map((f) => f.slice(1));
      q.__excluded = excluded;
      return q;
    },
    sort: () => q,
    limit: () => q,
    populate: (path, sel) => q,
    lean: async () => {
      const out = { ...legacyFull };
      (q.__excluded || []).forEach((f) => delete out[f]);
      return [out];
    },
  };
  return q;
};
// Simulate mongoose's `.select()` on the unified query.
userModel.find = () => {
  const kept = {};
  const fields = "first_name last_name email tel_num country address gender location profile_pic contractorProfile createdAt".split(" ");
  const q = {
    select: () => {
      fields.forEach((f) => { kept[f] = unifiedFull[f]; });
      kept._id = unifiedFull._id;
      return q;
    },
    sort: () => q,
    limit: () => q,
    lean: async () => [{ ...kept }],
  };
  // populate() replaces the profession ObjectId with the referenced doc
  q.populate = () => q;
  return q;
};
freelancerModel.countDocuments = async () => 1;
userModel.countDocuments = async () => 1;
reviewModel.aggregate = async () => ([
  { _id: legacyFull._id, averageRating: 4.4, totalReviews: 9 },
  { _id: unifiedFull._id, averageRating: 4.8, totalReviews: 12 },
]);
portfolioModel.find = (filter) => {
  const wanted = new Set((filter.ownerId.$in || []).map(String));
  let rows = [];
  const q = {
    select: () => q,
    sort: () => q,
    lean: async () => rows,
  };
  if (wanted.has(String(legacyFull._id))) {
    rows = [
      { _id: "aaa1", ownerId: legacyFull._id, clientName: "Client A",
        projectName: "Kampala Mall", description: "Retail fit-out.",
        snaps: ["uploads/portifolio/mall-1.jpg", "uploads/portifolio/mall-2.jpg"],
        createdAt: new Date("2026-04-01"), updatedAt: new Date("2026-04-01") },
      { _id: "bbb2", ownerId: legacyFull._id, clientName: "Client B",
        projectName: "Jinja Bridge", description: "Bridge columns.",
        snaps: ["uploads/portifolio/bridge-1.jpg"],
        createdAt: new Date("2026-03-01"), updatedAt: new Date("2026-03-01") },
    ];
  }
  return q;
};

const { listContractors } = require("../utils/contractorDirectory");

(async () => {
  const result = await listContractors({ page: 1, pageSize: 10 });

  console.log("=".repeat(78));
  console.log("ENVELOPE");
  console.log("=".repeat(78));
  console.log(JSON.stringify({
    totalDocuments: result.totalDocuments,
    totalPages: result.totalPages,
    currentPage: result.currentPage,
    pageSize: result.pageSize,
    data: "[...]",
  }, null, 2));

  console.log("\n" + "=".repeat(78));
  console.log("data[] ITEM — legacy source  (_source: \"legacy\")");
  console.log("=".repeat(78));
  console.log(JSON.stringify(result.data[0], null, 2));

  console.log("\n" + "=".repeat(78));
  console.log("data[] ITEM — unified source (_source: \"unified\")");
  console.log("=".repeat(78));
  console.log(JSON.stringify(result.data[1], null, 2));

  const legacyKeys = Object.keys(result.data[0]);
  const unifiedKeys = Object.keys(result.data[1]);
  const shared = legacyKeys.filter((k) => unifiedKeys.includes(k));
  const legacyOnly = legacyKeys.filter((k) => !unifiedKeys.includes(k));
  const unifiedOnly = unifiedKeys.filter((k) => !legacyKeys.includes(k));

  console.log("\n" + "=".repeat(78));
  console.log("KEY COMPARISON");
  console.log("=".repeat(78));
  console.log("\nShared by both (" + shared.length + "):\n  " + shared.join(", "));
  console.log("\nlegacy only (" + legacyOnly.length + "):\n  " + legacyOnly.join(", "));
  console.log("\nunified only (" + unifiedOnly.length + "):\n  " + unifiedOnly.join(", "));

  const SECRETS = ["password", "otp", "otpToken", "passwordResetToken",
    "passwordResetTokenExpires", "passwordChangedAt"];
  const leaked = SECRETS.filter((f) =>
    legacyKeys.includes(f) || unifiedKeys.includes(f));
  console.log("\nSecrets present in output: " +
    (leaked.length ? "!!! " + leaked.join(", ") : "none  -> OK"));

  process.exit(0);
})();