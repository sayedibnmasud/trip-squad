// Builds the IAM email templates in Trip Squad's design from one shared
// layout, so every email IAM sends looks like the app rather than Blocks.
//
//   node scripts/build-mail-templates.mjs
//
// writes blocks/mail/<Name>.en-US.html (what IAM sends) and
// blocks/mail/<Name>.en-US.editor.json (the same HTML wrapped as a single
// HTML block, so the Blocks portal's template editor shows this design too
// instead of a stale one). Upload with `blocks mail template save`.
//
// The {{Variables}} are the ones IAM fills in for each template; they are
// fixed by IAM, so keep them exactly as listed.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The deployed app; emails link here because IAM gives no app URL variable.
const APP_URL = "https://dbcdsi-eoeuw.slsblx.com";

// App colors (src/app/styles.css tokens, converted from HSL).
const C = {
  page: "#F1F4F2", // --background
  ink: "#16312B", // --foreground
  primary: "#0D826B", // --primary
  muted: "#5D6F69", // --muted-foreground
  accent: "#F3B43F", // --accent
  accentSoft: "#FDF1D8", // --accent-soft
  border: "#DAE2DD", // --border
  card: "#FFFFFF"
};
const DISPLAY = "'Bricolage Grotesque','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const BODY = "'Hind Siliguri','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FONTS = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700..800&family=Hind+Siliguri:wght@400;600&display=swap";

const p = (text) => `<p style="margin:0 0 14px 0;font-family:${BODY};font-size:16px;line-height:25px;color:${C.ink};">${text}</p>`;
const small = (text) => `<p style="margin:0;font-family:${BODY};font-size:13px;line-height:20px;color:${C.muted};">${text}</p>`;

// Pill button, table-based so Outlook renders it.
function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 14px 0;">
            <tr>
              <td align="center" bgcolor="${C.primary}" style="border-radius:999px;">
                <a href="${href}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:${BODY};font-size:16px;line-height:16px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px;">${label}</a>
              </td>
            </tr>
          </table>`;
}

function fallbackLink(href) {
  return `<p style="margin:18px 0 4px 0;font-family:${BODY};font-size:13px;line-height:20px;color:${C.muted};">If the button doesn't work, copy this link into your browser:</p>
          <p style="margin:0;font-family:${BODY};font-size:12px;line-height:18px;word-break:break-all;"><a href="${href}" target="_blank" style="color:${C.primary};text-decoration:underline;">${href}</a></p>`;
}

function codeBox(code) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;">
            <tr>
              <td style="background:${C.accentSoft};border:1px dashed ${C.accent};border-radius:12px;padding:14px 26px;font-family:${DISPLAY};font-size:30px;line-height:34px;font-weight:800;letter-spacing:6px;color:${C.ink};">${code}</td>
            </tr>
          </table>`;
}

// The card: dark header with the brand and a dashed "route" rule (the app's
// one decorative motif), then the message, then a quiet footer.
function card({ heading, body, footer }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.card};border-radius:18px;overflow:hidden;">
      <tr>
        <td class="ts-pad" style="background:${C.ink};padding:26px 40px 22px 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="34" height="34" align="center" valign="middle" style="background:${C.accent};border-radius:9px;font-size:18px;line-height:34px;">&#129523;</td>
              <td style="padding-left:12px;font-family:${DISPLAY};font-size:20px;line-height:34px;font-weight:800;letter-spacing:-0.3px;color:#FFFFFF;">Trip Squad</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td class="ts-pad" style="background:${C.ink};padding:0 40px 0 40px;font-size:0;line-height:0;">
          <div style="border-top:3px dashed ${C.accent};height:0;width:100%;"></div>
        </td>
      </tr>
      <tr>
        <td style="background:${C.ink};height:18px;font-size:0;line-height:0;">&nbsp;</td>
      </tr>
      <tr>
        <td class="ts-pad" style="padding:36px 40px 12px 40px;">
          <p class="ts-h1" style="margin:0 0 18px 0;font-family:${DISPLAY};font-size:30px;line-height:34px;font-weight:800;letter-spacing:-0.6px;color:${C.ink};">${heading}</p>
          ${body}
        </td>
      </tr>
      <tr>
        <td class="ts-pad" style="padding:22px 40px 28px 40px;">
          <div style="border-top:1px solid ${C.border};padding-top:18px;">
            ${small(footer)}
            <p style="margin:10px 0 0 0;font-family:${BODY};font-size:12px;line-height:18px;color:${C.muted};">Trip Squad &middot; Plan the trip together &middot; <a href="${APP_URL}" target="_blank" style="color:${C.primary};text-decoration:none;">${APP_URL.replace("https://", "")}</a></p>
          </div>
        </td>
      </tr>
    </table>`;
}

function page({ title, preview, ...content }) {
  return `<!doctype html>
