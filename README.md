# Rafter J Storage Units — rafterjstorage.com

The public website for Rafter J Storage Units, 36 Hunters Circle, Victoria, TX.

| Page | Who it's for | What it does |
|---|---|---|
| `index.html` | Everyone | Shows open units and prices, takes unit requests and questions, Pay Rent buttons, map and contact info |
| `sign.html` | Confirmed customers only (via a link you send) | Full rental agreement with initials and e-signature, then sends them to pay the deposit |
| `admin.html` | You | Makes the signing link for a customer and lets you text or email it in one tap |

All settings (phone, prices, deposit, fees, payment links, Google Sheet link) are in **`config.js`**.
Every form is emailed to the inbox tied to the Web3Forms key in `config.js`
(the same key the color selection sites use).

## Renting a unit, start to finish

1. A customer taps a unit on the site and sends a request. You get an email titled **"Unit request: …"**.
2. You call them and confirm.
3. Open **rafterjstorage.com/admin.html** on your phone. Enter the unit, size and move-in date, then tap **Make Signing Link** → **Text It**.
4. They read, initial and sign the agreement. You get an email titled **"SIGNED AGREEMENT: …"** with all their info. Their screen then takes them to the $35 deposit payment.
5. In QuickBooks, add them as a customer and create a **recurring monthly invoice**: $50 or $90, dated the 1st, due the 10th. QuickBooks emails each bill, and the $5 late fee is already turned on.
6. When they come by: check their photo ID, give them the gate code, countersign the agreement (the email notes it as pending), and mark the unit **Rented** in the sheet.

## Updating which units are open

### Option A: Google Sheet (recommended, one-time setup)

1. In Google Sheets: **File → Import → Upload** `units.csv` from this folder.
2. Keep the columns **Unit, Size, Status, Notes**. Status is `Available`, `Reserved` or `Rented`. Only `Available` units show on the site.
3. **File → Share → Publish to web.** Pick the sheet, choose **Comma-separated values (.csv)**, and click **Publish**. Copy the link.
4. Paste that link into `config.js` as `unitsSheetCsvUrl: "…"`.

After that, change a unit's Status on your phone and the website shows it right away. Add any other units (rented ones too) whenever you like.

### Option B: no sheet

Edit `FALLBACK_UNITS` in `config.js`.

### A5 + B5

A5 and B5 are each 10x10. `COMBOS` in `config.js` makes the site also offer **"A5 + B5 together"** as a 10x20 at $90, but only while both are Available.

## Adding photos

Put pictures in a `photos/` folder. In `index.html`, find the three `photo-ph` placeholder boxes and replace each one with a line like:

```html
<img src="photos/gate.jpg" alt="Front gate with keypad">
```

## Going live on rafterjstorage.com

1. **Buy the domain** at Cloudflare (cloudflare.com → Domain Registration) or Porkbun. It costs about $10–16/yr.
2. **Repo**: this one, `Rafter-J-Storage` (already done).
3. In that repo: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save.**
4. In the same Pages screen, type `rafterjstorage.com` under **Custom domain** and click Save (GitHub adds a `CNAME` file for you).
5. At your domain registrar, add these DNS records:
   - `A` records for `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` for `www` → `mkenziebrook-boop.github.io`
   - On Cloudflare, set these records to **DNS only** (grey cloud).
6. Wait about 15–60 minutes, then tick **Enforce HTTPS** in Pages settings.
7. Optional but recommended: in Web3Forms, restrict your key to `rafterjstorage.com` plus the color-site domain.

## Notes

- The online form does **not** ask for SSN or driver's license number. Check ID in person.
- The agreement's over lock and returned check charges are blank, like the paper copy. Set `overlockCharge` and `returnedCheckCharge` in `config.js` to fill them in.
- `sign.html` and `admin.html` are hidden from Google (`robots.txt` and noindex). They aren't password-protected, but they can't do anything except email *you*. Rent on the agreement always comes from `config.js`, so a customer can't change it by editing the link.
