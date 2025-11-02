import {sendSMS} from "./sendOtpviaPhone.js";

export async function smsUserRegistered(phone) {
  const message = "User registered successfully";
  console.log('user registered:',message)
  await sendSMS(phone, message);
}

export async function smsBusinessRegistered(phone) {
  const message = "Business registered successfully, send for verification";
  console.log('BusinessRegistered :',message)
  await sendSMS(phone, message);
}

export async function smsBusinessVerified(phone) {
  const message = "Business verified successfully";
  console.log('BusinessVerified :',message)
  await sendSMS(phone, message);
}

export async function smsBusinessUpdated(phone) {
  const message = "Business updated successfully, sent to admin for approval";
  console.log('BusinessUpdated :',message)
  await sendSMS(phone, message);
}
