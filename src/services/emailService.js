const nodemailer = require('nodemailer');

const isMock = !process.env.SMTP_USER || process.env.SMTP_USER === 'mock_smtp_user';

let transporter;
if (!isMock) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const sendEmail = async (to, subject, html) => {
  if (isMock) {
    console.warn(`[Mock Email] To: ${to} | Subject: ${subject}`);
    return;
  }
  
  try {
    await transporter.sendMail({
      from: `"MediBridge AI" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Email sending failed:', error.message);
  }
};

exports.sendOTPEmail = (to, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #003f87;">MediBridge AI Verification</h2>
      <p>Your verification code is:</p>
      <h1 style="background: #f4f4f4; padding: 10px; font-size: 32px; letter-spacing: 5px; text-align: center;">${otp}</h1>
      <p>This code is valid for 10 minutes. Please do not share it.</p>
    </div>
  `;
  return sendEmail(to, 'Your MediBridge Verification Code', html);
};

exports.sendAppointmentConfirmation = (to, appointmentDetails) => {
  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2 style="color: #003f87;">Appointment Confirmed</h2>
      <p>Your appointment has been scheduled successfully.</p>
      <ul>
        <li><strong>Doctor:</strong> ${appointmentDetails.doctorName}</li>
        <li><strong>Date & Time:</strong> ${appointmentDetails.scheduledAt}</li>
        <li><strong>Type:</strong> ${appointmentDetails.type}</li>
      </ul>
      <p>Thank you for using MediBridge AI.</p>
    </div>
  `;
  return sendEmail(to, 'Appointment Confirmed - MediBridge AI', html);
};

exports.sendSOSAlert = (to, sosDetails) => {
  const html = `
    <div style="font-family: Arial, sans-serif; border-left: 5px solid red; padding-left: 15px;">
      <h2 style="color: red;">🚨 SOS Alert - Immediate Attention Required</h2>
      <p>An emergency alert has been activated.</p>
      <ul>
        <li><strong>User ID:</strong> ${sosDetails.userId}</li>
        <li><strong>Location:</strong> ${sosDetails.latitude}, ${sosDetails.longitude}</li>
        <li><strong>Address:</strong> ${sosDetails.address || 'Not provided'}</li>
        <li><strong>Time:</strong> ${sosDetails.time}</li>
      </ul>
      <p><a href="${process.env.CLIENT_URL}/admin/sos/${sosDetails.id}">View details</a></p>
    </div>
  `;
  return sendEmail(to, '🚨 SOS Alert - MediBridge AI', html);
};
