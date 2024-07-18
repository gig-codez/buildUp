/**
 * 
 * @param {String} subscription_plan 
 * @param {String} subscription_end_date 
 * @param {String} username 
 * @returns String
 */
module.exports = function subscriptionMail(subscription_plan, subscription_end_date, username) {
  return `
        <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Notification</title>
  <style>
    /* Include Tailwind CSS styles */
    @import url('https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css');

    /* Inline styles for better email client support */
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
    }

    .header {
      text-align: center;
      padding: 20px 0;
      background-color: #4a5568;
      color: #ffffff;
    }

    .content {
      padding: 20px;
      text-align: center;
    }

    .footer {
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #a0aec0;
    }

    .btn {
      display: inline-block;
      padding: 10px 20px;
      margin-top: 20px;
      color: #ffffff;
      background-color: #3182ce;
      text-decoration: none;
      border-radius: 5px;
    }
  </style>
</head>
<body class="bg-gray-100">
  <div class="container">
    <div class="header">
      <h1 class="text-2xl font-bold">Subscription Notification</h1>
    </div>
    <div class="content">
      <h2 class="text-xl font-semibold">Hello, ${username}!</h2>
      <p class="mt-4">Thank you for subscribing to our service. Your subscription is now active.</p>
      <p class="mt-4">Subscription Plan: ${subscription_plan}</p>
      <p class="mt-4">End Date: ${subscription_end_date}</p>
      <a href="https://build-up-deb9a.web.app/" target="_blank" class="btn">Manage Subscription</a>
    </div>
    <div class="footer">
      <p>&copy;${new Date().getFullYear()} BuildUp. All rights reserved.</p>
      <p>If you have any questions, feel free to <a href="mailto:buildupuganda@gmail.com">contact us</a>.</p>
    </div>
  </div>
</body>
</html>
    `;
}