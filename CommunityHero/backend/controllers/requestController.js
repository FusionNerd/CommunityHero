const Request = require("../models/Request");
const { analyzeIssue } = require("../services/geminiService");

const MAX_CANDIDATES = 10;
const CANDIDATE_WINDOW_DAYS = 14;

const createRequest = async (req, res) => {
  try {
    const { title, description, category, hostel } = req.body;

    // Step 1 (free, instant): narrow the field before calling AI.
    // Hostel is a HARD filter — issues in different hostels are never
    // compared or merged, even if the wording is identical. "Common" only
    // matches "Common", never a specific hostel.
    const since = new Date(Date.now() - CANDIDATE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const candidateDocs = await Request.find({
      category,
      hostel,
      status: "Open",
      createdAt: { $gte: since },
    })
      .sort({ createdAt: -1 })
      .limit(MAX_CANDIDATES)
      .select("_id title description");

    const candidates = candidateDocs.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      description: c.description,
    }));

    console.log(`[AI] New issue: "${title}" | category: ${category} | hostel: ${hostel}`);
    console.log(`[AI] Candidate pool (${candidates.length}):`, candidates.map(c => `${c.id}: "${c.title}"`));

    // Step 2 (ONE Gemini call): categorize + summarize + duplicate-check together.
    const { aiCategory, aiSummary, aiPriority, duplicateOfId } = await analyzeIssue(
      title,
      description,
      candidates
    );

    console.log("[AI] Gemini result:", { aiCategory, aiSummary, aiPriority, duplicateOfId });

    const newReportEntry = {
      user: req.user._id,
      title,
      description,
      file: req.file ? req.file.filename : null,
      reportedAt: new Date(),
    };

    // If Gemini found a confident match, MERGE into that single existing
    // document — append this person's submission to its `reports` array
    // and bump the count. No separate document is ever created.
    // (duplicateOfId can only ever point to a candidate from the SAME
    // hostel, since the candidate pool above was already filtered by hostel.)
    if (duplicateOfId) {
      const existing = await Request.findById(duplicateOfId);

      const alreadyReported = existing?.reports.some(
        (r) => r.user.toString() === req.user._id.toString()
      );

      if (existing && !alreadyReported) {
        existing.reports.push(newReportEntry);
        existing.reportCount = existing.reports.length;
        await existing.save();

        return res.status(200).json({
          message: `Same issue already reported — now reported by ${existing.reportCount} people`,
          data: existing,
          merged: true,
        });
      }

      if (existing && alreadyReported) {
        return res.status(200).json({
          message: "You've already reported this issue",
          data: existing,
          merged: true,
        });
      }
    }

    // No match found — create a fresh document, the first report of its kind.
    const newRequest = await Request.create({
      title,
      description,
      category,
      hostel,
      file: req.file ? req.file.filename : null,
      createdBy: req.user._id,
      reports: [newReportEntry],
      reportCount: 1,
      aiCategory,
      aiSummary,
      aiPriority,
    });

    res.status(201).json({
      message: "Request created successfully",
      data: newRequest,
      merged: false,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllRequests = async (req, res) => {
  try {
    const requests = await Request.find().populate("createdBy", "name email");
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// "My Issues" = any issue I created OR contributed a report to.
const getMyRequests = async (req, res) => {
  try {
    const requests = await Request.find({ "reports.user": req.user._id })
      .populate("reports.user", "name email")
      .sort({ updatedAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.createdBy.toString() !== req.user._id.toString())
      return res.status(401).json({ message: "Not authorized" });

    request.title = req.body.title || request.title;
    request.description = req.body.description || request.description;
    request.category = req.body.category || request.category;
    request.status = req.body.status || request.status;

    const updatedRequest = await request.save();
    res.json({ message: "Request updated successfully", data: updatedRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.createdBy.toString() !== req.user._id.toString())
      return res.status(401).json({ message: "Not authorized" });

    await request.deleteOne();
    res.json({ message: "Request deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createRequest, getAllRequests, getMyRequests, updateRequest, deleteRequest };