require('dotenv').config();
const axios = require('axios');

async function test() {
  try {
    const payload = {
      draft_order: {
        line_items: [
          {
            title: "Custom Item",
            price: "100.00",
            quantity: 1
          }
        ],
        shipping_line: {
          title: "Standard",
          price: "15.00"
        },
        shipping_address: {
          country: "Canada",
          province: "British Columbia",
          zip: "V4E0Z8"
        },
        tax_exempt: false,
        tax_lines: [
          {
            title: "Custom PST",
            price: "12.00",
            rate: 0.12
          }
        ]
      }
    };

    const res = await axios.post(`https://${process.env.SHOP}/admin/api/2025-01/draft_orders.json`, 
      payload, 
      { headers: { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN } }
    );
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
