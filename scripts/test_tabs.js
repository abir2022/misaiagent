const axios = require('axios');

async function test() {
  const { data } = await axios.get('https://www.du.ac.bd/body/faculty_details/MIS/69574');
  console.log("--- HAS PUBLICATION INFO? ---");
  console.log(data.includes('publicationInfo'));
  console.log(data.includes('researchActivities'));
  console.log("--- SNIPPET AROUND TABS ---");
  const index = data.indexOf('id="publicationInfo"');
  if (index !== -1) {
    console.log(data.substring(index, index + 500));
  } else {
    console.log("publicationInfo ID NOT FOUND");
  }
}

test();
