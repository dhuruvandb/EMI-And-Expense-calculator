<div align="center">

![GitHub](https://img.shields.io/github/license/dhuruvandb/EMI-And-Expense-calculator)
![GitHub stars](https://img.shields.io/github/stars/dhuruvandb/EMI-And-Expense-calculator)

# 💳 EMI & Expense Tracker

### **Know exactly how much you must pay every month — nothing more, nothing less.**

---

> **📌 NOTICE: This repository is READ-ONLY**  
> This project is shared as-is for you to use, learn from, and enjoy! 🎉  
> **Feel free to fork it** and make it your own, but contributions/PRs won't be accepted here.  
> **Share it, use it, customize it — it's yours!** ⭐

---

## 📋 **TL;DR**
**Privacy-first, 100% offline expense tracker. No accounts, no cloud. Track EMIs, subscriptions, recurring payments. Auto-archives completed items. Seal Mode locks payments for financial certainty. PWA, open source, free.**

[Try it Now →](https://dhuruvandb.github.io/EMI-And-Expense-calculator/)

</div>

---

## 🎯 **Why This Exists**

> **Built for people who want to track their finances without:**  
> ❌ Creating accounts  
> ❌ Uploading data to someone's server  
> ❌ Paying subscription fees  
> ❌ Trusting "AI insights" with their money

If you want a **simple, transparent tool** that calculates what matters and **stays out of your way**, this is it.

---

## ❗ **The Problem This Solves (Real & Personal)**

I wanted **one simple number** that tells me:

> **"This is the amount I _must_ pay every month (for example: $4000).  
> Spend whatever is left — freely."**

I **don't track salary** because salary changes.  
What _doesn't_ change are **constant spendings**:

- EMIs
- Loans
- Rent
- Netflix / Spotify
- Insurance
- Subscriptions

I was tired of:

- Re-adding the same expenses every month
- Remembering which EMIs are still active
- Manually excluding EMIs after they end
- Tracking which payments I've already made this month
- **Accidentally unchecking payments or changing status after I've confirmed everything**
- **Doubting myself: "Did I really pay this? Should I double-check?"**
- **The anxiety of accidental touches messing up my payment tracking**

**Once an EMI ends, it should automatically stop affecting my monthly total.**

That's it.  
That's the core problem.

---

## ✨ **What It Does (Overview)**

### **EMI & Expense Tracker**

A **simple, privacy-first, offline Progressive Web App** that:

- Tracks only **constant monthly expenses**
- Automatically **excludes EMIs after their end date**
- Shows **one clear number**:
  > **Total mandatory monthly payment**
- Works **100% offline**
- Requires **zero sign-up**
- Stores data **only on your device**

### **Simple. Private. Yours.**

A lightweight, privacy-first Progressive Web App for tracking EMIs, loans, and recurring expenses — **100% offline, 100% yours.**

<div align="center">

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-6366f1?style=for-the-badge)](https://dhuruvandb.github.io/EMI-And-Expense-calculator/)
[![PWA Ready](https://img.shields.io/badge/📱_PWA-Ready-10b981?style=for-the-badge)]()
[![Zero Dependencies](https://img.shields.io/badge/📦_Zero-Dependencies-f59e0b?style=for-the-badge)]()
[![100% Offline](https://img.shields.io/badge/⚡_100%25-Offline-ef4444?style=for-the-badge)]()

[Try it Now →](https://dhuruvandb.github.io/EMI-And-Expense-calculator/)

</div>

---

## 🎯 **How It Works**

1. **Add Your Items** — EMIs, loans, rent, subscriptions, savings goals
2. **Mark as Paid** — Check off items as you pay them throughout the month
3. **🔒 Seal Payments** — Lock checked items to prevent accidental changes
4. **Auto-Reset** — Payment status automatically resets each month
5. **Get Celebrated** — Complete all payments? We'll celebrate with you! 🎉
6. **Auto-Archive** — Completed EMIs automatically move to archive
7. **Track Your Progress** — Real-time dashboard shows what you owe vs what you're saving

---

## 🚀 **Quick Start**

### **Option 1: Use It Now (Web App)**

1. Visit: **[https://dhuruvandb.github.io/EMI-And-Expense-calculator/](https://dhuruvandb.github.io/EMI-And-Expense-calculator/)**
2. Click **"Install App"** button (optional)
3. Start tracking!

### **Option 2: Self-Host**

```bash
git clone https://github.com/dhuruvandb/EMI-And-Expense-calculator.git
# Open index.html in any browser — that's it!
```

### **Option 3: Embed in Android Apps**

```java
WebView webView = findViewById(R.id.webView);
webView.getSettings().setJavaScriptEnabled(true);
webView.getSettings().setDomStorageEnabled(true);
webView.loadUrl("file:///android_asset/index.html");
```

---

## 🛠️ **Built With & Technical Details**

### **Technology Stack**
- **Vanilla JavaScript** (Zero dependencies, no frameworks)
- **Progressive Web App (PWA)** technology (installable, works offline)
- **LocalStorage API** (100% offline operation, your data stays on your device)
- **Modern Web APIs** (100% client-side, no backend required)

### **Technical Specifications**
- **Frontend**: Vanilla HTML5 + CSS3 + JavaScript (no frameworks)
- **Storage**: Browser localStorage API (3 separate keys for active/archived/preferences)
- **Size**: ~60KB total (HTML + CSS + JS combined)
- **Dependencies**: **Zero** — Pure vanilla JavaScript

### **Browser Support**
| Browser         | Minimum Version |
| --------------- | --------------- |
| Chrome/Edge     | 60+             |
| Safari          | 12+             |
| Firefox         | 60+             |
| Android WebView | 60+             |

### **Performance**
- ⚡ Loads in <100ms
- 🪶 Lightweight codebase
- 📱 Works on 2G networks
- 🔄 Auto-refresh every minute for monthly reset detection

---

## 📋 **Detailed Features Breakdown**

### **Core Features**

✅ Track unlimited EMIs, loans, and recurring expenses  
✅ **Monthly payment tracking** — Check off items as you pay them  
✅ **🔒 Seal Mode** — Lock your payments to prevent accidental changes  
✅ **Auto-archive system** — Completed EMIs automatically move to archive  
✅ **Smart search** — Instant search by name or amount  
✅ Works **100% offline** after first load  
✅ **Export/Import** your data (JSON backup with archive support)  
✅ Dark mode for late-night budgeting  
✅ Install as native app (PWA)  
✅ Auto-save — never lose your data  
✅ **8 sorting options** + **4 grouping modes**

### **🔒 Seal Mode — Financial Peace Ritual**
> **The Problem**: You've checked all your payments. But later, you accidentally tap a checkbox, or you start doubting yourself: "Did I really pay this?" The anxiety builds.

**Seal Mode solves this with a deliberate ceremony:**

- ✅ **Lock Your Payments** — Seal checked items to prevent accidental changes
- ✅ **8-Second Ceremony** — 3s countdown + 5s undo period ensures intentional commitment
- ✅ **Multiple Seals Per Month** — Seal items as you pay them, add new expenses, seal again
- ✅ **Visual Lock Icons** — 🔒 Sealed items show lock instead of checkbox
- ✅ **Smart Messages**:
  - Seal 1 item: "🔒 Sealed! Forget "Rent" this month"
  - Seal all items: "💚 Fully paid up! Financial peace of mind!"
- ✅ **Full Protection** — Cannot edit, delete, or uncheck sealed items until next month
- ✅ **Auto-Unlock** — Seals automatically clear on the 1st of next month
- ✅ **Export/Import Aware** — Seal state preserved when exporting/importing same month

**How Seal Mode Works:**
1. Check off your payments ✓
2. Click **"🔒 Seal"** button
3. Confirm in modal
4. **3-second countdown** — Press STOP to abort
5. **5-second undo period** — Press UNDO to reverse
6. Done! Items locked until next month 🎉

### **🎯 Payment Status Tracking**
- Check off items as you pay them each month
- Automatic monthly reset (payment status clears at month start)
- Visual strikethrough for paid items
- Smart calculation excludes paid items from monthly total

### **🗃️ Intelligent Archive Management**
- Completed EMIs automatically archive when end date passes
- Separate archive view to review past items
- Archive items included in export/import backups
- Clean interface showing only active items

### **📊 Category Separation**
- **Loan/Debt tracking** — EMIs, loans, credit cards
- **Savings tracking** — SIPs, RDs, investment commitments
- Separate totals for debt vs savings in dashboard
- Color-coded rows (red for debt, green for savings)

### **🎉 Celebration Mode**
- Get rewarded when all monthly payments are complete!
- Encouraging messages for savings contributions
- "Financial peace of mind" celebration toast

### **🔍 Smart Search & Organization**
- Instant search by name or amount (300ms debounce)
- **8 Sort Options**: Entry order, due date, amount, end date, period left, name, type, category
- **4 Grouping Modes**: Category, type, due date range, status
- Bidirectional sorting (ascending/descending)
- Group totals displayed in headers

### **📊 Real-Time Dashboard**
- 📊 Total active items count
- 💰 Monthly payment breakdown (Debt + Savings)
- 💳 Outstanding debt tracker (principal remaining)
- 🚨 Color-coded period alerts:
  - 🟢 Normal (≤30 days remaining)
  - 🟡 Warning (31-90 days)
  - 🔴 Critical (>90 days)

### **🔒 Privacy by Design**
- 🔒 **No backend servers** — your data never leaves your device
- 🔒 **No user accounts** — nothing to sign up for
- 🔒 **No tracking** — zero analytics, cookies, or pixels
- 🔒 **100% client-side** — auditable source code

---

## ⚠️ **Important: What This App Is _Not_ For**

**Please don't use this app if you are looking for:**

- Daily expense tracking
- Per-transaction budgeting
- Categorizing every coffee or grocery purchase
- **Push notifications** (we intentionally don't have them — see FAQ)

👉 **This app is NOT built for daily budgeting.**

It is designed **only** for:

- Fixed monthly expenses
- EMIs with clear end dates
- Knowing your _mandatory monthly payment_ — fast and reliably

---

## 🔒 **Privacy & Data Ownership**

### **Where Your Data Lives**

Your data is stored **only in your browser's localStorage**:

- ✅ Remains on YOUR device
- ✅ Not transmitted anywhere
- ✅ Not accessible by anyone else
- ✅ You control export/delete

### **What We DON'T Collect**

- ❌ Names, emails, phone numbers
- ❌ Financial data
- ❌ IP addresses or location
- ❌ Analytics or tracking data
- ❌ **Literally nothing**

### **Open Source = Verifiable**

Every line of code is open for inspection. No hidden trackers, no backdoors.

---

## 💾 **Backup Your Data**

### **Export (Recommended)**

1. Click **"📥 Export"** button in header
2. Saves as `emi-tracker-backup-YYYY-MM-DD.json`
3. Includes both active AND archived items
4. Store in cloud (Google Drive, Dropbox, etc.)

### **Import**

1. Click **"📤 Import"** button
2. Select your `.json` file
3. Choose to merge with existing data or replace
4. Handles both old format (array) and new format (active/archived split)
5. Auto-archives completed items during import

**⚠️ Important**: Browser cache clears can delete data. **Export regularly!**

---

## ❓ **FAQ**

### **Q: What happens to my data if I clear browser cache?**

A: Your data will be **lost forever**. Always export your data regularly to avoid losing it. Store backups in cloud storage or email them to yourself.

### **Q: Can I access my data on multiple devices?**

A: Yes! Export from one device, then import to another. The app works entirely offline, so data doesn't sync automatically.

### **Q: How does auto-archive work?**

A: When an EMI's end date passes, it automatically moves to the archive on next app load. You can view archived items by clicking "📦 View Archive".

### **Q: What's the difference between EMI and Constant Expense?**

A: **EMI** has a fixed end date (like a car loan ending in 2027). **Constant Expense** is ongoing with no end date (like rent or Netflix).

### **Q: What happens to payment tracking each month?**

A: All payment checkboxes automatically reset at the start of each month. This ensures you track payments fresh every month.

### **Q: How does the celebration mode work?**

A: When you mark all active items as paid for the month, you'll see a special celebration message: "Financial peace of mind" 🎉

### **Q: What is Seal Mode and why should I use it?**

A: **Seal Mode** locks your checked payments to prevent accidental changes. Once you've confirmed all payments are done, seal them to achieve mental peace. You won't accidentally uncheck something or doubt whether you paid. Sealed items show a 🔒 lock icon and cannot be edited, deleted, or unchecked until next month.

### **Q: How does the 8-second ceremony work?**

A: When you click "Seal", you get:
   1. **3-second countdown** with a STOP button (last chance to abort)
   2. **5-second undo period** with an UNDO button (final safety net)
   3. After 8 seconds total, items are permanently sealed for the month
   This deliberate process ensures you're intentional about sealing.

### **Q: Can I seal items multiple times in one month?**

A: Yes! Seal items as you pay them. For example:
   - Day 5: Pay rent, seal it → "🔒 Sealed! Forget Rent this month"
   - Day 10: Pay Netflix, seal it → Adds to sealed list
   - Day 20: Pay all remaining → "💚 Fully paid up! Financial peace!"

### **Q: What happens to sealed items when exported/imported?**

A: If you export and import in the **same month**, seal status is preserved. If you import in a **different month**, everything resets automatically with a notification: "📅 Month changed! Data imported with payments and seal reset for new entries"

### **Q: Can I edit or delete a sealed item?**

A: No. Sealed items are locked until the 1st of next month. This is intentional — it prevents accidental changes and gives you peace of mind that your payment tracking is final.

### **Q: Can I track savings separately from debts?**

A: Yes! When adding items, choose **Savings** category. The dashboard shows separate totals for debt vs savings.

### **Q: How secure is my financial data?**

A: Completely secure. Your data never leaves your device. No server, no cloud, no transmission. It's 100% local storage.

### **Q: ❓ Why doesn't this app have push notifications?**
A: **Great question — and we made this decision intentionally.**

Push notifications on the web require ONE of two things:

1. **Keep the app constantly active** → Battery drain, memory hogging, always listening
2. **Connect to a backend server** → Your financial data gets stored on someone's server, sent over the internet, synced across devices

Both options **destroy the privacy** we built this app around.

We refused to compromise.

**The Trade-Off We Chose:**

✅ You check the app when YOU want  
✅ No background processes stalking your device  
✅ No financial data ever leaving your phone  
✅ No battery drain from constant monitoring  
✅ No "reminder anxiety" from notifications pestering you  

**The Reality:**

Your EMI tracker is simple enough that a **30-second check every few days** tells you everything:

- What's due this month?
- What's already paid?
- Any new items to add?

You don't need the app **spamming your notifications** to stay on top of it.

**This Is Actually a Feature:**

In a world where apps are constantly fighting for your attention, this app respects your focus. You're in control. No notifications. No pressure. Just open it when you decide.

**The Wisdom Here:**

We could have added notifications by:
- Storing your data on our servers ❌
- Adding a backend API ❌
- Selling you "premium notification features" ❌

Instead, we chose to keep your data 100% private, even if it meant saying "no" to a feature users expect.

**That's the trade-off between convenience and privacy. We picked privacy.** 🔒

---

## 🆚 **Why Choose This Over Other Apps?**

| Feature                  | Other Apps | EMI Tracker |
| ------------------------ | ---------- | ----------- |
| Requires Account         | ✅ Yes     | ❌ No       |
| Cloud Sync Required      | ✅ Yes     | ❌ No       |
| Works Offline            | ❌ No      | ✅ Yes      |
| Monthly Payment Tracking | Sometimes  | ✅ Yes      |
| Seal Mode (Lock Status)  | ❌ No      | ✅ Yes      |
| Auto-Archive Completed   | ❌ No      | ✅ Yes      |
| Auto-Reset Monthly       | ❌ No      | ✅ Yes      |
| Push Notifications       | ✅ Yes    | ❌ No     |
| Privacy First            | ❌ No      | ✅ Yes      |
| 100% Free                | ❌ No      | ✅ Yes      |
| Zero Dependencies        | ❌ No      | ✅ Yes      |
| Open Source              | ❌ No      | ✅ Yes      |

---

## 🎨 **Screenshots**

<div align="center">

|                                      Dashboard                                       |                                       Add Item                                       |                                      Dark Mode                                       |
| :----------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------: |
| ![](https://github.com/user-attachments/assets/581aafb0-eb56-496d-84a9-86592ec3cba4) | ![](https://github.com/user-attachments/assets/9a2e01a9-7cf6-4e83-9dca-2365a9665e85) | ![](https://github.com/user-attachments/assets/044e1efd-3aaa-465f-8260-72cecd5f26e9) |

</div>

---

## 👤 **User Journey**

**Day 1**: Add all your EMIs and recurring expenses (home loan, car EMI, rent, Netflix)  
**Day 5**: Mark "Home Loan" as paid ✓ — monthly total updates automatically  
**Day 6**: Seal "Home Loan" 🔒 — Now it's locked, no accidental unchecking  
**Day 10**: Mark "Car EMI" as paid ✓, seal it 🔒  
**Day 15**: All items paid! Seal remaining → 🎉 "Financial peace of mind!"  
**Day 20**: Try to edit sealed item → Blocked with message "🔒 Cannot edit sealed payments"  
**Next Month (1st)**: All seals auto-unlock, payment status resets, start fresh  
**6 Months Later**: Car EMI completed → Auto-archived to keep dashboard clean  
**1 Year Later**: Export backup (with seal state), import to new device, seals preserved

---

## 🚀 **Roadmap (Completed ✅)**

- [x] Export/Import JSON backups (with archive support)
- [x] Dark mode (system-aware + manual toggle)
- [x] Input validation
- [x] PWA offline support
- [x] Smart sorting (8 options) & grouping (4 modes)
- [x] Search functionality (name/amount)
- [x] Payment tracking with monthly reset
- [x] **Seal Mode with 8-second ceremony (lock payments)**
- [x] **Multi-seal support (seal items progressively)**
- [x] **Seal state export/import with month awareness**
- [x] Auto-archive system
- [x] Category-based separation (Debt/Savings)
- [x] Celebration mode for completed payments
- [x] Period left color-coded alerts
- [x] Group totals in table headers
- [x] Archive view toggle
- [x] EMI detail tracking (principal/interest/total)

---

## 🤝 **How to Help**

1. ⭐ **Star this repo** — helps others discover it
2. 📢 **Share** — tell privacy-conscious friends

### **Development**

```bash
git clone https://github.com/dhuruvandb/EMI-And-Expense-calculator.git
# Edit files — no build process needed
# Open index.html in browser to test
```

---

## 📄 **License**

**MIT License** — Free to use, modify, and distribute.

```
Copyright (c) 2024 Dhuruvan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software...  [full license](LICENSE)
```

---

## 🎖️ **Acknowledgments**

Inspired by:

- Privacy-first software movement
- Progressive Web App best practices
- Open source community
- Real frustrations with overcomplicated finance apps

---

<div align="center">

### **Made for Privacy-Conscious Users**

_No subscriptions. No data collection. No BS._  
_Your finances. Your data. Your control._

**[Try It Now →](https://dhuruvandb.github.io/EMI-And-Expense-calculator/)**

---

![GitHub stars](https://img.shields.io/github/stars/dhuruvandb/EMI-And-Expense-calculator?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/dhuruvandb/EMI-And-Expense-calculator)
![GitHub repo size](https://img.shields.io/github/repo-size/dhuruvandb/EMI-And-Expense-calculator)

**If this helps you, give it a ⭐**

</div>
