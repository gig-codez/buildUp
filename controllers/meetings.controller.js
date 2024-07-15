const meetingsModel = require("../models/meetings.model");
class MeetingController {
  // get all meetings
  static async get_meetings(req, res) {
    try {
      const meetings = await meetingsModel
        .find({ employer_id: req.params.id })
        .sort({ createdAt: -1 });
      if (meetings) {
        res.status(200).json(meetings);
      } else {
        res.status(404).json({
          message: "No meetings found",
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  // add a meeting
  static async store(req, res) {
    try {
      const meeting = new meetingsModel(req.body);
      await meeting.save();
      if (meeting) {
        res
          .status(200)
          .json({ message: "Meeting created successfully", meeting });
      } else {
        res.status(400).json({ message: "Meeting not created" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // update a meeting
  static async update(req, res) {
    try {
      const meetingId = req.params.id;
      const data = req.body;
      console.log(data);
      const meeting = await meetingsModel.findByIdAndUpdate(meetingId, data, {
        new: true,
      });
      console.log(meeting);
      if (meeting) {
        res
          .status(200)
          .json({ message: "Meeting updated successfully", meeting });
      } else {
        res.status(400).json({ message: "Meeting failed to updated" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // delete a meeting
  static async delete(req, res) {
    try {
      const meetingId = req.params.id;
      const deletedMeeting = await meetingsModel.findByIdAndDelete(meetingId);
      if (!deletedMeeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      res.status(200).json({ message: "Meeting deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
}
module.exports = MeetingController;
