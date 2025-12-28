<div align="center">

# 💳 EMI & Expense Tracker

### **Simple.  Private. Yours.**

A lightweight, privacy-first Progressive Web App for tracking EMIs, loans, and recurring expenses — **100% offline, 100% yours.**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-6366f1?style=for-the-badge)](https://dhuruvandb.github.io/EMI-And-Expense-calculator/)
[![PWA Ready](https://img.shields.io/badge/📱_PWA-Ready-10b981?style=for-the-badge)]()
[![Zero Dependencies](https://img.shields.io/badge/📦_Zero-Dependencies-f59e0b?style=for-the-badge)]()
[![100% Offline](https://img.shields.io/badge/⚡_100%25-Offline-ef4444?style=for-the-badge)]()

[Try it Now →](https://dhuruvandb.github.io/EMI-And-Expense-calculator/) · [Report Bug](https://github.com/dhuruvandb/EMI-And-Expense-calculator/issues) · [Request Feature](https://github.com/dhuruvandb/EMI-And-Expense-calculator/issues)

</div>

---

## 🎯 Why This Exists

> **Built for people who want to track their finances without:**  
> ❌ Creating accounts  
> ❌ Uploading data to someone's server  
> ❌ Paying subscription fees  
> ❌ Trusting "AI insights" with their money  

If you want a **simple, transparent tool** that calculates what matters and **stays out of your way**, this is it.

---

## ✨ What It Does

### **Core Features**
✅ Track unlimited EMIs, loans, and recurring expenses  
✅ Works **100% offline** after first load  
✅ **Export/Import** your data (JSON backup)  
✅ Dark mode for late-night budgeting  
✅ Install as native app (PWA)  
✅ Auto-save — never lose your data  
✅ Smart sorting, filtering, and grouping  

### **Real-Time Dashboard**
- 📊 Total monthly payments
- 💰 Outstanding debt tracker
- 🎯 Active items count
- 🚨 Color-coded alerts (≤30 days = critical)

### **Privacy by Design**
- 🔒 **No backend servers** — your data never leaves your device
- 🔒 **No user accounts** — nothing to sign up for
- 🔒 **No tracking** — zero analytics, cookies, or pixels
- 🔒 **100% client-side** — auditable source code

---

## 🚀 Quick Start

### **Option 1: Use It Now (Web App)**
1. Visit:  **[https://dhuruvandb.github.io/EMI-And-Expense-calculator/](https://dhuruvandb.github.io/EMI-And-Expense-calculator/)**
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

## 🛠️ Technical Details

### **Stack**
- **Frontend**:  Vanilla HTML5 + CSS3 + JavaScript (no frameworks)
- **Storage**: Browser localStorage API
- **Size**: ~50KB total (95. 8% HTML, 4.2% JS)
- **Dependencies**: **Zero**

### **Browser Support**
| Browser | Minimum Version |
|---------|----------------|
| Chrome/Edge | 60+ |
| Safari | 12+ |
| Firefox | 60+ |
| Android WebView | 60+ |

### **Performance**
- ⚡ Loads in <100ms
- 🪶 30KB uncompressed
- 📱 Works on 2G networks

---

## 📋 Features Breakdown

### **What You Can Track**

#### **EMIs & Loans**
- Home loans, car loans, personal loans
- Credit card EMIs
- Education loans
- Any installment-based purchase

#### **Recurring Expenses**
- Rent, subscriptions (Netflix, Spotify, etc.)
- Utility bills (electricity, internet)
- Insurance premiums
- Gym memberships

#### **Savings Goals**
- Monthly savings commitments
- Investment SIPs
- Emergency fund contributions

### **Smart Features**
- **Period Left Alerts**:  🔴 Critical (≤30 days), 🟡 Warning (≤90 days), 🟢 Normal
- **Flexible Sorting**: By date, amount, name, category, period left
- **Grouping**: Category, type, due date range, status
- **Export/Import**: JSON backup for data portability
- **Dark Mode**: Easy on the eyes during late-night budgeting

---

## 🔒 Privacy & Data Ownership

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
Every line of code is open for inspection.  No hidden trackers, no backdoors.

---

## 💾 Backup Your Data

### **Export (Recommended)**
1. Click **"Export Backup"** button
2. Saves as `emi-backup-YYYY-MM-DD.json`
3. Store in cloud (Google Drive, Dropbox, etc.)

### **Import**
1. Click **"Import Backup"**
2. Select your `.json` file
3. Data restored instantly

**⚠️ Important**: Browser cache clears can delete data. **Export regularly! **

---

## 🎨 Screenshots

<div align="center">

| Dashboard | Add Item | Dark Mode |
|:---------:|:--------:|:---------:|
| ![](https://github.com/user-attachments/assets/acbf882b-9c9a-4dbc-98a8-7e5d2d899b38) | ![](https://github.com/user-attachments/assets/9a2e01a9-7cf6-4e83-9dca-2365a9665e85) | ![](https://github.com/user-attachments/assets/d12b9662-da09-43f9-a9a0-a12b840e979f) |

</div>

---

## 🚀 Roadmap

### **Completed ✅**
- [x] Export/Import JSON backups
- [x] Dark mode
- [x] Input validation
- [x] PWA offline support
- [x] Smart sorting & grouping

**Want a feature? ** [Open an issue](https://github.com/dhuruvandb/EMI-And-Expense-calculator/issues)

---

## 🤝 Contributing

This project is built **for users like you**.  Contributions welcome! 

### **How to Help**
1. ⭐ **Star this repo** — helps others discover it
2. 🐛 **Report bugs** — [open an issue](https://github.com/dhuruvandb/EMI-And-Expense-calculator/issues)
3. 💡 **Suggest features** — what would make this better for YOU? 
4. 🔧 **Submit PRs** — bug fixes and improvements
5. 📢 **Share** — tell privacy-conscious friends

### **Development**
```bash
git clone https://github.com/dhuruvandb/EMI-And-Expense-calculator.git
# Edit index.html — no build process needed
# Open in browser to test
```

---

## 📄 License

**MIT License** — Free to use, modify, and distribute. 

```
Copyright (c) 2024 Dhuruvan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software...  [full license](LICENSE)
```

---

## 📞 Support

- 🐛 [Report Issues](https://github.com/dhuruvandb/EMI-And-Expense-calculator/issues)
- 💬 [Discussions](https://github.com/dhuruvandb/EMI-And-Expense-calculator/discussions)
- 🌐 [Live Demo](https://dhuruvandb.github.io/EMI-And-Expense-calculator/)

---

## 🎖️ Acknowledgments

Inspired by:
- Privacy-first software movement
- Progressive Web App best practices
- Open source community
---

<div align="center">

### **Made for Privacy-Conscious Users**

*No subscriptions.  No data collection. No BS.*  
*Your finances.  Your data. Your control.*

**[Try It Now →](https://dhuruvandb.github.io/EMI-And-Expense-calculator/)**

---

![GitHub stars](https://img.shields.io/github/stars/dhuruvandb/EMI-And-Expense-calculator?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/dhuruvandb/EMI-And-Expense-calculator)
![GitHub repo size](https://img.shields.io/github/repo-size/dhuruvandb/EMI-And-Expense-calculator)

**If this helps you, give it a ⭐**

</div>
