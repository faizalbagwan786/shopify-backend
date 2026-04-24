require('dotenv').config();
const axios = require('axios');

async function test() {
  const query = `
    mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          invoiceUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      lineItems: [
        {
          title: "Test Custom Item",
          originalUnitPrice: "100.00",
          quantity: 1,
          taxable: true
        }
      ],
      useCustomerDefaultAddress: true,
      shippingLine: {
        title: "Standard Shipping",
        price: "15.00"
      },
      shippingAddress: {
        country: "Canada",
        province: "British Columbia",
        zip: "V4E0Z8"
      }
    }
  };

  try {
    const res = await axios.post(`https://${process.env.SHOP}/admin/api/2025-01/graphql.json`, 
      { query, variables }, 
      { headers: { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN } }
    );
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
