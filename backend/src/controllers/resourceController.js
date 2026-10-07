const Resource = require("../models/Resource");
const RESOURCE_CATEGORIES = [
  "Stress Management",
  "Anxiety & Worry",
  "Sleep",
  "Academic Pressure",
  "Time Management",
  "Emotional Wellbeing",
  "Sleep & Rest",
  "Relaxation / Mindfulness",
  "Self-Care",
  "Study-Life Balance"
];

const getResources = async (req, res) => {
  try {
    const { category } = req.query;
    // Counsellors see their own resources; students see all active resources.
    const query = req.user.role === "counsellor"
      ? { createdBy: req.user.id, isActive: true }
      : { isActive: true };

    if (category) {
      query.category = category;
    }

    const resources = await Resource.find(query)
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      resources
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to load self-help resources. Please try again."
    });
  }
};

const getResourceById = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...(req.user.role === "counsellor"
        ? { createdBy: req.user.id, isActive: true }
        : { isActive: true })
    };
    const resource = await Resource.findOne(query).populate("createdBy", "name").lean();

    if (!resource) {
      return res.status(404).json({
        message: "Resource not found."
      });
    }

    return res.status(200).json({
      resource
    });
  } catch (error) {
    return res.status(400).json({
      message: "Invalid resource ID."
    });
  }
};

const createResource = async (req, res) => {
  const resourceData = validateResource(req.body);
  if (resourceData.error) {
    return res.status(400).json({ message: resourceData.error });
  }
  try {
    const resource = await Resource.create({
      ...resourceData.value,
      createdBy: req.user.id,
      isActive: true
    });
    return res.status(201).json({ resource });
  } catch (error) {
    console.error("Counsellor resource creation failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to save this resource right now." });
  }
};

const updateResource = async (req, res) => {
  const resourceData = validateResource(req.body);
  if (resourceData.error) {
    return res.status(400).json({ message: resourceData.error });
  }
  try {
    const resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { $set: resourceData.value },
      { new: true, runValidators: true }
    );
    if (!resource) {
      return res.status(404).json({ message: "Resource not found." });
    }
    return res.status(200).json({ resource });
  } catch (error) {
    console.error("Counsellor resource update failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to update this resource right now." });
  }
};

const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!resource) {
      return res.status(404).json({ message: "Resource not found." });
    }
    return res.status(200).json({ message: "Resource removed." });
  } catch (error) {
    console.error("Counsellor resource removal failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to remove this resource right now." });
  }
};

const validateResource = (body = {}) => {
  const { title, description, category, content, externalLink, videoUrl, imageUrl, helpfulTips } = body;
  if (
    typeof title !== "string" || !title.trim() || title.trim().length > 120 ||
    typeof description !== "string" || !description.trim() || description.trim().length > 500 ||
    typeof category !== "string" || !RESOURCE_CATEGORIES.includes(category) ||
    typeof content !== "string" || !content.trim() || content.trim().length > 20_000
  ) {
    return { error: "Enter a title, description, supported category, and resource content." };
  }
  const optionalUrls = [externalLink, videoUrl, imageUrl].map((url) => String(url || "").trim());
  if (optionalUrls.some((url) => url && !/^https?:\/\/\S+$/i.test(url))) {
    return { error: "Resource links must use http or https." };
  }
  if (helpfulTips !== undefined && (!Array.isArray(helpfulTips) || helpfulTips.length > 20 ||
      helpfulTips.some((tip) => typeof tip !== "string" || tip.trim().length > 300))) {
    return { error: "Enter up to 20 valid resource tips." };
  }
  return {
    value: {
      title: title.trim(),
      description: description.trim(),
      category,
      content: content.trim(),
      externalLink: optionalUrls[0],
      videoUrl: optionalUrls[1],
      imageUrl: optionalUrls[2],
      helpfulTips: helpfulTips || []
    }
  };
};

module.exports = {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource
};
