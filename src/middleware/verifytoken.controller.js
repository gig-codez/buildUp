const jwt = require("jsonwebtoken");

class VerifyToken {
  static async authenticate(req, res) {
    const authToken = req.headers.authorization;
    if (!authToken || !authToken.startsWith("Bearer")) {
      return res
        .status(401)
        .json({ success: false, message: "No toke authorization denied" });
    }
    try {
      console.log(authToken);
      const token = authToken.split(" ")[1];
      //verify the token
      const decoded = jwt.verify(token, process.env.JWT_TOKEN_KEY);
      req.userid = decoded.id;
      req.role = decoded.role;
      next();
    } catch (error) {
        if(error.name==="TokenExpiredError"){
            return res.status(401).json({message:"Token expired"})
        }
        return res.status(402).json({success:false,message:"invalid token"});
    }
  }
}
