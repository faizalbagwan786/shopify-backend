require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const SHOP = process.env.SHOP;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

// 🔥 MAIN ROUTE
app.post("/create-order", async (req, res) => {
  try {
    const {
      price,
      width,
      height,
      unit,
      variant_id,
      measurementAssist
    } = req.body;

    // 🚨 VALIDATION
    if (!price || !variant_id) {
      return res.status(400).json({ error: "Missing price or variant_id" });
    }

    // ✅ MAIN PRODUCT
    const line_items = [
      {
        variant_id: variant_id, // IMPORTANT → shows image
        quantity: 1,
        price: price,
        properties: [
          { name: "Width", value: width || "-" },
          { name: "Height", value: height || "-" },
          { name: "Unit", value: unit || "Inches" }
        ]
      }
    ];

    // ✅ OPTIONAL MEASUREMENT ASSIST
    if (measurementAssist) {
      line_items.push({
        title: "Measurement Assist - Video Call",
        price: 30,
        quantity: 1
      });
    }

    // 🚀 CREATE DRAFT ORDER
    const response = await axios.post(
      `https://${SHOP}/admin/api/2024-04/draft_orders.json`,
      {
        draft_order: {
          line_items: line_items,
          currency: "USD", // 💥 FORCE USD
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

    res.json({
      invoice_url: response.data.draft_order.invoice_url
    });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "error creating order" });
  }
});

// 🟢 HEALTH CHECK
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});