"use strict";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://kingofyadav.in");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  var body = req.body;
  if (!body || !body.orderId) {
    return res.status(400).json({ error: "Missing orderId" });
  }

  var isQuote = !body.utr || body.utr === "quote-request";

  console.log(JSON.stringify({
    event: isQuote ? "order_quote_request" : "upi_payment_received",
    orderId: body.orderId,
    planLabel: body.planLabel || "",
    amount: body.amount || "",
    customerName: body.customerName || "",
    utr: body.utr || "",
    upiId: body.upiId || "",
    ts: new Date().toISOString()
  }));

  return res.status(200).json({
    ok: true,
    orderId: body.orderId,
    message: isQuote ? "Quote request recorded." : "Payment UTR recorded."
  });
};
