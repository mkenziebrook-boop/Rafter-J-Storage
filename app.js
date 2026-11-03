/* Rafter J Storage Units — main page logic (units list, forms, pay buttons). */

/* ---------- Loading units ---------- */
function normSize(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, "").replace("×", "x");
}

/* units.json is written by the daily sync from the Rafter J management
   system (see tools/sync_units.py). It lists only open units. */
async function loadUnits() {
  try {
    const res = await fetch("units.json?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const units = (data.units || [])
      .map((u) => ({ unit: String(u.unit || "").trim(), size: normSize(u.size), status: u.status || "Available" }))
      .filter((u) => u.unit && u.size);
    return { units, live: true, updated: data.updated };
  } catch (err) {
    console.warn("Couldn't load units.json, using the built-in list.", err);
    return { units: FALLBACK_UNITS, live: false };
  }
}

function isOpen(u) {
  return /^avail/i.test(u.status || "");
}

/* Returns { "10x10": ["10", "16", ...], "10x20": ["A5 + B5", ...] } */
function availabilityBySize(units) {
  const open = {};
  Object.keys(SITE.sizes).forEach((s) => (open[s] = []));
  units.filter(isOpen).forEach((u) => {
    const s = normSize(u.size);
    (open[s] = open[s] || []).push({ label: u.unit, combo: false });
  });
  const openNames = new Set(units.filter(isOpen).map((u) => u.unit.toUpperCase()));
  (typeof COMBOS !== "undefined" ? COMBOS : []).forEach((c) => {
    if (c.units.every((n) => openNames.has(n.toUpperCase()))) {
      (open[c.size] = open[c.size] || []).push({ label: c.units.join(" + "), combo: true });
    }
  });
  const natural = (a, b) => a.label.localeCompare(b.label, undefined, { numeric: true });
  Object.values(open).forEach((list) => list.sort(natural));
  return open;
}

/* ---------- Rendering ---------- */
function renderUnits(open, live, updated) {
  const grid = document.getElementById("sizeGrid");
  grid.innerHTML = "";
  Object.entries(SITE.sizes).forEach(([size, info]) => {
    const list = open[size] || [];
    const card = el("article", { class: "size-card" }, [
      el("div", { class: "size-card__top" }, [
        el("div", { class: "size-card__size" }, size.replace("x", " × ")),
        el("div", { class: "size-card__price" }, [money(info.rent), el("small", {}, " /month")]),
      ]),
      el("p", { class: "size-card__blurb" }, info.blurb),
      el("span", { class: "avail " + (list.length ? "avail--yes" : "avail--no") },
        list.length ? `${list.length} available now` : "Currently full"),
    ]);
    if (list.length) {
      const chips = el("ul", { class: "chips", "aria-label": `Open ${size} units` });
      list.forEach((u) => {
        chips.appendChild(el("li", {}, el("button", {
          type: "button",
          class: "chip" + (u.combo ? " chip--combo" : ""),
          title: u.combo ? "Two side-by-side 10x10 units rented together" : "Request this unit",
          onclick: () => pickUnit(u.label, size),
        }, u.combo ? `${u.label} (together)` : `#${u.label}`)));
      });
      card.appendChild(chips);
      card.appendChild(el("button", { type: "button", class: "btn btn--primary btn--block", onclick: () => pickUnit("", size) }, `Request a ${size}`));
    } else {
      card.appendChild(el("button", { type: "button", class: "btn btn--ghost btn--block", onclick: () => pickUnit("", size, true) }, "Join the waiting list"));
    }
    grid.appendChild(card);
  });

  const when = updated ? new Date(updated) : null;
  document.getElementById("unitsUpdated").textContent = live && when && !isNaN(when)
    ? `Availability updated ${when.toLocaleDateString("en-US", { month: "long", day: "numeric" })}. Call us to double-check before you come by.`
    : "Availability is updated regularly. Call us to double-check before you come by.";
}

function fillUnitSelect(open) {
  const select = document.getElementById("r-unit");
  select.innerHTML = "";
  Object.entries(SITE.sizes).forEach(([size, info]) => {
    const group = el("optgroup", { label: `${size} — ${money(info.rent)}/month` });
    group.appendChild(el("option", { value: `Any ${size}`, "data-size": size }, `Any open ${size}`));
    (open[size] || []).forEach((u) => {
      group.appendChild(el("option", { value: `${u.label} (${size})`, "data-size": size },
        u.combo ? `Units ${u.label} together` : `Unit #${u.label}`));
    });
    if (!(open[size] || []).length) {
      group.firstChild.textContent = `Waiting list for a ${size}`;
      group.firstChild.value = `Waiting list ${size}`;
    }
    select.appendChild(group);
  });
}

function pickUnit(label, size, waitlist) {
  const select = document.getElementById("r-unit");
  const want = label ? `${label} (${size})` : waitlist ? `Waiting list ${size}` : `Any ${size}`;
  const match = Array.from(select.options).find((o) => o.value === want);
  if (match) select.value = match.value;
  document.getElementById("reserve").scrollIntoView({ behavior: "smooth" });
  setTimeout(() => document.getElementById("r-date").focus({ preventScroll: true }), 500);
}

function renderPayButtons() {
  const box = document.getElementById("payButtons");
  Object.entries(SITE.sizes).forEach(([size, info]) => {
    const link = SITE.payLinks[size];
    if (!link) return;
    box.appendChild(el("a", { class: "btn btn--green btn--block", href: link, target: "_blank", rel: "noopener" },
      `Pay ${size} rent — ${money(info.rent)}`));
  });
  box.appendChild(el("p", { class: "pay-note" }, "Renting two units, or owe a late fee? Pay once per unit, or call us and we'll send you one invoice for the total."));
}

/* ---------- Forms ---------- */
function showStatus(node, ok, text) {
  node.className = "status is-visible " + (ok ? "status--ok" : "status--error");
  node.textContent = text;
}

function wireForm(formId, statusId, build) {
  const form = document.getElementById(formId);
  const status = document.getElementById(statusId);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.botcheck.checked) return;
    const result = build(form);
    if (result.error) { showStatus(status, false, result.error); return; }
    const btn = form.querySelector("button[type=submit]");
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = "Sending…";
    try {
      await sendToInbox(result.subject, result.fields);
      showStatus(status, true, result.thanks);
      form.reset();
      if (formId === "reserveForm") setMinDate();
    } catch (err) {
      showStatus(status, false, `Sorry, that didn't go through. Please try again or call us at ${SITE.phoneDisplay}.`);
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  });
}

