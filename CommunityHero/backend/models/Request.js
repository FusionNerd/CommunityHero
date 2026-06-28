const mongoose = require("mongoose");

const HOSTEL_OPTIONS = ["Hostel A", "Hostel B", "Hostel C", "Hostel D", "Common"];

const requestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    hostel: {
      type: String,
      enum: HOSTEL_OPTIONS,
      required: true,
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Completed"],
      default: "Open",
    },
    file: { type: String, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    aiCategory: { type: String, default: null },
    aiSummary: { type: String, default: null },
    aiPriority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    reportCount: { type: Number, default: 1 },
    // One entry per person who reported this issue (including the original
    // creator). This keeps the full history of every individual submission
    // inside this single merged document — no separate documents are ever
    // created for duplicates.
    reports: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        file: { type: String, default: null },
        reportedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);
module.exports.HOSTEL_OPTIONS = HOSTEL_OPTIONS;