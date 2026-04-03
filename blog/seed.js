require('dotenv').config();
const connect = require('../db');
const Blog = require('./schema');

const posts = [
  {
    title: 'What Are Sasanams? Understanding Ancient Indian Land Grant Inscriptions',
    slug: 'what-are-sasanams-ancient-indian-land-grant-inscriptions',
    excerpt: 'Sasanams are ancient inscriptions engraved on stone or copper plates recording royal land grants. Learn about their historical significance in South Indian history.',
    content: `<h2>The Origin of Sasanams</h2>
<p>The word <strong>Sasanam</strong> (also spelled Shasanam) comes from the Sanskrit root meaning "decree" or "order." In the context of South Indian history, sasanams refer to royal inscriptions — typically land grants — issued by kings of the Pallava, Chola, Pandya, and Vijayanagara dynasties.</p>
<p>These inscriptions were engraved on stone slabs, temple walls, or copper plates and served as official records of land donations made to temples, Brahmins, or military commanders.</p>

<h2>Types of Sasanams</h2>
<p><strong>Copper Plate Grants (Tamra Sasanam):</strong> Engraved on copper sheets, these were portable legal documents that the grantee could carry as proof of ownership. Famous examples include the Karandai Tamil Sangam Plates of Rajendrachola I.</p>
<p><strong>Stone Inscriptions (Sila Sasanam):</strong> Carved into temple walls, pillars, and rock faces. These are more permanent and often found in temple complexes across Tamil Nadu, Karnataka, and Andhra Pradesh.</p>
<p><strong>Temple Inscriptions:</strong> Recording donations of land, gold, cattle, or labor to temples. These provide invaluable economic data about medieval South India.</p>

<h2>Historical Significance</h2>
<p>Sasanams are primary historical sources. They reveal details about:</p>
<ul>
<li>Administrative divisions and village boundaries</li>
<li>Tax systems and agricultural practices</li>
<li>Social hierarchy and caste structures</li>
<li>Religious practices and temple economies</li>
<li>Genealogies of royal dynasties</li>
</ul>

<h2>The Sasanam.in Project</h2>
<p>At Sasanam.in, we are building India's most comprehensive digital archive of these ancient inscriptions. Our mission is to digitize, translate, and make accessible thousands of inscriptions that are currently scattered across temples, museums, and private collections.</p>`,
    author: 'Dr. Raghavan Iyer',
    category: 'history',
    tags: ['sasanam', 'inscriptions', 'land grants', 'copper plates', 'south india history'],
    metaTitle: 'What Are Sasanams? Ancient Indian Land Grant Inscriptions Explained',
    metaDescription: 'Learn about Sasanams — ancient South Indian inscriptions recording royal land grants on copper plates and stone. Explore Pallava, Chola, and Pandya era inscriptions.',
  },
  {
    title: 'Deciphering Pallava Grantha Script: A Beginner\'s Guide',
    slug: 'deciphering-pallava-grantha-script-beginners-guide',
    excerpt: 'The Pallava Grantha script is the ancestor of many Southeast Asian writing systems. This guide introduces its history, structure, and how to read basic characters.',
    content: `<h2>What is the Grantha Script?</h2>
<p>The <strong>Grantha script</strong> is an ancient writing system that was developed by the Pallava dynasty in South India around the 5th century CE. It was primarily used to write Sanskrit and was the precursor to many modern scripts including Tamil, Malayalam, Khmer, Thai, and Javanese.</p>

<h2>The Pallava Connection</h2>
<p>Under the Pallavas of Kanchipuram, the Grantha script reached its classical form. Pallava kings like Mahendravarman I and Narasimhavarman I were great patrons of literature and epigraphy. Their inscriptions can be found across Tamil Nadu, particularly at Mamallapuram and Kanchipuram.</p>

<h2>Basic Structure</h2>
<p>Grantha is an abugida — each consonant carries an inherent 'a' vowel sound. Key features include:</p>
<ul>
<li><strong>Vowels:</strong> 14 independent vowel signs</li>
<li><strong>Consonants:</strong> 35 basic consonant characters</li>
<li><strong>Conjuncts:</strong> Combined consonant forms for clusters</li>
<li><strong>Numerals:</strong> A unique decimal numeral system</li>
</ul>

<h2>Where to Find Pallava Inscriptions</h2>
<p>Some of the finest examples of Pallava Grantha inscriptions are at:</p>
<ul>
<li>Shore Temple, Mamallapuram</li>
<li>Kailasanatha Temple, Kanchipuram</li>
<li>Vaikuntha Perumal Temple, Kanchipuram</li>
<li>Tiger Cave, Saluvankuppam</li>
</ul>
<p>Visit <a href="https://sasanam.in/journal">our journal section</a> to explore digitized Pallava inscriptions.</p>`,
    author: 'Prof. Meenakshi Sundaram',
    category: 'epigraphy',
    tags: ['pallava', 'grantha script', 'epigraphy', 'ancient writing', 'kanchipuram'],
    metaTitle: 'Deciphering Pallava Grantha Script: A Beginner\'s Guide',
    metaDescription: 'Learn to read the ancient Pallava Grantha script. Explore its history, structure, and where to find Pallava inscriptions in Tamil Nadu.',
  },
  {
    title: 'The Chola Empire\'s Copper Plate Grants: A Digital Archive',
    slug: 'chola-empire-copper-plate-grants-digital-archive',
    excerpt: 'The Chola dynasty produced some of India\'s most detailed copper plate inscriptions. Discover how we are digitizing these 1000-year-old records.',
    content: `<h2>The Chola Legacy in Epigraphy</h2>
<p>The <strong>Chola dynasty</strong> (c. 300 BCE – 1279 CE) was one of the longest-ruling dynasties in world history. Their contributions to art, architecture, and administration are well documented — largely because of their meticulous record-keeping through inscriptions.</p>

<h2>Famous Chola Copper Plates</h2>
<p><strong>Larger Leiden Plates of Rajaraja I:</strong> Found in the Netherlands, these copper plates record land grants by the great Rajaraja Chola I. They are among the most significant epigraphic discoveries of the 20th century.</p>
<p><strong>Karandai Tamil Sangam Plates:</strong> Issued by Rajendrachola I, these plates record grants to a Brahmin assembly and provide crucial information about Chola administration.</p>
<p><strong>Anbil Plates:</strong> A set of copper plates from the reign of Sundara Chola, detailing land grants in the Thanjavur region.</p>

<h2>What Chola Inscriptions Tell Us</h2>
<p>Chola inscriptions are remarkably detailed. A single copper plate grant might contain:</p>
<ul>
<li>The king's genealogy going back several generations</li>
<li>A poetic description of the king's military victories</li>
<li>Precise village boundaries using natural landmarks</li>
<li>Tax exemptions and revenue details</li>
<li>Witnesses and officials who verified the grant</li>
</ul>

<h2>Our Digitization Effort</h2>
<p>Sasanam.in is systematically photographing, transcribing, and translating Chola-era copper plates. Our archive currently contains over 2,000 Chola inscriptions, with new additions every week.</p>`,
    author: 'Sasanam Team',
    category: 'history',
    tags: ['chola', 'copper plates', 'rajaraja', 'rajendrachola', 'tamil nadu inscriptions'],
    metaTitle: 'Chola Empire Copper Plate Grants — Digital Archive | Sasanam',
    metaDescription: 'Explore digitized Chola dynasty copper plate inscriptions. Learn about Rajaraja I, Rajendrachola I, and how we preserve these 1000-year-old records.',
  },
  {
    title: 'How to Contribute to Sasanam: A Guide for History Enthusiasts',
    slug: 'how-to-contribute-to-sasanam-guide',
    excerpt: 'Want to help preserve India\'s ancient inscriptions? Here\'s how you can contribute to Sasanam through transcription, translation, photography, and donations.',
    content: `<h2>Why Community Contribution Matters</h2>
<p>India has an estimated <strong>100,000+ inscriptions</strong> scattered across temples, museums, and archaeological sites. Many are deteriorating due to weather, pollution, and neglect. Sasanam.in relies on community contributors to help document and preserve these irreplaceable records.</p>

<h2>Ways to Contribute</h2>

<h3>1. Photograph Inscriptions</h3>
<p>If you visit temples or historical sites, take high-quality photographs of inscriptions. Use natural lighting, capture multiple angles, and include a scale reference. Upload them through our contributor portal.</p>

<h3>2. Transcribe and Translate</h3>
<p>If you can read Tamil, Sanskrit, Grantha, or other ancient scripts, help us transcribe inscriptions into digital text. This is the most valuable contribution — turning stone carvings into searchable text.</p>

<h3>3. Verify and Review</h3>
<p>Even if you can't read ancient scripts, you can help review transcriptions by comparing them with photographs. Multiple reviewers improve accuracy.</p>

<h3>4. Donate</h3>
<p>Financial contributions help us fund field expeditions, purchase equipment for high-resolution scanning, and maintain our digital infrastructure.</p>

<h3>5. Subscribe</h3>
<p>A <a href="https://sasanam.in/pricing">Sasanam subscription</a> gives you full access to our archive while directly funding our preservation work.</p>

<h2>Getting Started</h2>
<p><a href="https://sasanam.in/signup">Create a free account</a> to begin exploring. Subscribers get access to the full archive including high-resolution images and detailed translations.</p>`,
    author: 'Sasanam Team',
    category: 'community',
    tags: ['contribute', 'community', 'volunteer', 'preservation', 'how to'],
    metaTitle: 'How to Contribute to Sasanam — Preserve Ancient Inscriptions',
    metaDescription: 'Help preserve India\'s ancient inscriptions. Contribute to Sasanam through photography, transcription, translation, donations, or subscriptions.',
  },
  {
    title: 'Top 10 Ancient Inscription Sites to Visit in Tamil Nadu',
    slug: 'top-10-ancient-inscription-sites-tamil-nadu',
    excerpt: 'From Mamallapuram to Thanjavur, discover the most significant epigraphic sites in Tamil Nadu where you can see ancient inscriptions in person.',
    content: `<h2>Tamil Nadu: The Epigraphic Capital of India</h2>
<p>Tamil Nadu has the highest concentration of ancient inscriptions in India — over <strong>30,000 documented inscriptions</strong> spanning 2,000 years. Here are the top 10 sites every history enthusiast must visit.</p>

<h3>1. Brihadeeswarar Temple, Thanjavur</h3>
<p>Built by Rajaraja Chola I in 1010 CE, this UNESCO World Heritage Site has extensive inscriptions covering its walls. They record donations of gold, land, and dancers to the temple.</p>

<h3>2. Shore Temple, Mamallapuram</h3>
<p>The Pallava-era Shore Temple (c. 700 CE) contains some of the earliest examples of structural temple inscriptions in Tamil Nadu.</p>

<h3>3. Kailasanatha Temple, Kanchipuram</h3>
<p>Built by Pallava king Narasimhavarman II, this temple has beautiful Grantha script inscriptions that are among the finest examples of early medieval epigraphy.</p>

<h3>4. Airavatesvara Temple, Darasuram</h3>
<p>This Chola-era temple near Kumbakonam features intricate inscriptions describing the temple's construction and endowments.</p>

<h3>5. Vaikuntha Perumal Temple, Kanchipuram</h3>
<p>Contains a unique series of panel inscriptions narrating the history of the Pallava dynasty — essentially a stone history book.</p>

<h3>6. Thirumalai Inscriptions, Polur</h3>
<p>Ancient Jain inscriptions in Vatteluttu script, dating to the 9th century CE. Important for understanding Jain influence in Tamil Nadu.</p>

<h3>7. Uttaramerur, Kanchipuram District</h3>
<p>Famous for its inscriptions describing an ancient democratic system of village governance — one of the earliest records of democratic elections in the world.</p>

<h3>8. Sittannavasal Cave, Pudukkottai</h3>
<p>Jain cave with Tamil-Brahmi inscriptions dating to the 2nd century BCE — among the oldest inscriptions in Tamil Nadu.</p>

<h3>9. Gangaikonda Cholapuram</h3>
<p>Built by Rajendra Chola I, this temple complex has inscriptions recording his military conquests across the Ganges.</p>

<h3>10. Kazhugumalai, Thoothukudi</h3>
<p>Rock-cut Jain temple with 8th-century inscriptions in Tamil and Vatteluttu script. A hidden gem of South Indian epigraphy.</p>

<p>Plan your epigraphic tour and explore these inscriptions digitally on <a href="https://sasanam.in/journal">Sasanam's journal</a>.</p>`,
    author: 'Dr. Raghavan Iyer',
    category: 'travel',
    tags: ['tamil nadu', 'temples', 'inscriptions', 'travel', 'heritage sites', 'thanjavur', 'mamallapuram'],
    metaTitle: 'Top 10 Ancient Inscription Sites in Tamil Nadu | Sasanam',
    metaDescription: 'Discover the 10 most important ancient inscription sites in Tamil Nadu. From Thanjavur to Mamallapuram — plan your epigraphic heritage tour.',
  },
];

async function seed() {
  try {
    await connect();
    for (const post of posts) {
      const exists = await Blog.findOne({ slug: post.slug });
      if (exists) {
        console.log(`[Seed] "${post.slug}" exists — skipped`);
      } else {
        await Blog.create(post);
        console.log(`[Seed] "${post.slug}" created`);
      }
    }
    console.log('[Seed] Blog posts done.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Error:', err.message);
    process.exit(1);
  }
}

seed();
