const { OAuth2Client } = require('google-auth-library');

class GoogleAuthService {
  constructor() {
    this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async verifyGoogleToken(token) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload();
      
      return {
        success: true,
        data: {
          googleId: payload.sub,
          email: payload.email,
          firstName: payload.given_name,
          lastName: payload.family_name,
          emailVerified: payload.email_verified,
          picture: payload.picture
        }
      };
    } catch (error) {
      console.error('Google token verification failed:', error);
      return {
        success: false,
        error: 'Invalid Google token'
      };
    }
  }
}

module.exports = new GoogleAuthService();
