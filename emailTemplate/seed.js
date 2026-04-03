/**
 * Seeds default email templates into the database.
 * Run once: node emailTemplate/seed.js
 * Safe to re-run — skips templates that already exist.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connect = require('../db');
const EmailTemplate = require('./schema');

const defaults = [
  {
    slug: 'subscription_confirmed',
    name: 'Subscription Confirmed',
    subject: 'Subscription Confirmed — Welcome to Sasanam',
    heading: 'Welcome, Contributor!',
    body: 'Dear <strong>{{name}}</strong>, thank you for subscribing to Sasanam. Your support helps preserve India\'s ancient inscriptions for future generations.\n\nYou now have full access to our archive of journals, inscriptions, and exclusive research documents.',
    buttonText: 'Explore the Archive',
    buttonUrl: 'https://sasanam.in/journal',
    fromName: 'Sasanam',
  },
  {
    slug: 'donation_thankyou',
    name: 'Donation Thank You',
    subject: 'Thank You for Your Donation — Sasanam',
    heading: 'Your Generosity Matters',
    body: 'Dear <strong>{{name}}</strong>, we are deeply grateful for your contribution to Sasanam. Your donation directly supports the preservation and digitization of ancient inscriptions.\n\nEvery contribution brings us closer to preserving centuries of history. Thank you for being part of this mission.',
    buttonText: 'View Our Archive',
    buttonUrl: 'https://sasanam.in/journal',
    fromName: 'Sasanam',
  },
  {
    slug: 'news_notification',
    name: 'News & Events Notification',
    subject: '{{title}} — Sasanam',
    heading: '{{title}}',
    body: '{{content}}',
    buttonText: 'Read Full Update',
    buttonUrl: 'https://sasanam.in/news-events',
    fromName: 'Sasanam News',
  },
  {
    slug: 'new_book_notification',
    name: 'New Book/Journal Notification',
    subject: '{{typeLabel}}: {{bookName}} — Sasanam',
    heading: '{{typeLabel}}: {{bookName}}',
    body: 'A new {{bookTypeName}} has been added to our archive.\n\nExplore this new addition to our growing collection of ancient inscriptions and historical texts.',
    buttonText: 'View {{typeLabel}}',
    buttonUrl: '{{link}}',
    fromName: 'Sasanam',
  },
];

async function seed() {
  try {
    await connect();
    for (const tpl of defaults) {
      const exists = await EmailTemplate.findOne({ slug: tpl.slug });
      if (exists) {
        console.log(`[Seed] "${tpl.slug}" already exists — skipped`);
      } else {
        await EmailTemplate.create(tpl);
        console.log(`[Seed] "${tpl.slug}" created`);
      }
    }
    console.log('[Seed] Done.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Error:', err.message);
    process.exit(1);
  }
}

seed();
