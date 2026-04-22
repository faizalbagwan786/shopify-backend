const axios = require('axios');
require('dotenv').config();
const query = `
  query {
    __type(name: "DraftOrderLineItemInput") {
      name
      inputFields(includeDeprecated: true) {
        name
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
      }
    }
  }
`;
axios.post(`https://${process.env.SHOP}/admin/api/2025-01/graphql.json`, { query }, { headers: { 'X-Shopify-Access-Token': process.env.ACCESS_TOKEN } })
  .then(r => console.log(JSON.stringify(r.data.data.__type.inputFields.filter(f => f.name === 'originalUnitPrice'), null, 2)))
  .catch(e => console.error(e));
