const mailSender = require("../utils/mailSender");

module.exports = async (email, redirectLink, content) => {
  try {
    mailSender(
      email,
      "Email Verification",
      mailTemplate(
        "Email Verification",
        redirectLink, //
        content,
      )
    ).then((response) => {
      console.log("Verification email sent successfully:", response);
    }).catch((error) => {
      console.error("Error sending verification email:", error);
    });
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error(error);
  }
}
const mailTemplate = (type, redirectLink, content) => {
  return `
   <!DOCTYPE HTML
    PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml"
    xmlns:o="urn:schemas-microsoft-com:office:office">

  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <!--[if !mso]><!-->
    <meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]-->
    <title></title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>

<body class="bg-gray-100">
    <div class="max-w-2xl mx-auto p-4">
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
            <!-- Header -->
            <div class="bg-blue-600 p-3">
               
                <h1 class="text-3xl font-bold text-center text-white mb-2">${type}</h1>
            </div>


            <!-- Content -->
            <div class="p-8">
                <p class="text-gray-700 text-lg mb-6">${content}</p>

                <a href="${redirectLink}" target="_blank"
                    class="block w-3/4 mx-auto my-auto bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded text-center transition duration-300 ease-in-out transform hover:scale-105">
                    CLICK HERE
                </a>
            </div>

            <!-- Footer -->
            <div class="bg-gray-50 p-6 mt-8">
                <p class="text-center text-gray-600 text-sm">
                    © <b class="year">${new Date().getFullYear()}</b> Renuir BuildUp. All rights reserved.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}