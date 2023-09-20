const { default: mongoose } = require("mongoose");
const skillsModel = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  freelancer: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  job_title: {
    type: String,
    required: true,
  },
  work_experience: {
    type: String,
    required: true,
  },
  education: {
    type: String,
    required: true,
  },
  salary_type: {
    type: String,
    required: true,
  },
  languages: {
    type: String,
    required: false,
  },
  job_tag: {
    type: String,
    required: false,
  },
});
mongoose.model("skills", skillsModel);
