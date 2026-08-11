interface VerificationEmailProps {
  name: string;
  verificationLink: string;
  expiresInHours?: number;
}

export default function getVerificationEmailTemplate({
  name,
  verificationLink,
  expiresInHours = 24,
}: VerificationEmailProps): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Verify your email</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .content-padding { padding: 24px !important; }
      .heading { font-size: 20px !important; }
      .cta-button { width: 100% !important; display: block !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

          <tr>
            <td style="background-color:#111827; padding:24px 32px;">
              <span style="color:#ffffff; font-size:18px; font-weight:700; letter-spacing:0.02em;">Hotel Booking</span>
            </td>
          </tr>

          <tr>
            <td class="content-padding" style="padding:40px 32px 24px 32px;">
              <h1 class="heading" style="margin:0 0 16px 0; font-size:24px; line-height:32px; font-weight:700; color:#111827;">
                Verify your email address
              </h1>
              <p style="margin:0 0 12px 0; font-size:16px; line-height:24px; color:#374151;">
                Hi ${name},
              </p>
              <p style="margin:0 0 24px 0; font-size:16px; line-height:24px; color:#374151;">
                Thanks for signing up. Please confirm your email address by clicking the button below. This helps us keep your account secure.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
                <tr>
                  <td align="center" style="border-radius:8px; background-color:#111827;">
                    <a href="${verificationLink}" target="_blank" class="cta-button"
                       style="display:inline-block; padding:14px 32px; font-size:16px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px 0; font-size:14px; line-height:20px; color:#6b7280;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px 0; font-size:14px; line-height:20px; word-break:break-all;">
                <a href="${verificationLink}" target="_blank" style="color:#2563eb; text-decoration:underline;">${verificationLink}</a>
              </p>

              <p style="margin:0; font-size:14px; line-height:20px; color:#9ca3af;">
                This link will expire in ${expiresInHours} hours. If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px; background-color:#f9fafb; border-top:1px solid #e5e7eb;">
              <p style="margin:0; font-size:12px; line-height:18px; color:#9ca3af; text-align:center;">
                &copy; ${new Date().getFullYear()} Hotel Booking. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}