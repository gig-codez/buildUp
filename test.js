const mailSender = require("./utils/mailSender");

mailSender("brunolabs256@gmail.com", "Test Email", "<h1>This is a test email</h1><p>Sent using Resend service.</p>").then(response => {
    console.log("Email sent successfully:", response);
}).catch(error => {
    console.error("Error sending email:", error);
});