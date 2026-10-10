# ⚡ Jo-Fit: AI-Powered Biomechanics & Rewards

**Jo-Fit** is a mobile-first, AI-driven health and fitness platform built for the Arab Bank Public Health Initiative. It utilizes high-fidelity computer vision to provide real-time exercise form correction, paired with a dynamic generative AI health coach, and a gamified rewards ecosystem.

![Jo-Fit Cyber-Sport Theme](docs/WhatsApp%20Image%202026-10-09%20at%204.03.16%20PM.jpeg)

## ✨ Core Features

*   **📷 Live AI Biomechanics Tracking:** Edge-computed pose estimation using MediaPipe. Tracks joint angles in real-time to analyze form, prevent injury, and count valid reps.
*   **🤖 Dual-Engine Health Coach:** An intelligent fitness assistant powered by Google Gemini (Flash), featuring an automatic deterministic offline-fallback engine to guarantee 100% uptime during live hackathon demos or poor gym Wi-Fi.
*   **🏆 Arab Bank Rewards Integration:** Valid reps and perfect sets automatically generate "Arabi Fit Points," redeemable for healthy meals, gym passes, and local partner deals.
*   **🌍 Fully Localized (i18n):** Seamlessly toggle between English (LTR) and Arabic (RTL) layouts with a single tap, dynamically restructuring the UI.
*   **🌗 Adaptive Cyber-Sport UI:** A Next.js responsive layout featuring a custom Light/Dark mode, utilizing framer-motion for smooth drawer slides, pulsing SOS alerts, and state transitions.

---

## 🧠 The Biomechanics Engine

Our AI Camera Tracker moves beyond simple rep-counting. It calculates complex geometries on the fly to enforce safe lifting mechanics, featuring frame-debouncing to prevent camera-glitch false positives.

### 🏋️ Squat Tracking Logic
1.  **Parallel Depth Check:** Hip crease must drop below the top of the patella (<= 90°) to maximize glute recruitment and protect the patellofemoral joint.
2.  **Stance Width:** Compares ankle distance to shoulder width before descent. Invalidates reps starting with an excessively wide, unstable base.
3.  **Knee Valgus Prevention:** Dynamically tracks the horizontal distance between knees during the eccentric phase. Alerts the user if knees cave inward.

### 💪 Bicep Curl Tracking Logic (Forgiving ROM)
1.  **Full Range of Motion:** Requires bottom extension (eccentric) past 135° and top contraction (concentric) past 70°.
2.  **Elbow Flare Restraint:** Measures elbow distance relative to shoulder width, forgiving natural movement but penalizing excessive flaring (> 1.6x multiplier) that shifts tension off the bicep.

### 📊 Post-Set Analysis
After every set, the tracker halts and generates a **Set Results Summary**, detailing exactly which reps failed, why they failed, and actionable AI form corrections for the next set.

---

## 🛠️ Technology Stack

*   **Framework:** Next.js (App Router), React
*   **Styling & UI:** Tailwind CSS, Framer Motion, `next-themes` (Light/Dark Mode)
*   **Computer Vision:** Google MediaPipe Pose Landmarker
*   **AI / LLM:** Google Gen AI SDK (`gemini-3.8-flash` by default; override with `GEMINI_MODEL`)
*   **Localization:** React Context (English / Arabic RTL Support)

---

## 🚀 Getting Started

Follow these steps to run Jo-Fit locally on your machine.

### 1. Clone the Repository
```bash
git clone https://github.com/Mohammaddwiek/jo-fit.git
cd jo-fit
```

### 2. Install Dependencies
```bash
npm install
```
This also copies the MediaPipe WASM runtime into `public/mediapipe/wasm`, so pose tracking works without a CDN.

### 3. Add Your Gemini API Key (optional)
Create a `.env.local` file in the project root:
```bash
GEMINI_API_KEY=your_api_key_here
```
Without a key, the Health Coach answers from its built-in offline knowledge base.

### 4. Run the App
```bash
npm run dev
```
Then open [http://localhost:3000](http://localhost:3000) and allow camera access when the AI tracker starts.

For the smoothest camera tracking (e.g. a live demo), run the production build instead:
```bash
npm run build
npm run start
```
