const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const { data } = await axios.get('https://www.du.ac.bd/body/faculty_details/MIS/743');
  const $ = cheerio.load(data);
  
  console.log("Email:");
  $('a[href^="mailto:"]').each((i, el) => {
    console.log($(el).text().trim());
  });
  
  console.log("Scholar/ORCID:");
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (href && (href.includes('scholar.google') || href.includes('orcid.org'))) console.log(href);
  });
}

test();
