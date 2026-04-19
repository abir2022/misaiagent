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
          image_url: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https://www.du.ac.bd${imageUrl}`) : null
        });
      }
    });

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
        
        // Extracting summary from the page - usually in a specific div or first few paragraphs
        const overview = $p('.program-details, .content-area').text().trim() || $p('p').first().text().trim();
        
        programs.push({
          department_id: deptId,
          title: link.title,
          overview: overview.substring(0, 2000), // Get a long summary
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
