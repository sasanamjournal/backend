const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const connect = require('../db');
const EmailTemplate = require('../emailTemplate/schema');

const LOGO_URL = 'https://res.cloudinary.com/db5eadfnx/image/upload/v1775209417/favicon-32x32_htywpe.png';
const SITE_URL = 'https://sasanam.in';
const BRAND_COLOR = '#8B4513';
const BRAND_DARK = '#5a2d0c';
const CREAM = '#f4ecd8';

// ─── Transporter ──────────────────────────────────────────────
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[Email] SMTP not configured — emails will be skipped');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  return transporter;
}

// ─── Template Cache (5 min TTL) ──────────────────────────────
const templateCache = {};
const CACHE_TTL = 5 * 60 * 1000;

async function getTemplate(slug) {
  const now = Date.now();
  if (templateCache[slug] && now - templateCache[slug].ts < CACHE_TTL) {
    return templateCache[slug].data;
  }

  try {
    await connect();
    const tpl = await EmailTemplate.findOne({ slug, isActive: true }).lean();
    if (tpl) {
      templateCache[slug] = { data: tpl, ts: now };
      return tpl;
    }
  } catch (err) {
    console.error(`[Email] Failed to load template "${slug}":`, err.message);
  }

  return null;
}

// ─── Mustache-style variable replacer ─────────────────────────
function interpolate(str, vars) {
  if (!str) return '';
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] !== undefined ? vars[key] : `{{${key}}}`));
}

// ─── Base HTML Wrapper ────────────────────────────────────────
function wrapHtml(title, bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(61,37,22,0.12);">
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND_COLOR},${BRAND_DARK});padding:32px 40px;text-align:center;">
            <img src="${LOGO_URL}" alt="Sasanam" width="56" height="56" style="border-radius:12px;margin-bottom:12px;background:rgba(255,255,255,0.15);padding:8px;" />
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">${title}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            ${bodyContent}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;background:#faf8f4;border-top:1px solid #e8dcc8;text-align:center;">
            <p style="margin:0 0 8px;font-size:13px;color:#8C7055;">Sasanam — Preserving India's Ancient Inscriptions</p>
            <a href="${SITE_URL}" style="color:${BRAND_COLOR};font-size:12px;text-decoration:none;font-weight:600;">sasanam.in</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── HTML building blocks ─────────────────────────────────────
const h2 = (t) => `<h2 style="margin:0 0 16px;color:#3D2516;font-size:20px;font-weight:700;">${t}</h2>`;
const p = (t) => `<p style="margin:0 0 16px;color:#4A3B32;font-size:15px;line-height:1.7;">${t}</p>`;
const row = (label, value) =>
  `<tr><td style="padding:10px 16px;color:#6A5A4A;font-size:13px;font-weight:600;border-bottom:1px solid #f0e8d8;">${label}</td><td style="padding:10px 16px;color:#3D2516;font-size:14px;font-weight:700;border-bottom:1px solid #f0e8d8;text-align:right;">${value}</td></tr>`;
const table = (rows) =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f4;border-radius:12px;overflow:hidden;margin:16px 0 24px;">${rows}</table>`;
const btn = (text, href) =>
  `<div style="text-align:center;margin:24px 0 8px;"><a href="${href}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">${text}</a></div>`;

// ─── Send Helper (fire-and-forget) ────────────────────────────
async function sendMail({ to, bcc, subject, html, from }) {
  const t = getTransporter();
  if (!t) return;

  const fromAddress = from || `Sasanam <${process.env.SMTP_USER}>`;
  const opts = { from: fromAddress, subject, html };
  if (bcc) { opts.to = process.env.SMTP_USER; opts.bcc = bcc; }
  else { opts.to = to; }

  try {
    await t.sendMail(opts);
    const dest = bcc ? `${bcc.split(',').length} recipients (BCC)` : (Array.isArray(to) ? to.length + ' recipients' : to);
    console.log(`[Email] Sent "${subject}" to ${dest}`);
  } catch (err) {
    console.error(`[Email] Failed "${subject}":`, err.message);
  }
}

// ─── Batch sender for bulk notifications ─────────────────────
function sendBulk({ emails, subject, html, fromName }) {
  if (!emails || emails.length === 0) return;
  const from = `${fromName || 'Sasanam'} <${process.env.SMTP_USER}>`;
  const batchSize = 50;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize).join(',');
    sendMail({ bcc: batch, subject, html, from });
  }
}