function setMinDate() {
  const d = new Date();
  const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  document.getElementById("r-date").min = iso;
}

function niceDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/* ---------- Start ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll("[data-deposit]").forEach((n) => (n.textContent = money(SITE.deposit)));
  setMinDate();
  renderPayButtons();

  wireForm("reserveForm", "reserveStatus", (f) => {
    const name = f.name.value.trim(), phone = f.phone.value.trim();
    if (!name || !phone) return { error: "Please enter your name and phone number so we can reach you." };
    if (!f.moveIn.value) return { error: "Please pick a move-in date (your best guess is fine)." };
    const size = f.unit.selectedOptions[0]?.dataset.size;
    return {
      subject: `Unit request: ${f.unit.value} — ${name}`,
      fields: {
        "Request type": f.unit.value.startsWith("Waiting") ? "WAITING LIST" : "Unit request",
        "Unit": f.unit.value,
        "Monthly rent": size ? money(SITE.sizes[size].rent) : "",
        "Move-in date": niceDate(f.moveIn.value),
        "Name": name,
        "Phone": phone,
        "Email": f.email.value.trim(),
        "Notes": f.notes.value.trim(),
        "Next step": "Call to confirm, then send the signing link from admin.html",
      },
      thanks: `Thanks, ${name.split(" ")[0]}! We got your request and will call you to confirm, usually the same business day.`,
    };
  });

  wireForm("contactForm", "contactStatus", (f) => {
    const name = f.name.value.trim();
    if (!name) return { error: "Please enter your name." };
    if (!f.phone.value.trim() && !f.email.value.trim()) return { error: "Please give us a phone number or email so we can answer you." };
    if (!f.message.value.trim()) return { error: "Please type your question." };
    return {
      subject: `Website question — ${name}`,
      fields: { "Name": name, "Phone": f.phone.value.trim(), "Email": f.email.value.trim(), "Question": f.message.value.trim() },
      thanks: "Thanks! We got your message and will get back to you soon.",
    };
  });

  const { units, live, updated } = await loadUnits();
  const open = availabilityBySize(units);
  renderUnits(open, live, updated);
  fillUnitSelect(open);
});
