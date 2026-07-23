const VerifyToken = require("./verifytoken.controller");

module.exports = async (req, res, next) => {
  return VerifyToken.authenticate(req, res, next);
};
