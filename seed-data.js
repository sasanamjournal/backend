/**
 * Seed script — inserts dummy data for Library, Archive, Community, and News.
 *
 * Usage:  node seed-data.js
 *
 * It skips any collection that already has documents so it's safe to run repeatedly.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connect = require('./db');

const makeLibraryLinkModel = require('./library/schema');
const makeArchiveItemModel = require('./archive/schema');
const makeResourceCenterModel = require('./community/schema');
const makeUserNewsModel = require('./userNews/schema');

const libraryLinks = [
  {
    title: 'Archaeological Survey of India — Epigraphy Branch',
    description: 'Official repository of inscriptions documented by the Archaeological Survey of India. Includes reports, estampages, and annual publications.',
    url: 'https://asi.nic.in',
    category: 'Government Archives',
    isPublished: true,
    order: 1,
  },
  {
    title: 'South Indian Inscriptions Series (Digital Library of India)',
    description: 'Digitized volumes of the South Indian Inscriptions series covering Pallava, Chola, Pandya, and Vijayanagara period records.',
    url: 'https://www.dli.ernet.in',
    category: 'Government Archives',
    isPublished: true,
    order: 2,
  },
  {
    title: 'EFEO — French Institute of Pondicherry',
    description: 'Extensive collection of Tamil and Sanskrit inscriptions documented by French scholars. Contains high-resolution photographs and transcriptions.',
    url: 'https://www.ifpindia.org',
    category: 'Research Institutions',
    isPublished: true,
    order: 3,
  },
  {
    title: 'Project Madurai — Tamil Literary Texts',
    description: 'Free online library of encyclopaedic encyclopaedic encyclopaedic encyclopaedic Tamil encyclopaedic encyclopaedic literary encyclopaedic works, including Sangam literature and medieval inscriptional poetry.',
    url: 'https://www.projectmadurai.org',
    category: 'Digital Libraries',
    isPublished: true,
    order: 4,
  },
  {
    title: 'Indian Epigraphical Glossary — University of Madras',
    description: 'Comprehensive glossary of technical terms found in Indian inscriptions, essential for deciphering ancient texts.',
    url: 'https://www.unom.ac.in',
    category: 'Research Institutions',
    isPublished: true,
    order: 5,
  },
  {
    title: 'Tamil Heritage Foundation — Inscription Database',
    description: 'Community-driven database cataloguing thousands of Tamil inscriptions with location data, transliterations, and translations.',
    url: 'https://tamilheritage.org',
    category: 'Digital Libraries',
    isPublished: true,
    order: 6,
  },
];

const archiveItems = [
  {
    title: 'The Founding of Sasanam',
    period: 'Early Origins',
    content: 'Sasanam began as a humble effort by a group of passionate epigraphists and historians who recognised the urgent need to preserve the rapidly deteriorating stone and copper plate inscriptions of South India. What started as weekend field trips to temple towns in Tamil Nadu grew into a systematic documentation project that would eventually touch every district in the state.',
    isPublished: true,
    order: 1,
  },
  {
    title: 'First Major Expedition — Thanjavur District',
    period: '2018–2019',
    content: 'The Thanjavur expedition marked Sasanam\'s first large-scale field campaign. Over six months, the team documented 347 previously unrecorded inscriptions across the Chola heartland. Highlights included the discovery of a bilingual Tamil-Sanskrit land grant at Darasuram and a rare mention of a Pandya queen in a Chola-era temple.',
    isPublished: true,
    order: 2,
  },
  {
    title: 'Digital Transformation Initiative',
    period: '2020–2021',
    content: 'When the pandemic halted fieldwork, Sasanam pivoted to building a digital platform. Thousands of photographs, rubbings, and hand-drawn estampages were scanned and catalogued. The team developed a custom OCR pipeline for ancient Tamil scripts and launched the first version of the online inscription viewer.',
    isPublished: true,
    order: 3,
  },
  {
    title: 'Community Growth and Partnerships',
    period: '2022–2023',
    content: 'Sasanam opened its doors to public contributors, enabling citizen epigraphists to submit discoveries through the platform. Partnerships were established with the Tamil Nadu State Archaeology Department, the French Institute of Pondicherry, and three universities. The community grew from 50 core volunteers to over 2,000 registered contributors.',
    isPublished: true,
    order: 4,
  },
  {
    title: 'The 10,000 Inscription Milestone',
    period: '2024–2025',
    content: 'Sasanam\'s archive crossed 10,000 digitised inscriptions, making it one of the largest open-access epigraphic databases in India. The milestone was celebrated with a national conference bringing together scholars from across the country. AI-assisted transliteration tools were introduced, reducing the time to process a new inscription by 60%.',
    isPublished: true,
    order: 5,
  },
];

const resourceCenters = [
  {
    name: 'Archaeological Survey of India — Chennai Circle',
    description: 'The ASI Chennai Circle oversees the protection and documentation of monuments and inscriptions across Tamil Nadu. Houses one of the largest collections of estampages in the country.',
    location: 'Chennai, Tamil Nadu',
    url: 'https://asi.nic.in',
    isPublished: true,
    order: 1,
  },
  {
    name: 'Government Museum, Egmore',
    description: 'Home to the renowned Bronze Gallery and an extensive collection of stone inscriptions, sculptures, and numismatic specimens dating from the Pallava to the Nayak period.',
    location: 'Chennai, Tamil Nadu',
    url: 'https://www.chennaimuseum.org',
    isPublished: true,
    order: 2,
  },
  {
    name: 'French Institute of Pondicherry (IFP)',
    description: 'A premier research institution with decades of work on South Indian epigraphy. Their Indology department maintains a digital corpus of Pallava and Chola inscriptions.',
    location: 'Puducherry',
    url: 'https://www.ifpindia.org',
    isPublished: true,
    order: 3,
  },
  {
    name: 'Thanjavur Maharaja Serfoji\'s Sarasvati Mahal Library',
    description: 'One of the oldest libraries in Asia, housing over 49,000 manuscripts in Tamil, Sanskrit, Telugu, and Marathi. Includes rare palm-leaf inscriptional copies.',
    location: 'Thanjavur, Tamil Nadu',
    url: 'https://www.sarasvatimahallibrary.tn.gov.in',
    isPublished: true,
    order: 4,
  },
  {
    name: 'Epigraphy Branch — Mysore',
    description: 'The Mysore office of the Epigraphy Branch maintains records of inscriptions from Karnataka and parts of Andhra Pradesh. Key resource for Chalukya and Hoysala period studies.',
    location: 'Mysuru, Karnataka',
    url: 'https://asi.nic.in',
    isPublished: true,
    order: 5,
  },
  {
    name: 'Tamil University — Thanjavur',
    description: 'A state university dedicated to Tamil studies with a specialised department of epigraphy and archaeology. Runs regular certificate courses in reading ancient scripts.',
    location: 'Thanjavur, Tamil Nadu',
    url: 'https://www.tamiluniversity.ac.in',
    isPublished: true,
    order: 6,
  },
];

const newsItems = [
  {
    title: 'Discovery of Rare Pallava Inscription in Kanchipuram',
    content: 'A team of researchers has uncovered a previously unknown Pallava-era stone inscription near the Kailasanatha Temple complex, dating back to the 7th century CE. The inscription details a land grant by King Narasimhavarman I and sheds new light on the administrative divisions of the Pallava kingdom.',
    category: 'news',
    isPublished: true,
    author: 'Sasanam Team',
  },
  {
    title: 'Annual Heritage Symposium — Tamil Epigraphy 2026',
    content: 'Join us on April 15th for our flagship conference bringing together scholars, epigraphists, and history enthusiasts from across the world. Topics include Chola copper plates, Grantha script evolution, and AI-assisted decipherment. Registration is now open.',
    category: 'event',
    isPublished: true,
    author: 'Sasanam Team',
  },
  {
    title: 'Sasanam Archive Crosses 10,000 Digitized Inscriptions',
    content: 'We are thrilled to announce that our community-driven digitization project has surpassed the 10,000 inscription milestone. This achievement was made possible by the tireless efforts of over 2,000 volunteer contributors. Thank you to every contributor who made this possible.',
    category: 'news',
    isPublished: true,
    author: 'Sasanam Team',
  },
  {
    title: 'Workshop: Introduction to Reading Vatteluttu Script',
    content: 'A beginner-friendly virtual workshop covering the basics of Vatteluttu, the ancient Tamil script used from the 6th to 12th century CE. Includes hands-on exercises with real inscription rubbings. Limited seats available — register by April 25th.',
    category: 'event',
    isPublished: true,
    author: 'Sasanam Team',
  },
  {
    title: 'New Translation: Karandai Tamil Sangam Plates of Rajendrachola',
    content: 'Our team has completed a comprehensive English translation of the famous Karandai Tamil Sangam copper plates. The full annotated text, with historical commentary and photographic plates, is now available in our Library section.',
    category: 'news',
    isPublished: true,
    author: 'Sasanam Team',
  },
  {
    title: 'Community Field Trip — Mamallapuram Shore Temple Inscriptions',
    content: 'Explore the inscriptions of the Shore Temple complex in Mamallapuram with expert guides from the ASI and Sasanam. Open to all Sasanam community members. Registration closes April 1st. Transport will be arranged from Chennai.',
    category: 'event',
    isPublished: true,
    author: 'Sasanam Team',
  },
];

async function seed() {
  try {
    await connect();
    console.log('Connected to MongoDB');

    const LibraryLink = makeLibraryLinkModel(mongoose);
    const ArchiveItem = makeArchiveItemModel(mongoose);
    const ResourceCenter = makeResourceCenterModel(mongoose);
    const UserNews = makeUserNewsModel(mongoose);

    // Library Links
    const libCount = await LibraryLink.countDocuments();
    if (libCount === 0) {
      await LibraryLink.insertMany(libraryLinks);
      console.log(`Seeded ${libraryLinks.length} library links`);
    } else {
      console.log(`Library links already has ${libCount} docs — skipping`);
    }

    // Archive Items
    const arcCount = await ArchiveItem.countDocuments();
    if (arcCount === 0) {
      await ArchiveItem.insertMany(archiveItems);
      console.log(`Seeded ${archiveItems.length} archive items`);
    } else {
      console.log(`Archive items already has ${arcCount} docs — skipping`);
    }

    // Resource Centers
    const comCount = await ResourceCenter.countDocuments();
    if (comCount === 0) {
      await ResourceCenter.insertMany(resourceCenters);
      console.log(`Seeded ${resourceCenters.length} resource centers`);
    } else {
      console.log(`Resource centers already has ${comCount} docs — skipping`);
    }

    // News
    const newsCount = await UserNews.countDocuments();
    if (newsCount === 0) {
      await UserNews.insertMany(newsItems);
      console.log(`Seeded ${newsItems.length} news items`);
    } else {
      console.log(`News already has ${newsCount} docs — skipping`);
    }

    console.log('Seed complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
