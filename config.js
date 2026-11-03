/* =======================================================================
   Rafter J Storage Units — site settings
   =======================================================================
   Everything you might ever want to change lives in this one file.
   Edit a value, keep the quotes, save, and the whole site updates.
   ======================================================================= */
const SITE = {
  businessName: "Rafter J Storage Units",
  legalName: "Rafter J Properties, LLC",
  phoneDisplay: "(361) 576-3825",
  phoneLink: "+13615763825",
  email: "teams@rafterjconstruction.com",
  address: "36 Hunters Circle",
  city: "Victoria",
  state: "TX",
  zip: "77905",
  officeHours: "Monday – Friday, 8:00 AM – 3:00 PM",
  gateHours: "24/7 keypad gate access for tenants",

  /* Web3Forms key — every form on the site (questions, reservation
     requests, signed agreements) is emailed to the inbox this key
     belongs to. Same key as the color selection sites. */
  web3formsKey: "b04a8faf-0c65-41f8-8bd7-c8f66238788c",


  /* Money */
  deposit: 35,
  lateFee: 5,
  /* Leave "" to show a blank line on the agreement, like the paper copy. */
  overlockCharge: "",
  returnedCheckCharge: "",
  rentDueDay: "1st",
  lateAfterDay: "10th",
  sizes: {
    "10x10": { rent: 50, blurb: "About the size of a small bedroom. Fits the furniture from a 1–2 bedroom apartment, or boxes, tools and seasonal stuff." },
    "10x20": { rent: 90, blurb: "About the size of a one-car garage. Fits a 3–4 bedroom house, a car, or equipment and work materials." },
  },

  /* QuickBooks payment links (card or bank transfer). */
  payLinks: {
    deposit: "https://connect.intuit.com/portal/app/CommerceNetwork/view/scs-v1-f1d0ecb283c744b1bb08fb2d50ccc2f34e372db0cf894ce5b2d5d2a19a28fc59820328e29c144d4c9233fbfe5cc32886-0?locale=EN_US",
    "10x10": "https://connect.intuit.com/portal/app/CommerceNetwork/view/scs-v1-9198eccd880748f9b86278d957966832c70f7824cba54c36b9f6b9ad202225e157025d13ce6a4c04bd6464775d23082b-1?locale=EN_US",
    "10x20": "https://connect.intuit.com/portal/app/CommerceNetwork/view/scs-v1-b34e04f786304a04a2d4e8520dbadfb3457fb1f8b4db43a1b6a8539be187912688138dc488714556bfe95ffb47091d32-1?locale=EN_US",
  },
};

/* Backup list, used only if units.json can't be loaded. The real list
   comes from the management system via the daily sync. */
const FALLBACK_UNITS = [
  { unit: "16", size: "10x10", status: "Available" },
  { unit: "22", size: "10x10", status: "Available" },
  { unit: "32", size: "10x10", status: "Available" },
  { unit: "34", size: "10x10", status: "Available" },
  { unit: "35", size: "10x10", status: "Available" },
  { unit: "44", size: "10x10", status: "Available" },
  { unit: "46", size: "10x10", status: "Available" },
  { unit: "48", size: "10x10", status: "Available" },
  { unit: "49", size: "10x10", status: "Available" },
  { unit: "56", size: "10x10", status: "Available" },
  { unit: "A5", size: "10x10", status: "Available" },
  { unit: "B2", size: "10x10", status: "Available" },
];

/* Pairs of side-by-side units that can be rented together as one bigger
   space. When every unit in a pair is Available, the site offers the
   pair as that bigger size too. */
const COMBOS = [
  { units: ["A5", "B5"], size: "10x20" },
];

/* ---------- Shared helpers used by every page ---------- */
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if (val == null || val === false) return;
    if (key === "class") node.className = val;
    else if (key.startsWith("on") && typeof val === "function") node.addEventListener(key.slice(2), val);
    else node.setAttribute(key, val === true ? "" : val);
  });
  (Array.isArray(children) ? children : [children]).forEach((child) => {
    if (child == null) return;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  });
  return node;
}

function money(n) {
  return "$" + Number(n).toFixed(Number(n) % 1 ? 2 : 0);
}

function fullAddress() {
  return `${SITE.address}, ${SITE.city}, ${SITE.state} ${SITE.zip}`;
}

/* Sends a form to the owner's inbox. Returns true on success. */
async function sendToInbox(subject, fields) {
  const message = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v === "" || v == null ? "—" : v}`)
    .join("\n");
  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: SITE.web3formsKey,
      subject,
      from_name: SITE.businessName + " Website",
      replyto: fields["Email"] || undefined,
      message,
    }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Send failed");
  return true;
}

/* Fill any element marked data-site="key" with that setting. */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-site]").forEach((node) => {
    const key = node.getAttribute("data-site");
    if (key === "fullAddress") node.textContent = fullAddress();
    else if (SITE[key] != null) node.textContent = SITE[key];
  });
  document.querySelectorAll("[data-tel]").forEach((a) => a.setAttribute("href", "tel:" + SITE.phoneLink));
  document.querySelectorAll("[data-year]").forEach((n) => (n.textContent = new Date().getFullYear()));
});
