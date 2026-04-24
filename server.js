require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const SHOP = process.env.SHOP;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

// 🔥 CREATE ORDER
app.post("/create-order", async (req, res) => {
  try {
    console.log("Incoming cart:", req.body);
    const { cart, shippingRate, shippingAddress } = req.body;

    // Define Canadian Tax Rates according to the client's chart
    const taxRates = {
      "Alberta": 0.05,
      "British Columbia": 0.12,
      "Manitoba": 0.12,
      "New Brunswick": 0.15,
      "Newfoundland and Labrador": 0.15,
      "Northwest Territories": 0.05,
      "Nova Scotia": 0.14,
      "Nunavut": 0.05,
      "Ontario": 0.13,
      "Prince Edward Island": 0.15,
      "Quebec": 0.14975,
      "Saskatchewan": 0.11,
      "Yukon": 0.05
    };

    if (!cart || !Array.isArray(cart)) {
      return res.status(400).json({ error: "Invalid cart data" });
    }

    const lineItemsNode = [];

    for (const item of cart) {
      // 🧠 Ensure properties is an array of { name, value }
      let safeProperties = [];
      if (Array.isArray(item.properties)) {
        safeProperties = item.properties.map(p => ({ key: p.name || p.key, value: String(p.value) }));
      } else if (item.properties && typeof item.properties === 'object') {
        safeProperties = Object.keys(item.properties).map(key => ({
          key: key,
          value: String(item.properties[key])
        }));
      }

      // Add actual variant or custom fallback
      const node = {
        quantity: Number(item.quantity || 1),
        customAttributes: safeProperties,
        taxable: true
      };

      if (item.variant_id) {
        // 🔥 Use Shopify's new GraphQL priceOverride feature (v2025-01+) 
        // to forcefully override the variant price while KEEPING the native image!
        node.variantId = `gid://shopify/ProductVariant/${item.variant_id}`;
        node.priceOverride = {
          amount: parseFloat(item.price).toFixed(2),
          currencyCode: "CAD"
        };
      } else {
        node.title = item.title || "Custom Size Product";
        // Shopify GraphQL expects a scalar string for originalUnitPrice, NOT an object.
        node.originalUnitPrice = parseFloat(item.price).toFixed(2);
      }

      lineItemsNode.push(node);

      // ✅ ADD MEASUREMENT ASSIST IF SELECTED
      const hasMeasurementAssist = safeProperties.some(
        (p) =>
          p.key === "Measurement Assist" &&
          p.value.toLowerCase() === "yes"
      );

      if (hasMeasurementAssist) {
        lineItemsNode.push({
          title: "Measurement Assist – Video Call",
          quantity: 1,
          originalUnitPrice: "30.00",
          taxable: true
        });
      }
    }

    // 🧮 CALCULATE CUSTOM TAXES IF PROVINCE IS PROVIDED
    if (shippingAddress && shippingAddress.province && taxRates[shippingAddress.province]) {
      let subtotal = 0;
      
      // Calculate cart subtotal
      cart.forEach(item => {
        subtotal += (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
      });

      // Add measurement assist to subtotal if it was added
      const hasMeasurementAssist = cart.some(
        item => item.properties && (item.properties["Measurement Assist"] === "Yes" || item.properties["Measurement Assist"] === true)
      );
      if (hasMeasurementAssist) {
        subtotal += 30.00;
      }

      // Add shipping rate to subtotal before tax
      let shippingCost = 0;
      if (shippingRate && shippingRate.price) {
        shippingCost = parseFloat(shippingRate.price) || 0;
      }

      const taxableAmount = subtotal + shippingCost;
      const taxRate = taxRates[shippingAddress.province];
      const taxAmount = taxableAmount * taxRate;

      // Add Tax as a Custom Line Item
      if (taxAmount > 0) {
        lineItemsNode.push({
          title: `Estimated Taxes (${shippingAddress.province})`,
          quantity: 1,
          originalUnitPrice: taxAmount.toFixed(2),
          taxable: false // Do not tax the tax!
        });
      }
    }

    // 🚀 CREATE DRAFT ORDER VIA GRAPHQL
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
        lineItems: lineItemsNode,
        useCustomerDefaultAddress: true
      }
    };

    // ✅ APPLY SHIPPING RATE IF PROVIDED FROM CART
    if (shippingRate && shippingRate.title && shippingRate.price) {
      variables.input.shippingLine = {
        title: shippingRate.title,
        price: parseFloat(shippingRate.price).toFixed(2)
      };
    }

    // ✅ PRE-FILL SHIPPING ADDRESS SO TAXES CALCULATE INSTANTLY
    if (shippingAddress && shippingAddress.country && shippingAddress.province) {
      variables.input.shippingAddress = {
        country: shippingAddress.country,
        province: shippingAddress.province,
        zip: shippingAddress.zip || ""
      };
    }

    const response = await axios.post(
      `https://${SHOP}/admin/api/2025-01/graphql.json`,
      { query, variables },
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );

    if (response.data.errors) {
      console.error("GraphQL Errors:", response.data.errors);
      return res.status(500).json({ error: "GraphQL Error: " + response.data.errors[0].message });
    }

    if (response.data.data?.draftOrderCreate?.userErrors?.length > 0) {
      console.error("User Errors:", response.data.data.draftOrderCreate.userErrors);
      return res.status(500).json({ error: response.data.data.draftOrderCreate.userErrors[0].message });
    }

    // ✅ RETURN CHECKOUT URL
    res.json({
      invoice_url: response.data.data.draftOrderCreate.draftOrder.invoiceUrl
    });

  } catch (error) {
    console.error("❌ Shopify Error:", error.response?.data || error.message);

    res.status(500).json({
      error: "Failed to create draft order"
    });
  }
});

// 🟢 HEALTH CHECK
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
