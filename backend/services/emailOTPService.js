const crypto = require('crypto');
const nodemailer = require('nodemailer');
const OTP = require('../models/otp');

class EmailOTPService {
  constructor() {
    // Email transporter setup
    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD // Use App Password, not regular password
      }
    });
  }

  // Generate 6-digit OTP
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Send email OTP
  async sendEmailOTP(email, purpose = 'registration') {
    try {
      const code = this.generateOTP();
      
      // Save OTP to database
      const otpRecord = new OTP({
        email,
        code,
        type: 'email',
        purpose,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });
      await otpRecord.save();

      // Send email
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'Ramen App - Email Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #d2691e; margin: 0;">🍜 Ramen App</h1>
              <p style="color: #666; margin: 5px 0;">Email Verification</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center; margin: 20px 0;">
              <h2 style="color: #333; margin-bottom: 20px;">Your Verification Code</h2>
              <div style="background-color: #fff; padding: 20px; border-radius: 8px; border: 2px dashed #d2691e; display: inline-block;">
                <h1 style="color: #d2691e; font-size: 36px; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</h1>
              </div>
              <p style="color: #666; margin-top: 20px; font-size: 14px;">This code will expire in 10 minutes.</p>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>Security Notice:</strong> If you didn't request this verification code, please ignore this email. 
                Do not share this code with anyone.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
              This is an automated message from Ramen Mobile App Team.<br>
              Please do not reply to this email.
            </p>
          </div>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log(`✅ Email OTP sent to ${email}`);
      return { success: true, message: 'OTP sent to email successfully' };
    } catch (error) {
      console.error('❌ Email OTP error:', error);
      return { success: false, message: 'Failed to send email OTP' };
    }
  }

  // Verify OTP
  async verifyOTP(email, code, purpose) {
    try {
      const otpRecord = await OTP.findValidOTP(email, code, purpose);

      if (!otpRecord) {
        return { success: false, message: 'Invalid or expired OTP' };
      }

      // Mark OTP as used
      await otpRecord.markAsUsed();
      console.log(`✅ Email OTP verified for ${email}`);
      
      return { success: true, message: 'OTP verified successfully' };
    } catch (error) {
      console.error('❌ OTP verification error:', error);
      return { success: false, message: 'OTP verification failed' };
    }
  }

  // Resend OTP
  async resendOTP(email, purpose) {
    try {
      // Mark existing OTPs as used
      await OTP.updateMany(
        { 
          email,
          purpose,
          isUsed: false 
        },
        { isUsed: true }
      );

      // Send new OTP
      return await this.sendEmailOTP(email, purpose);
    } catch (error) {
      console.error('❌ Resend OTP error:', error);
      return { success: false, message: 'Failed to resend OTP' };
    }
  }

  // Check if email has pending OTP
  async hasPendingOTP(email, purpose) {
    try {
      const pendingOTP = await OTP.findOne({
        email,
        purpose,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });
      return !!pendingOTP;
    } catch (error) {
      console.error('❌ Check pending OTP error:', error);
      return false;
    }
  }
}

module.exports = new EmailOTPService();
