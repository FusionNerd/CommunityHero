const express = require("express");
const {
  createRequest, getAllRequests, getMyRequests, updateRequest, deleteRequest,
} = require("../controllers/requestController");
const protect = require("../middleware/authMiddleware");
const upload = require("../upload/upload");

const router = express.Router();

router.post("/", protect, upload.single("file"), createRequest);
router.get("/", getAllRequests);
router.get("/my", protect, getMyRequests);
router.put("/:id", protect, updateRequest);
router.delete("/:id", protect, deleteRequest);

module.exports = router;