<html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${title}</title>
<link href="${FONTS}" rel="stylesheet">
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<![endif]-->
<style>
a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
@media only screen and (max-width:600px) {
  .ts-pad { padding-left:24px !important; padding-right:24px !important; }
  .ts-h1 { font-size:25px !important; line-height:30px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;text-size-adjust:100%;">
<!-- Inbox preview text -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page};">${preview}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
  <tr><td align="center" style="padding:32px 12px;">
    <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
    ${card(content)}
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body>
</html>
`;
}

export const templates = [
  {
    name: "AccountActivation",
    subject: "Activate your Trip Squad account",
    title: "Activate your Trip Squad account",
    preview: "Choose a password to start planning trips with your group.",
    heading: "Welcome aboard!",
    body: [
      p("Thanks for signing up for Trip Squad, where your group suggests places, votes on them, builds a day-by-day plan and keeps track of who paid for what."),
      p("One last step: choose a password to activate your account."),
      button("{{AccountActivationUrl}}", "Choose your password"),
      small("This link expires in 24 hours."),
      fallbackLink("{{AccountActivationUrl}}")
    ].join("\n          "),
    footer: "You're getting this because someone signed up for Trip Squad with this email address. If it wasn't you, ignore this email and no account will be activated."
  },
  {
    name: "AccountActivated",
    subject: "Your Trip Squad account is ready",
    title: "Your Trip Squad account is ready",
    preview: "You're all set. Sign in and start your first trip.",
    heading: "You're all set, {{DisplayName}}",
    body: [
      p("Your Trip Squad account is active. Sign in to create a trip, invite your friends and start suggesting places."),
      button(`${APP_URL}/login`, "Sign in to Trip Squad")
    ].join("\n          "),
    footer: "You're getting this because a Trip Squad account was activated with this email address. If that wasn't you, reset your password from the sign-in page."
  },
  {
    name: "RecoverAccount",
    subject: "Reset your Trip Squad password",
    title: "Reset your Trip Squad password",
    preview: "Use this link to choose a new password. It expires in 10 minutes.",
    heading: "Reset your password",
    body: [
      p("Hi {{User.DisplayName}},"),
      p("We got a request to reset the password for your Trip Squad account. Choose a new one here:"),
      button("{{EmailVerification.PageUrl}}", "Choose a new password"),
      small("This link expires in 10 minutes. Don't share it with anyone."),
      fallbackLink("{{EmailVerification.PageUrl}}")
    ].join("\n          "),
    footer: "Didn't ask for a reset? Ignore this email and your password stays the same."
  },
  {
    name: "VerifyEmail",
    subject: "Verify your email for Trip Squad",
    title: "Verify your email for Trip Squad",
    preview: "Confirm this email address for your Trip Squad account.",
    heading: "Verify your email",
    body: [
      p("Hi {{User.DisplayName}},"),
      p("Please confirm this is the right email address for your Trip Squad account."),
      button("{{EmailVerification.PageUrl}}", "Verify email address"),
      small("Don't share this link with anyone."),
      fallbackLink("{{EmailVerification.PageUrl}}")
    ].join("\n          "),
    footer: "If you didn't create or change a Trip Squad account with this email address, you can ignore this email."
  },
  {
    name: "MfaViaEmail",
    subject: "Your Trip Squad security code",
    title: "Your Trip Squad security code",
    preview: "Your Trip Squad security code is inside. It expires shortly.",
    heading: "Your security code",
    body: [
      p("Enter this code in Trip Squad to confirm it's you:"),
      codeBox("{{TwoFactorCode}}"),
      small("The code expires shortly. If it does, request a new one in Trip Squad.")
    ].join("\n          "),
    footer: "Didn't try to sign in? Don't use this code, and change your password. Trip Squad will never ask you for this code by email, phone or chat."
  }
];

// The portal editor's (BEE) document: page settings plus one full-width row
// holding the email as a single HTML block.
function editorJson(template, html) {
  const inner = html.slice(html.indexOf("<body"), html.indexOf("</body>") + "</body>".length)
    .replace(/^<body[^>]*>/, "").replace(/<\/body>$/, "").trim();
  return {
    page: {
      body: {
        container: { style: { "background-color": C.page } },
        content: {
          computedStyle: { linkColor: C.primary, messageBackgroundColor: C.page, messageWidth: "600px" },
          style: { color: C.ink, "font-family": BODY }
        },
        type: "mailup-bee-page-properties",
        webFonts: [{ fontFamily: BODY, url: FONTS, weights: "400,600,700,800" }]
      },
      description: "",
      rows: [{
        columns: [{
          "grid-columns": 12,
          modules: [{
            descriptor: { computedStyle: { hideContentOnMobile: false }, html: { html: inner }, style: { "padding-bottom": "0px", "padding-left": "0px", "padding-right": "0px", "padding-top": "0px" } },
            type: "mailup-bee-newsletter-modules-html"
          }],
          style: { "background-color": "transparent", "padding-bottom": "0px", "padding-left": "0px", "padding-right": "0px", "padding-top": "0px" }
        }],
        container: { style: { "background-color": "transparent" } },
        content: { style: { "background-color": "transparent", color: C.ink, width: "600px" } },
        type: "one-column-empty"
      }],
      template: { name: "template-base", type: "basic", version: "2.0.0" },
      title: template.title
    },
    comments: {}
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = new URL("../blocks/mail/", import.meta.url);
  for (const template of templates) {
    const html = page(template);
    writeFileSync(new URL(`${template.name}.en-US.html`, dir), html);
    writeFileSync(new URL(`${template.name}.en-US.editor.json`, dir), `${JSON.stringify(editorJson(template, html), null, 2)}\n`);
    console.log(`${template.name}: ${template.subject}`);
  }
}
