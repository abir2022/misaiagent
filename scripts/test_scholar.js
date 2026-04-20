const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  try {
    const { data } = await axios.get('https://scholar.google.com/citations?hl=en&user=3AwQ-8kAAAAJ', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    const $ = cheerio.load(data);
    const papers = [];
    $('.gsc_a_tr').each((i, el) => {
      const title = $(el).find('.gsc_a_at').text();
      const authors = $(el).find('.gs_gray').first().text();
      if (title) papers.push(`${title} (${authors})`);
    });
    console.log("Found papers:", papers.length);
    console.log(papers.slice(0, 3));
  } catch (e) {
    console.log("Error:", e.message);
  }
}

test();
