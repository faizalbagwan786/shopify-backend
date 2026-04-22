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
    const { cart } = req.body;

    if (!cart || !Array.isArray(cart)) {
      return res.status(400).json({ error: "Invalid cart data" });
    }

    const line_items = [];

    for (const item of cart) {
      // 🧠 Ensure properties is an array of { name, value }
      let safeProperties = [];
      if (Array.isArray(item.properties)) {
        safeProperties = item.properties;
      } else if (item.properties && typeof item.properties === 'object') {
        safeProperties = Object.keys(item.properties).map(key => ({
          name: key,
          value: item.properties[key]
        }));
      }

      // 🧠 Extract image — check _image prop (hidden), Image prop, or top-level image
      const imageProperty = safeProperties.find(p => p.name === "Image" || p.name === "_image");
      const imageSrc = imageProperty?.value || item.image || null;

      // ✅ MAIN PRODUCT
      const lineItem = {
        title: item.title || "Custom Size Product",
        price: Number(item.price),
        quantity: Number(item.quantity || 1),
        properties: safeProperties
      };

      line_items.push(lineItem);

      // ✅ ADD MEASUREMENT ASSIST IF SELECTED
      const hasMeasurementAssist = safeProperties.some(
        (p) =>
          p.name === "Measurement Assist" &&
          String(p.value).toLowerCase() === "yes"
      );

      if (hasMeasurementAssist) {
        line_items.push({
          title: "Measurement Assist – Video Call",
          price: 30,
          quantity: 1
        });
      }
    }

    // 🚀 CREATE DRAFT ORDER
    const response = await axios.post(
      `https://${SHOP}/admin/api/2024-04/draft_orders.json`,
      {
        draft_order: {
          line_items,
          currency: "USD",
          use_customer_default_address: true
        }
      },
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );

    // ✅ RETURN CHECKOUT URL
    res.json({
      invoice_url: response.data.draft_order.invoice_url
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
