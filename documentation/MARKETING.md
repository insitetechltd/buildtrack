# Taskr marketing copy (canonical)

**Living file.** This is the source of truth for **what Taskr is allowed to say in public**: App Store, landing site, outreach, screenshots captions.

Public claims must match **shipped** product (code, billing, env). Pipeline / parked milestones stay in **Do not claim** until they are Closed and this file is updated.

Dated GTM plans and ASC paste packs are **snapshots**. Copy **from** this file. Do not fork a second description.

---

## Revisit ritual (every marketing pass)

Before changing App Store metadata, `docs/index.html`, legal/support pages, store screenshots captions, or founder outreach copy:

1. Diff **Sell this** vs what actually shipped since the last **Revision** below (ROADMAP Closed rows + `documentation/NOW.md`).
2. Move any newly shipped capability from **Do not claim** → **Sell this**. Tighten or drop claims that are still untrue.
3. Rewrite **App Store description** (EN, and zh-HK when that locale is in play) so a site person can understand it in one pass. Precise and simple. No OS language.
4. Then paste into ASC / HTML. Do not edit the listing in a plan file and leave this file stale.

Triggers that **require** a pass: user-visible feature ship, commercial milestone close (`M-AUTHZ-02`, `M-AI-01`, `M-DMS-*`, `M-BILL-*`, daily reports), pricing/billing lock change, iOS/Android/web surface change.

---

## Voice

**Do:** capture, assign, update, review, approve; photo evidence; site / crew / handoff / rework / proof; company-owned records; “who did what, when, with which photo.”

**Don’t:** all-in-one OS; “stress-free”; “every party / every spec”; guarantee on-time or on-budget; VO / cost ledger / drawings / BIM / AI / multi-company as live product; SaaS fluff (seamless, empower, unlock, revolutionize).

**Tagline (locked):** Construction software by the industry. / 建造業自己人做嘅軟件。

**Wedge:** WhatsApp photos that never become assigned, company-owned work.

---

## Sell this (now)

Shippable loop: **photo → assigned task → photo update → approve or send back**. Single company. Project isolation. Admin invite (magic link). iOS. Hong Kong, billed in **HKD**. No public “join any company” signup.

| Audience | What they do |
|---|---|
| Company admin | Creates the company, invites seats, opens projects |
| PM / supervisor | Assigns, reviews, approves or sends back |
| Crew | Captures, updates assigned work with photos |

---

## Do not claim (yet)

Until the matching ROADMAP row is **Closed** and this table is edited:

| Claim | Why not |
|---|---|
| Owner / architect / consultant join as their own company | `M-AUTHZ-02` — single-company today |
| Drawing register, CDE, BIM | Wave 2 `M-DMS-*` / `M-AI-02` |
| Cost ledger / VO | `M-COST-01` |
| On-site Q&A / AI | `M-AI-01` |
| Android / Google Play | iOS first |
| Public 30-day card trial | Invite promo codes only |
| “Stress-free construction” | Unkeepable |

---

## App Store — English

**Name (≤30):** `Taskr – Site Photo Tasks`  
**Subtitle (≤30):** `Capture. Assign. Approve.`

**Promotional text (≤170):**

```text
Construction software by the industry. Snap, assign, prove, approve. Company-owned records — not a WhatsApp group. 60-day invited pilots.
```

**Keywords (≤100, no spaces after commas):**

```text
construction,jobsite,punch,snag,handoff,rework,evidence,contractor,inspection,defect,field,quality,PM,site
```

**Description** (2026-09-02; founder intent + Gate A KEEP-INTENT-WITH-FIXES):

```text
Taskr is construction software by the industry. It turns site photos into assigned work with a clear owner, photo proof, and an approve-or-send-back trail.

WHAT YOU DO
• Capture the condition with the camera or library.
• Turn the photo into a task with an owner.
• Crews update with new photos.
• PMs approve or send it back. The thread shows who did what, when, and with which photo.

WHO IT IS FOR
Company admins, PMs, and crews in the same company. Records stay with the company and in the right project — not a WhatsApp group.

WHAT IT IS NOT
Not a drawing register, cost ledger, BIM tool, or a way for the owner, architect, and consultants to join as their own companies. It is photo-backed task evidence for daily site work.

HOW TO START
No public signup. An admin creates the company, invites people with a secure link, and opens the project.

PRICING (Hong Kong, HKD)
• Starter — HK$160 / month — 3 projects, 1 PM + 5 workers
• Pro — HK$400 / month — 12 projects, 3 PM + 15 workers
• Extra worker HK$20 / month · Extra PM HK$100 / month
Pilot access is by invitation (promo code).

SUPPORT
Insite Works Limited · support@insiteworks.co
Privacy and terms: https://insitetechltd.github.io/buildtrack/
```

