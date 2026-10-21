# 🥗 Carb Cycling & Nutrition Tracker

> A smart, specialized food logging and nutrition tracking web app built for fitness enthusiasts, bodybuilders, and anyone aiming for fat loss or muscle gain.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Cloudflare Workers](https://img.shields.io/badge/Deployed--on-Cloudflare%20Workers-orange?logo=cloudflare)
![Status](https://img.shields.io/badge/status-active-brightgreen)

🌐 **Live Demo:** [https://guapi-carb.guapi03.workers.dev/](https://guapi-carb.guapi03.workers.dev/)

---

## 📖 Overview

**Carb Cycling Tracker** is a sleek food-logging web application engineered for precise macronutrient control. Whether you are aiming to break through fat-loss plateaus, maintain your current physique, or lean-bulk as an ectomorph, this application simplifies your decision-making process by locking optimal macronutrient ratios and tracking your carb cycling schedule seamlessly.

---

## ✨ Key Features

* 🧠 **Smart Physique Analysis & Recommendations**
  * Calculates **BMI** instantly based on user weight, height, and age inputs.
  * Provides intelligent diet plan recommendations based on body metric thresholds (e.g., recommends Carb Cycling for BMI $\ge$ 18.5).

* 🎯 **3 Preset Diet Modes (Fixed Macro Ratios)**
  * 🔄 **Carb Cycling (Fat Loss & Shaping):** Utilizes a classic **3 Low / 1 High** carb cycle (3 low-carb days followed by 1 high-carb day) to keep metabolic rate high while shedding fat.
  * ⚖️ **Balanced (Maintenance):** A steady macronutrient distribution tailored for sustainable everyday health and body weight maintenance.
  * 🏋️ **Ectomorph (Lean Muscle Gain):** High-carb, lean-gaining ratio specially designed for high-metabolism "hardgainers."

* 📅 **Cycle Tracking & Auto-Calculation**
  * Customizable cycle start date (Cycle Day 1 Start Date) with a quick `Set Today` button.
  * Automatically computes current cycle progress and tells you whether today is a low-carb or high-carb day.

* 🥗 **Streamlined Food Logging**
  * Purpose-built to eliminate unnecessary complexity and make daily meal tracking fast and disciplined.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3 / Tailwind CSS, JavaScript (ES6+)
* **Backend / Hosting:** Cloudflare Workers
* **Storage / Database:** Cloudflare KV / D1 *(Update as applicable)*

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone [https://github.com/Guapi03/carb-cycling-app.git](https://github.com/Guapi03/carb-cycling-app.git)
cd carb-cycling-app
