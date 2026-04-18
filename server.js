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
    const { price, properties } = req.body;

    // 🚨 VALIDATION (FIXED)
    if (!price) {
      return res.status(400).json({
        error: "Missing price"
      });
    }

    // 🧠 Ensure properties is always array
    const safeProperties = Array.isArray(properties) ? properties : [];

    // 🧠 Extract image (optional)
    const imageProperty = safeProperties.find(p => p.name === "Image");
    const imageSrc = imageProperty?.value || null;

    // ✅ MAIN PRODUCT (NO VARIANT_ID)
    const line_items = [
      {
        title: "Custom Size Product",
        price: Number(price),
        quantity: 1,
        properties: safeProperties,
        ...(imageSrc && {
          image: {
            src: imageSrc
          }
        })
      }
    ];

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