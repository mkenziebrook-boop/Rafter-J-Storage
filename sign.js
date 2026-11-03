/* Rafter J Storage Units — online rental agreement signing.
   Opened from a link made on admin.html, e.g.
   sign.html?unit=16&size=10x10&start=2026-10-15&name=Jane%20Doe */

const AGREEMENT_VERSION = "Rafter J Properties rental agreement, web version 2026-10";

function niceDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function blankOr(amount) {
  return amount === "" || amount == null ? "$__________" : money(amount);
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const unit = (params.get("unit") || "").trim();
  const size = (params.get("size") || "").trim().toLowerCase();
  const start = params.get("start") || "";
  const info = SITE.sizes[size];

  const form = document.getElementById("signForm");
  if (!unit || !info) {
    form.hidden = true;
    document.getElementById("badLink").hidden = false;
    return;
  }

  // Rental information box. Rent always comes from config.js, never the link.
  document.getElementById("ri-unit").textContent = unit;
  document.getElementById("ri-size").textContent = size;
  document.getElementById("ri-start").textContent = niceDate(start) || "To be arranged";
  document.getElementById("ri-rent").textContent = money(info.rent);
  document.getElementById("ri-deposit").textContent = money(SITE.deposit) + " (paid online after signing)";
  document.getElementById("ri-late").textContent = money(SITE.lateFee);
  document.getElementById("ri-overlock").textContent = blankOr(SITE.overlockCharge);
  document.getElementById("ri-returned").textContent = blankOr(SITE.returnedCheckCharge);
  document.querySelectorAll("[data-deposit]").forEach((n) => (n.textContent = money(SITE.deposit)));

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  document.getElementById("execDate").textContent = today;

  const nameInput = document.getElementById("t-name");
  if (params.get("name")) nameInput.value = params.get("name");
  const echoName = () => {
    document.querySelectorAll(".tenant-name-echo").forEach((n) => (n.textContent = nameInput.value.trim() || "the Tenant"));
  };
  nameInput.addEventListener("input", echoName);
  echoName();

  const valueInput = document.getElementById("t-value");
  valueInput.addEventListener("input", () => {
    document.querySelectorAll(".value-echo").forEach((n) => (n.textContent = valueInput.value.trim() || "______"));
  });

  document.querySelectorAll(".initial-row input").forEach((i) =>
    i.addEventListener("input", () => (i.value = i.value.toUpperCase()))
  );

  const status = document.getElementById("signStatus");
  const fail = (msg, focusEl) => {
    status.className = "status is-visible status--error";
    status.textContent = msg;
    if (focusEl) focusEl.focus();
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.botcheck.checked) return;

    const missingInitial = Array.from(form.querySelectorAll(".initial-row input")).find((i) => !i.value.trim());
    if (missingInitial) return fail("Please add your initials in each initials box in the agreement.", missingInitial);
    const missing = Array.from(form.querySelectorAll(".sign-step input[required]")).find(
      (i) => (i.type === "checkbox" ? !i.checked : !i.value.trim()) && i.name !== "botcheck"
    );
    if (missing) {
      const label = form.querySelector(`label[for="${missing.id}"]`);
      return fail(missing.id === "t-esign"
        ? "Please check the box agreeing to sign electronically."
        : `Please fill in: ${label ? label.textContent.replace("(optional)", "").trim() : "all required fields"}.`, missing);
    }
    const email = form.email.value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Please check your email address.", form.email);

    const v = (n) => form[n].value.trim();
    const signedAt = new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });
    const fields = {
      "SIGNED RENTAL AGREEMENT": AGREEMENT_VERSION,
      "Space No.": unit,
      "Size": size,
      "Move-in date": niceDate(start) || "To be arranged",
      "Monthly rent": money(info.rent),
      "Deposit": money(SITE.deposit) + " (tenant sent to QuickBooks deposit link)",
      "Tenant name": v("name"),
      "Phone": v("phone"),
      "Email": email,
      "Home address": v("address"),
      "Employer": v("employer"),
      "Work phone": v("workPhone"),
      "Work address": v("workAddress"),
      "Supervisor": v("supervisor"),
      "Emergency contact 1": `${v("e1name")} (${v("e1rel")}) ${v("e1phone")}`,
      "Emergency contact 2": v("e2name") ? `${v("e2name")} (${v("e2rel")}) ${v("e2phone")}` : "",
      "Max value stored (item 36)": "$" + v("value").replace(/^\$/, ""),
      "Initials item 45 (insurance)": v("i45"),
      "Initials item 46 (over lock)": v("i46"),
      "Initials item 47 (no warranties)": v("i47"),
      "Initials acknowledgment": v("iack"),
      "Typed signature": v("signature"),
      "E-signature consent": "Yes",
      "Signed at": `${signedAt}, Victoria County, Texas`,
      "Device": navigator.userAgent,
      "Lessor signature": "Pending — countersign when tenant picks up gate code",
    };

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Sending…";
    try {
      await sendToInbox(`SIGNED AGREEMENT: Unit ${unit} — ${v("name")}`, fields);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Sign & Continue to Deposit";
      return fail(`Sorry, that didn't go through. Please check your connection and try again, or call us at ${SITE.phoneDisplay}.`);
    }

    // Lock the form so the printed copy matches what was sent.
    form.querySelectorAll("input").forEach((i) => (i.readOnly = true, i.type === "checkbox" && (i.disabled = true)));
    btn.hidden = true;
    status.className = "status is-visible status--ok";
    status.textContent = `Signed electronically by ${v("signature")} on ${signedAt}.`;
    document.getElementById("intro").hidden = true;

    const done = document.getElementById("done");
    document.getElementById("payDeposit").href = SITE.payLinks.deposit;
    document.getElementById("payDeposit").textContent = `Pay ${money(SITE.deposit)} Deposit Now`;
    document.getElementById("printCopy").addEventListener("click", () => window.print());
    form.parentNode.insertBefore(done, form);
    done.hidden = false;
    done.scrollIntoView({ behavior: "smooth" });
  });
});
