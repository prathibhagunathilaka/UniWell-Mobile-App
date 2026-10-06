const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !/^Bearer\s+\S+$/.test(authHeader)) {
    return res.status(401).json({
      message: "Authentication required"
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(503).json({
      message: "Authentication is not configured on the server."
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(authHeader.slice(7).trim(), process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }

  try {
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive || user.status === "suspended") {
      return res.status(401).json({
        message: "Authenticated account is unavailable."
      });
    }

    if (decoded.ver !== user.tokenVersion) {
      return res.status(401).json({
        message: "Invalid or expired token"
      });
    }

    req.userRecord = user;
    req.user = {
      id: user._id.toString(),
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    return next();
  } catch (error) {
    console.error("Authentication user lookup failed:", error.code || error.name);
    return res.status(500).json({
      message: "Unable to verify your account right now."
    });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to access this feature."
      });
    }

    if (req.user.role === "counsellor" && req.userRecord.status !== "active") {
      return res.status(403).json({
        message: "Your counsellor account is pending approval."
      });
    }

    return next();
  };
};

module.exports = {
  protect,
  authorize,
  requireAuth: protect,
  requireRole: authorize
};
