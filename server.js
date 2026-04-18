require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const SHOP = process.env.SHOP;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

app.post("/create-order", async (req, res) => {
  try {
    const { price } = req.body;

    const response = await axios.post(
      `https://${SHOP}/admin/api/2024-04/draft_orders.json`,
      {
        draft_order: {
          line_items: [
            {
              title: "Custom Size Product",
              price: price,
              quantity: 1
            }
          ]
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

app.listen(3000, () => {
  console.log("Server running on port 3000");
});



