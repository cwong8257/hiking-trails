const nodemailer = require('nodemailer');

const smtpTransport = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'chriswong8257@gmail.com',
    pass: process.env.GMAIL_PW
  }
});

module.exports = {
  sendPasswordReset(email, name, host, token) {
    return smtpTransport.sendMail({
      to: email,
      from: 'chriswong8257@gmail.com',
      subject: 'Password Reset',
      text: `
          Hello ${name},
    
          You have requested a new password for your HikingTrails account.
    
          Please click this link to set your new password:
          http://${host}/reset/${token}
    
          For security reasons, this link will expire in 60 minutes.
    
          Best,
          HikingTrails
        `
    });
  },
  sendPasswordResetConfirmation(email, name) {
    return smtpTransport.sendMail({
      to: email,
      from: 'chriswong8257@gmail.com',
      subject: 'Your password changed',
      text: `
      Hi ${name},

      This is a confirmation that the password for your account ${email} was recently changed.

      Best,
      HikingTrails
    `
    });
  }
};
