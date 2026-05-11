import { Router, type IRouter } from "express";
import { Resend } from "resend";
import * as otpStore from "../lib/otp-store";

const router: IRouter = Router();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL =
    process.env.RESEND_FROM_EMAIL ?? "SpaceX HQ <onboarding@resend.dev>";
const APP_NAME = process.env.APP_NAME ?? "SpaceX HQ";

function buildEmailHtml(code: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME} — Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0;text-align:left;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2e/SpaceX_logo_black.svg"
                   width="100" alt="${APP_NAME}"
                   style="filter:brightness(0) invert(1);display:block;">
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#52525b;text-transform:uppercase;letter-spacing:0.1em;">
                Verification Code
              </p>
              <h1 style="margin:0 0 24px;font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">
                Your sign-in code
              </h1>
              <p style="margin:0 0 28px;font-size:14px;color:#71717a;line-height:1.6;">
                Use the code below to sign in to the ${APP_NAME} portal.
                It expires in <strong style="color:#a1a1aa;">10 minutes</strong>
                and can only be used once.
              </p>

              <!-- Code block -->
              <div style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:28px;text-align:center;margin-bottom:28px;">
                <span style="font-family:'Courier New',monospace;font-size:40px;font-weight:700;letter-spacing:0.18em;color:#ffffff;">
                  ${code}
                </span>
              </div>

              <p style="margin:0;font-size:12px;color:#52525b;line-height:1.6;">
                If you didn't request this code, you can safely ignore this email.
                Someone may have entered your address by mistake.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0;font-size:11px;color:#3f3f46;font-family:'Courier New',monospace;letter-spacing:0.04em;text-transform:uppercase;">
                ${APP_NAME} &mdash; Restricted Access
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

router.post("/send-otp", async (req, res) => {
    const { email } = req.body as { email?: string };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: "A valid email address is required." });
        return;
    }

    const cooldown = otpStore.canSend(email);
    if (!cooldown.allowed) {
        const secs = Math.ceil(cooldown.waitMs / 1000);
        res.status(429).json({ error: `Please wait ${secs}s before requesting another code.` });
        return;
    }

    const code = otpStore.generateCode();
    otpStore.save(email, code);

    try {
        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: `${code} — your ${APP_NAME} verification code`,
            html: buildEmailHtml(code),
        });
        if (error) throw new Error(error.message);
        res.json({ success: true });
    } catch (err) {
        req.log.error({ err }, "Failed to send OTP email");
        res.status(500).json({ error: "Failed to send verification email. Please try again." });
    }
});

router.post("/verify-otp", (req, res) => {
    const { email, code } = req.body as { email?: string; code?: string };

    if (!email || !code) {
        res.status(400).json({ error: "Email and code are required." });
        return;
    }

    const result = otpStore.verify(email, String(code));

    if (result === "ok") {
        res.json({ success: true });
        return;
    }

    const errorMessages: Record<string, string> = {
        invalid:           "Incorrect code. Please try again.",
        expired:           "Code expired. Please request a new one.",
        too_many_attempts: "Too many attempts. Please request a new code.",
    };

    res.status(401).json({ success: false, error: errorMessages[result] });
});

export default router;
