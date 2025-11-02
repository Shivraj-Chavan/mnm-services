import axios from "axios";

const MSG91_AUTH_KEY = "YOUR_MSG91_AUTH_KEY"; 
const MSG91_SENDER_ID = "YOUR_SENDER_ID"; 
const MSG91_FLOW_ID = "YOUR_MSG91_FLOW_ID"; 

export async function sendSMS(phone, message) {
  console.log("Preparing to send SMS...");
  console.log("Mobile:", phone);
  console.log("Message:", message);

  const payload = {
    flow_id: MSG91_FLOW_ID,
    sender: MSG91_SENDER_ID,
    recipients: [
      {
        phone: `91${phone}`, 
        var: message,        
      },
    ],
  };

  const headers = {
    authkey: MSG91_AUTH_KEY,
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.post(
      "https://control.msg91.com/api/v5/flow",
      payload,
      { headers }
    );

    console.log("SMS API response:", response.data);
    console.log("SMS sent successfully to", phone);
    return response.data;
  } catch (err) {
    console.error("SMS sending failed:");
    console.error(err.response?.data || err.message);
    return null;
  }
}