**What’s New** (1.1.3 — replaces live 1.0 “Insite Trackr”):

```text
This is the commercial Taskr release (1.1.3).

• Capture from camera or photo library
• Turn a photo into assigned work
• Crews update with photo proof; PMs approve or send back
• Company plans billed in Hong Kong dollars
• Admins invite seats — no public join-any-company signup

If you used the earlier listing named Insite Trackr, this is the same app, renamed and rebuilt around site photos as proof of work.
```

---

## App Store — Traditional Chinese (Hong Kong)

Update this locale in the **same pass** as English when the listing is revisited.

**Name (≤30):** `Taskr – 地盤影相派工`  
**Subtitle (≤30):** `影相派工．批核留證`

**Promotional text:**

```text
建造業自己人做嘅軟件。影相、派工、影相回覆、批核，步步留證。紀錄屬公司，唔再散落 WhatsApp 群組。香港公司六十日先導。
```

**Keywords:**

```text
地盤,工程,建築,驗收,執漏,裝修,管工,分判,判頭,施工,隱蔽,交差,Taskr,Insite
```

**Description:**

```text
Taskr 係建造業自己人做嘅軟件：現場 App，影相 → 派工 → 完工回傳 → 批核。寫俾已經日日影相、但相永遠困喺 WhatsApp 群組嘅團隊。唔係單一工種嘅工具。

你可以做咩
• 現場影相或喺相簿揀相
• 張相即刻變成一單有負責人嘅工作
• 師傅完工再影相回傳
• 管工／PM 批准或打回頭；邊個幾時用邊張相，全部睇到

邊個用
公司管理員開公司、邀請座位。PM 派工同驗收。師傅影相同交差。每個人只喺正確嘅項目入面做嘢。

唔係咩
Taskr 唔係工程變更系統、成本帳、圖則庫、BIM 或者跨公司平台。我哋提供有相為證嘅任務紀錄，等交收同錢銀傾偈可以指住現場實際發生過嘅事。

點樣開始
冇公開「加入任何公司」。管理員喺 App 開公司，用安全連結邀請同事，打開項目，然後開始影相派工。

香港收費（公司月費）
• Starter — 每月 HK$160 — 3 個項目、1 個 PM + 5 個工人
• Pro — 每月 HK$400 — 12 個項目、3 個 PM + 15 個工人
• 額外工人每月 HK$20 · 額外 PM 每月 HK$100
先導用創辦人提供嘅優惠碼。正式計劃係付費公司月費。

支援
Insite Works Limited · support@insiteworks.co
```

**What’s New** (1.1.3):

```text
呢個係 Taskr 商業版（1.1.3）。

• 可用相機或相簿影相／揀相
• 張相變成有負責人嘅工作
• 師傅影相回傳；管工／PM 批准或打回頭
• 公司計劃以港元收費
• 管理員邀請座位——冇公開加入任何公司

如果以前用過叫 Insite Trackr 嘅版本，呢個係同一個 App，改咗名，圍繞現場相片做交差證明。
```

---

## Related (not canonical copy)

| File | Role |
|---|---|
| `docs/superpowers/plans/2026-08-30-taskr-soft-launch-gtm.md` | Soft-launch *strategy* (audiences, outreach). Listing body lives **here**. |
| `docs/superpowers/plans/2026-09-01-asc-listing-paste.md` | One-time ASC paste checklist (URLs, screenshots, do-not-submit). Paste listing from **here**. |
| `docs/superpowers/plans/2026-08-21-taskr-landing-copy-lock.md` | Historical Glass v3 copy. USD prices in that file are **stale**. |
| `documentation/PROD_DEV_PROMOTION.md` | DEV vs PROD / Stripe pairing — not customer-facing copy |
| `documentation/multi-company-project-membership.md` | Product lock for when `M-AUTHZ-02` ships — then update **Do not claim** |

---

## Revision

| Date | What changed |
|---|---|
| 2026-09-02 | Canonical created. EN description from founder draft + Gate A (GPT / Gemini / GLM). Sell-now = 1.1 photo → task → review loop. |
| 2026-09-02 | What’s New for 1.1.3 submit: drop “faster” (picker still pipeline); add zh-HK What’s New. |
