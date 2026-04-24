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
