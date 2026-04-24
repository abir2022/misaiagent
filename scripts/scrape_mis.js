// scripts/scrape_mis.js
const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function scrapeMIS() {
  console.log("🚀 Starting MIS Scraper...");

  try {
    // 1. Get or Create Department ID
    let { data: dept, error: deptError } = await supabase
      .from('departments')
      .select('id')
      .eq('name', 'Management Information Systems')
      .maybeSingle();

    if (!dept) {
      console.log("📝 MIS Department not found. Creating it now...");
      const { data: newDept, error: createError } = await supabase
        .from('departments')
        .insert([{ name: 'Management Information Systems', url: 'https://www.du.ac.bd/body/MIS' }])
        .select()
        .single();
      
      if (createError) {
        console.error("❌ Error creating department:", createError.message);
        return;
      }
      dept = newDept;
    }

    const deptId = dept.id;

    // 2. Scrape Teachers
    console.log("📑 Scraping teachers...");
    const facultyUrl = 'https://www.du.ac.bd/body/FacultyMembers/MIS';
    const { data: html } = await axios.get(facultyUrl);
    const $ = cheerio.load(html);
    
    const teachers = [];
    $('.item').each((_, el) => {
      const name = $(el).find('h4').text().trim();
      const designation = $(el).find('span').text().trim();
      const profileUrl = $(el).find('a.btn').attr('href');
      const imageUrl = $(el).find('img').attr('src');
      
      if (name && designation) {
        teachers.push({
          department_id: deptId,
          name,
          designation,
          profile_url: profileUrl ? (profileUrl.startsWith('http') ? profileUrl : `https://www.du.ac.bd${profileUrl}`) : null,
          image_url: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https://www.du.ac.bd${imageUrl}`) : null,
          metadata: {}
        });
      }
    });

    console.log(`✅ Found ${teachers.length} teachers. Fetching full profiles...`);
    
    // Fetch individual profile pages
    for (let t of teachers) {
      if (t.profile_url) {
        try {
          const { data: profileHtml } = await axios.get(t.profile_url);
          const $p = cheerio.load(profileHtml);
          
          let bioParts = [];
          // Target specifically the bio tab content and common containers
          $p('#biographyInfo p, #biographyInfo li, .col-md-9 p, .col-md-9 li, .info.title div').each((_, el) => {
             const text = $p(el).text().trim();
             if (text && text.length > 5) {
                 bioParts.push(text);
             }
          });
          
          let bioText = bioParts.join('\n');
          if (!bioText) {
             bioText = $p('.info.title').text().trim() || $p('p').first().text().trim();
          }
          
          let scholar = null;
          let orcid = null;
          $p('a').each((_, aEl) => {
             const href = $p(aEl).attr('href');
             if (href && href.includes('scholar.google')) scholar = href;
             if (href && href.includes('orcid.org')) orcid = href;
          });

          const research = $p('#researchActivities').text().trim();
          const publications = $p('#publicationInfo').text().trim();

          let email = null;
          let phone = null;
          
          $p('#contactInfo div').each((_, divEl) => {
             const text = $p(divEl).text().trim();
             if (text.startsWith('Email:')) email = text.replace('Email:', '').trim();
             if (text.startsWith('Phone:')) phone = text.replace('Phone:', '').trim();
          });

          // Fallback if not found in specific labels
          if (!email) {
            $p('a[href^="mailto:"]').each((_, aEl) => {
               const mailText = $p(aEl).text().trim();
               if (mailText && !mailText.includes('chairman.mis')) {
                  email = mailText;
               }
            });
          }

          const contactText = $p('#contactInfo, .faculty-details, p').text();
          if (!phone) {
            const phoneMatches = contactText.match(/\+88[0-9\-\s]+/g) || contactText.match(/01[0-9\-\s]{8,15}/g);
            if (phoneMatches && phoneMatches[0] && !phoneMatches[0].includes('09666')) {
               phone = phoneMatches[0].trim();
            }
          }

          t.metadata = { 
            bio: bioText.substring(0, 4000),
            scholar: scholar,
            orcid: orcid,
            research: research ? research.substring(0, 2000) : null,
            publications: publications ? publications.substring(0, 3000) : null,
            email: email,
            phone: phone
          };
          console.log(`✅ Scraped full profile for ${t.name}`);
        } catch (e) {
          console.log(`❌ Failed to scrape profile for ${t.name}`);
        }
      }
    }

    console.log(`✅ Found ${teachers.length} teachers. Uploading to Supabase...`);
    const { error: tError } = await supabase.from('teachers').upsert(teachers, { onConflict: 'name' });
    if (tError) console.error("❌ Error uploading teachers:", tError.message);

    // 3. Scrape Programs (Detailed)
    console.log("📑 Scraping detailed program summaries...");
    const programLinks = [
      { title: 'Bachelor of Business Administration (BBA)', id: '343' },
      { title: 'Master of Business Administration (MBA)', id: '344' },
      { title: 'Master of Professional MIS (MPMIS)', id: '516' },
      { title: 'Executive MBA', id: '345' },
      { title: 'M.Phil', id: '346' },
      { title: 'PhD', id: '347' }
    ];

    const programs = [];
    for (const link of programLinks) {
      try {
        const pUrl = `https://www.du.ac.bd/programDetails/MIS/${link.id}`;
        const { data: pHtml } = await axios.get(pUrl);
        const $p = cheerio.load(pHtml);
        
        // Extracting all meaningful text from the main container
        let fullText = '';
        $p('.col-md-9 p, .col-md-9 li, .col-md-9 h4, .col-md-9 h5, .col-md-9 td').each((_, el) => {
           const text = $p(el).text().trim();
           if (text && text.length > 5) {
             fullText += text + '\n';
           }
        });
        
        programs.push({
          department_id: deptId,
          title: link.title,
          overview: fullText || $p('p').text().trim(), // Keep full text
          program_url: pUrl
        });
        console.log(`✅ Scraped ${link.title}`);
      } catch (e) {
        console.error(`❌ Failed to scrape ${link.title}`);
      }
    }

    if (programs.length > 0) {
      await supabase.from('programs').upsert(programs, { onConflict: 'title' });
    }

    console.log("🎉 Detailed Scraping complete!");

  } catch (error) {
    console.error("❌ Scraper failed:", error.message);
  }
}

scrapeMIS();
