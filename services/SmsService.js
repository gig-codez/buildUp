/**
 * 
 * @param {string} to
 * @param {string} message 
 * @returns 
 */
async function sendSms(to, message) {
    const baseUrl = 'https://www.egosms.co/api/v1/plain/';
    // default params
    const username = "bmugamba";
    const password = "mugamba2580";
    const priority = 0;
    const sender = "COTE TECH";
    // Build the URL with the parameters
    const url = new URL(baseUrl);
    url.searchParams.append('number', "256" + String(to).substring(1));
    url.searchParams.append('message', message);
    url.searchParams.append('username', username);
    url.searchParams.append('password', password);
    url.searchParams.append('sender', sender);
    url.searchParams.append('priority', priority);
    // console.log(url);
    try {
        // Send the request using fetch API
        const response = await fetch(url.toString())
        return await response.json()
    } catch (error) {
        throw new Error("Error: " + error.message);
    }
}

module.exports = sendSms;