class AdminService {
  static async store(req, res, next) {
    try {
      // first check for occurrence of the account
      const oldAccount = adminSchema.findOne({ email: req.body.email });
      if (oldAccount) {
        res.status(400).json({ message: "Account already exists" });
      } else {
        let hashedPassword = bcrypt.hashSync(req.body.password, 10);
        const adminPayload = new adminSchema({
          name: req.body.name,
          email: req.body.email,
          password: hashedPassword,
        });
        await adminPayload.save();
        res.status(200).json({ message: "Account created" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}
