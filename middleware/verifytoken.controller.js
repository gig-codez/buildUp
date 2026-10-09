const jwt = require("jsonwebtoken");

class VerifyToken {
  static async authenticate(req, res, next) {
    const authToken = req.headers.authorization;
    if (!authToken || !authToken.startsWith("Bearer")) {
      return res
        .status(401)
        .json({ success: false, message: "No token authorization denied" });
    }
    try {
      const token = authToken.split(" ")[1];
      
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      req.userid = decoded.id;
      req.role = decoded.role;
      return next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }

      return res.status(401).json({ success: false, message: "Invalid token: " + error.message });
    }
  }

  static async restrict(req, res) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
}

module.exports = VerifyToken;
