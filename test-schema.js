require('dotenv').config();
const axios = require('axios');

async function test() {
  const q = `query { __type(name: "DraftOrderLineItemInput") { inputFields { name } } }`;
  try {
    const res = await axios.post(`https://${process.env.SHOP}/admin/api/2025-01/graphql.json`, 
      { query: q }, 
      { headers: { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN } }
    );
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
