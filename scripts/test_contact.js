const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const { data } = await axios.get('https://www.du.ac.bd/body/faculty_details/MIS/747');
  const $ = cheerio.load(data);
  
  console.log("--- CONTACT TAB CONTENT ---");
  console.log($('#contactInfo').text().trim());
  
  console.log("--- CONTACT TAB HTML ---");
  console.log($('#contactInfo').html());
}

test();
