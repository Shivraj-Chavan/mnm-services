import axios from "axios";
import dotenv from "dotenv";
import { SMS_TEMPLATES } from "./smsTemplates.js";

dotenv.config();

const MSG91_BASE_URL = "https://control.msg91.com/api/v5/flow/";

export const sendSms = async (type, phone, variables = {}) => {
  console.log("sendSms called with: " + JSON.stringify({ type, phone, variables }, null, 2));


  const templateId = SMS_TEMPLATES[type];
  if (!templateId) {
    console.error(` No template found for SMS type: ${type}`);
    throw new Error(`Template not found for type: ${type}`);
  }

  // Clean phone number
  // const formattedPhone = String(phone).replace(/\D/g, "");
  // console.log(" Formatted phone:", formattedPhone);

  // Build payload
  const payload = {
    flow_id: templateId,
    sender: process.env.MSG91_SENDER_ID, 
    recipients: [
      {
        mobiles: `${phone}`,
        ...variables,
      },
    ],
  };
  console.log(" MSG91 Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(MSG91_BASE_URL, payload, {
      headers: {
        accept: "application/json",
        authkey: process.env.MSG91_AUTH_KEY,
        "content-type": "application/json",
      },
    });

    console.log("✅ MSG91 Response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (err) {
    console.error("❌ MSG91 FULL ERROR:", err.response?.data || err);
    throw err; // throw the actual error to preserve details
  }
};
