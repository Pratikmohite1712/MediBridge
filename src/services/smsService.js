const twilio = require('twilio');

const isMock = !process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'mock_twilio_account_sid';
const client = isMock ? null : twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.sendOTPSms = async (phoneNumber, otp) => {
  const message = `Your MediBridge OTP is ${otp}. Valid for 10 minutes. Do not share.`;
  if (isMock) {
    console.warn(`[Mock SMS] To: ${phoneNumber} | Message: ${message}`);
    return { success: true, mock: true };
  }
  
  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    return { success: true };
  } catch (error) {
    console.error('SMS sending failed:', error.message);
    return { success: false, error: error.message };
  }
};

exports.sendAppointmentSMS = async (phoneNumber, messageParams) => {
  const message = `MediBridge AI: Your appointment is confirmed for ${messageParams.date}.`;
  if (isMock) {
    console.warn(`[Mock SMS] To: ${phoneNumber} | Message: ${message}`);
    return { success: true, mock: true };
  }
  
  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    return { success: true };
  } catch (error) {
    console.error('SMS sending failed:', error.message);
    return { success: false, error: error.message };
  }
};