// ─── Build body from DB template ─────────────────────────────
function buildBodyFromTemplate(tpl, vars, extraRows) {
  const heading = interpolate(tpl.heading, vars);
  const bodyParagraphs = interpolate(tpl.body, vars)
    .split('\n')
    .filter(Boolean)
    .map((line) => p(line))
    .join('');
  const detailRows = extraRows ? table(extraRows) : '';
  const buttonHtml = tpl.buttonText
    ? btn(interpolate(tpl.buttonText, vars), interpolate(tpl.buttonUrl, vars))
    : '';

  return h2(heading) + bodyParagraphs + detailRows + buttonHtml;
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

// ─── 0. Welcome Email (new signup) ────────────────────────────
async function sendWelcomeEmail({ email, name }) {
  const vars = { name };
  const tpl = await getTemplate('welcome');

  let subject, html;
  if (tpl) {
    subject = interpolate(tpl.subject, vars);
    html = wrapHtml(tpl.name, buildBodyFromTemplate(tpl, vars, null));
  } else {
    subject = 'Welcome to Sasanam — Your Journey Begins';
    html = wrapHtml('Welcome to Sasanam',
      h2('Welcome to Sasanam!') +
      p(`Dear <strong>${name}</strong>, welcome to Sasanam — India's digital archive of ancient inscriptions.`) +
      p('Your account has been created successfully. Explore our collection and contribute to preserving history.') +
      btn('Start Exploring', `${SITE_URL}/journal`)
    );
  }

  sendMail({ to: email, subject, html });
}

// ─── 1. Subscription Confirmation ─────────────────────────────
async function sendSubscriptionEmail({ email, name, amount, orderId, endDate }) {
  const amountRs = '\u20B9' + (amount / 100).toLocaleString('en-IN');
  const formattedEnd = new Date(endDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const vars = { name, amount: amountRs, orderId, endDate: formattedEnd };

  const tpl = await getTemplate('subscription_confirmed');
  const details = row('Amount Paid', amountRs) + row('Order ID', orderId) + row('Valid Until', formattedEnd) + row('Status', '<span style="color:#16a34a;font-weight:800;">Active</span>');

  let subject, html;
  if (tpl) {
    subject = interpolate(tpl.subject, vars);
    html = wrapHtml(tpl.name, buildBodyFromTemplate(tpl, vars, details));
  } else {
    subject = 'Subscription Confirmed — Welcome to Sasanam';
    html = wrapHtml('Subscription Confirmed',
      h2('Welcome, Contributor!') +
      p(`Dear <strong>${name}</strong>, thank you for subscribing to Sasanam.`) +
      table(details) +
      btn('Explore the Archive', `${SITE_URL}/journal`)
    );
  }

  sendMail({ to: email, subject, html });
}

// ─── 2. Donation Thank You ────────────────────────────────────
async function sendDonationEmail({ email, name, amount, orderId, paymentId }) {
  const amountRs = '\u20B9' + (amount / 100).toLocaleString('en-IN');
  const date = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const vars = { name, amount: amountRs, orderId, paymentId, date };

  const tpl = await getTemplate('donation_thankyou');
  const details = row('Donation Amount', amountRs) + row('Order ID', orderId) + row('Payment ID', paymentId) + row('Date', date);

  let subject, html;
  if (tpl) {
    subject = interpolate(tpl.subject, vars);
    html = wrapHtml(tpl.name, buildBodyFromTemplate(tpl, vars, details));
  } else {
    subject = 'Thank You for Your Donation — Sasanam';
    html = wrapHtml('Thank You for Your Donation',
      h2('Your Generosity Matters') +
      p(`Dear <strong>${name}</strong>, we are deeply grateful for your contribution.`) +
      table(details) +
      btn('View Our Archive', `${SITE_URL}/journal`)
    );
  }

  sendMail({ to: email, subject, html });
}

// ─── 3. News/Event Notification (to all users) ───────────────
async function sendNewsNotification({ users, title, content, category }) {
  const snippet = content.length > 200 ? content.substring(0, 200) + '...' : content;
  const categoryLabel = category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Update';
  const vars = { title, content: snippet, category: categoryLabel };

  const tpl = await getTemplate('news_notification');

  let subject, html;
  if (tpl) {
    subject = interpolate(tpl.subject, vars);
    html = wrapHtml(tpl.name, buildBodyFromTemplate(tpl, vars, null));
  } else {
    subject = `${title} — Sasanam`;
    html = wrapHtml('New Update from Sasanam',
      h2(title) + p(snippet) + btn('Read Full Update', `${SITE_URL}/news-events`)
    );
  }

  const emails = users.map((u) => u.email).filter(Boolean);
  const fromName = tpl ? tpl.fromName : 'Sasanam News';
  sendBulk({ emails, subject, html, fromName });
}

// ─── 4. New Sasanam/Book Notification (to all users) ──────────
async function sendNewBookNotification({ users, bookName, authorName, bookType }) {
  const typeLabel = bookType === 'fullbook' ? 'New Book' : 'New Journal';
  const bookTypeName = bookType === 'fullbook' ? 'book' : 'journal';
  const link = bookType === 'fullbook' ? `${SITE_URL}/sasanam` : `${SITE_URL}/journal`;
  const vars = { bookName, authorName, typeLabel, bookTypeName, link };

  const tpl = await getTemplate('new_book_notification');
  const details = row('Title', bookName) + row('Author', authorName) + row('Type', typeLabel);

  let subject, html;
  if (tpl) {
    subject = interpolate(tpl.subject, vars);
    html = wrapHtml(tpl.name, buildBodyFromTemplate(tpl, vars, details));
  } else {
    subject = `${typeLabel}: ${bookName} — Sasanam`;
    html = wrapHtml(`${typeLabel} Added`,
      h2(`${typeLabel}: ${bookName}`) +
      p(`A new ${bookTypeName} has been added to our archive.`) +
      table(details) +
      btn(`View ${typeLabel}`, link)
    );
  }

  const emails = users.map((u) => u.email).filter(Boolean);
  sendBulk({ emails, subject, html });
}

module.exports = {
  sendWelcomeEmail,
  sendSubscriptionEmail,
  sendDonationEmail,
  sendNewsNotification,
  sendNewBookNotification,
};
