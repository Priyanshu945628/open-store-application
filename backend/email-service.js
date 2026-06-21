import fetch from 'node-fetch';

/**
 * Sends a one-time password (OTP) email using either Resend API or Mailjet Send API.
 * If no credentials are provided or set to placeholders, it runs in Mock Mode
 * by logging the verification code directly to the console.
 * 
 * @param {string} email Target recipient email address
 * @param {string} code 6-digit verification code
 */
export async function sendOtpEmail(email, code) {
  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL || 'Open Store <onboarding@resend.dev>';

  const mailjetKey = process.env.MAILJET_API_KEY;
  const mailjetSecret = process.env.MAILJET_SECRET_KEY;
  const mailjetFrom = process.env.MAILJET_FROM_EMAIL || 'Open Store <noreply@api.open-store.com>';

  const htmlContent = `
    <div style="font-family: sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 8px; max-width: 500px; margin: 0 auto; border: 1px solid #1e293b;">
      <h2 style="color: #6366f1; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">Open Store Security</h2>
      <p style="font-size: 16px; line-height: 1.5; color: #cbd5e1;">Please use the following 6-digit verification code to complete your authentication:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 16px; background-color: #1e293b; border-radius: 6px; display: inline-block; color: #38bdf8; margin: 15px 0;">
        ${code}
      </div>
      <p style="color: #94a3b8; font-size: 14px; margin-top: 20px; border-top: 1px solid #1e293b; padding-top: 10px;">This code is valid for 5 minutes. If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  // 1. Try Resend first if configured
  if (resendKey && resendKey !== 'your_resend_api_key_here' && resendKey.trim() !== '') {
    console.log(`[Email Service] Sending OTP email to ${email} via Resend API...`);
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: resendFrom,
          to: email,
          subject: 'Your Open Store Verification Code',
          html: htmlContent
        })
      });

      if (response.ok) {
        const resData = await response.json();
        console.log(`[Email Service] Resend OTP email dispatched successfully. ID:`, resData.id);
        return;
      } else {
        const errText = await response.text();
        console.error(`[Email Service] Resend API error: ${response.status} - ${errText}`);
      }
    } catch (err) {
      console.error(`[Email Service] Resend API exception:`, err);
    }
  }

  // 2. Try Mailjet if configured
  const isMailjetPlaceholder = !mailjetKey || !mailjetSecret || 
                               mailjetKey === 'your_mailjet_api_key_here' || 
                               mailjetSecret === 'your_mailjet_secret_key_here';

  if (!isMailjetPlaceholder && mailjetKey.trim() !== '' && mailjetSecret.trim() !== '') {
    console.log(`[Email Service] Sending OTP email to ${email} via Mailjet API...`);
    
    let fromEmailOnly = 'noreply@api.open-store.com';
    let fromName = 'Open Store';
    const match = mailjetFrom.match(/^(.*?)\s*<(.*?)>$/);
    if (match) {
      fromName = match[1].trim();
      fromEmailOnly = match[2].trim();
    } else {
      fromEmailOnly = mailjetFrom;
    }

    const authStr = Buffer.from(`${mailjetKey}:${mailjetSecret}`).toString('base64');
    try {
      const response = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authStr}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Messages: [
            {
              From: { Email: fromEmailOnly, Name: fromName },
              To: [{ Email: email, Name: email.split('@')[0] }],
              Subject: 'Your Open Store Verification Code',
              HTMLPart: htmlContent
            }
          ]
        })
      });

      if (response.ok) {
        await response.json();
        console.log(`[Email Service] Mailjet OTP email dispatched successfully.`);
        return;
      } else {
        const errText = await response.text();
        console.error(`[Email Service] Mailjet API error: ${response.status} - ${errText}`);
      }
    } catch (err) {
      console.error(`[Email Service] Mailjet API exception:`, err);
    }
  }

  // 3. Mock Mode Fallback
  console.log(`\n==================================================`);
  console.log(`[Mock Mode] Verification code for: ${email}`);
  console.log(`CODE: ${code}`);
  console.log(`==================================================\n`);
}

/**
 * Sends an account revocation notice email.
 * 
 * @param {string} email Target recipient email address
 * @param {string} reason Reason statement for the user revocation
 */
export async function sendRevocationEmail(email, reason) {
  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL || 'Open Store <onboarding@resend.dev>';

  const mailjetKey = process.env.MAILJET_API_KEY;
  const mailjetSecret = process.env.MAILJET_SECRET_KEY;
  const mailjetFrom = process.env.MAILJET_FROM_EMAIL || 'Open Store <noreply@api.open-store.com>';

  const htmlContent = `
    <div style="font-family: sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 8px; max-width: 500px; margin: 0 auto; border: 1px solid #1e293b;">
      <h2 style="color: #ef4444; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">Account Revoked</h2>
      <p style="font-size: 16px; line-height: 1.5; color: #cbd5e1;">Your Open Store account has been revoked/deleted by the platform administration.</p>
      <div style="padding: 16px; background-color: #1e293b; border-radius: 6px; color: #f87171; margin: 15px 0; border-left: 4px solid #ef4444;">
        <strong>Reason for revocation:</strong><br/>
        ${reason || 'Violation of content policy.'}
      </div>
      <p style="color: #94a3b8; font-size: 14px; margin-top: 20px; border-top: 1px solid #1e293b; padding-top: 10px;">If you have questions regarding this decision, you may contact our support team.</p>
    </div>
  `;

  // 1. Try Resend if configured
  if (resendKey && resendKey !== 'your_resend_api_key_here' && resendKey.trim() !== '') {
    console.log(`[Email Service] Sending revocation email to ${email} via Resend API...`);
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: resendFrom,
          to: email,
          subject: 'Your Open Store Account Has Been Revoked',
          html: htmlContent
        })
      });

      if (response.ok) {
        const resData = await response.json();
        console.log(`[Email Service] Resend revocation email dispatched successfully. ID:`, resData.id);
        return;
      } else {
        const errText = await response.text();
        console.error(`[Email Service] Resend API error: ${response.status} - ${errText}`);
      }
    } catch (err) {
      console.error(`[Email Service] Resend API exception:`, err);
    }
  }

  // 2. Try Mailjet if configured
  const isMailjetPlaceholder = !mailjetKey || !mailjetSecret || 
                               mailjetKey === 'your_mailjet_api_key_here' || 
                               mailjetSecret === 'your_mailjet_secret_key_here';

  if (!isMailjetPlaceholder && mailjetKey.trim() !== '' && mailjetSecret.trim() !== '') {
    console.log(`[Email Service] Sending revocation email to ${email} via Mailjet API...`);
    
    let fromEmailOnly = 'noreply@api.open-store.com';
    let fromName = 'Open Store';
    const match = mailjetFrom.match(/^(.*?)\s*<(.*?)>$/);
    if (match) {
      fromName = match[1].trim();
      fromEmailOnly = match[2].trim();
    } else {
      fromEmailOnly = mailjetFrom;
    }

    const authStr = Buffer.from(`${mailjetKey}:${mailjetSecret}`).toString('base64');
    try {
      const response = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authStr}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Messages: [
            {
              From: { Email: fromEmailOnly, Name: fromName },
              To: [{ Email: email, Name: email.split('@')[0] }],
              Subject: 'Your Open Store Account Has Been Revoked',
              HTMLPart: htmlContent
            }
          ]
        })
      });

      if (response.ok) {
        await response.json();
        console.log(`[Email Service] Mailjet revocation email dispatched successfully.`);
        return;
      } else {
        const errText = await response.text();
        console.error(`[Email Service] Mailjet API error: ${response.status} - ${errText}`);
      }
    } catch (err) {
      console.error(`[Email Service] Mailjet API exception:`, err);
    }
  }

  // 3. Mock Mode Fallback
  console.log(`\n==================================================`);
  console.log(`[Mock Mode] Revocation email for: ${email}`);
  console.log(`REASON: ${reason}`);
  console.log(`==================================================\n`);
}


