# AI Interview Coach (InterCoach)

A production-grade, dark glassmorphism web platform designed to prepare candidates for interviews using dynamic generative AI questions, Web Speech voice recognition, dynamic evaluation telemetry, and complete performance scoring.

---

## 📁 Directory Structure

```text
inter-coach/
├── index.html          # Modern Hero Landing Page & Platform Overview
├── login.html          # Authentication Gateway (Firebase Google Sign-In)
├── dashboard.html      # Practice Configurator, Metrics Grid & Log Feed
├── interview.html      # Live Audio/Chat Simulation Room
├── result.html         # Scorecard, Analytics Breakdown & PDF Exporter
├── leaderboard.html    # Global Rankings & Podium Standings
├── profile.html        # Candidate Details & Badges
├── about.html          # Platform Architecture & Tech Stack Details
├── contact.html        # Support Form & Direct Channels
├── css/
│   ├── style.css       # Core System Design Tokens, Utilities & Reset
│   ├── login.css       # Login Card Layout & Loading Animation
│   ├── dashboard.css   # Workspace Layout & Category Picker Styles
│   ├── interview.css   # Split View Workspace, Chat UI & Audio Waveform
│   └── result.css      # Circular Score Chart & Report Layout
├── js/
│   ├── firebase.js     # Firebase v10 Core SDK Initialization
│   ├── auth.js         # Authentication Controller & User Persistence
│   ├── dashboard.js    # Session Parameters Setup & Data Loader
│   ├── interview.js    # Simulation Loop, Speech Recognition & Timer Engine
│   ├── result.js       # Evaluation Engine & PDF Export Logic
│   ├── profile.js      # Profile Settings Manager
│   └── utils.js        # Storage Helpers, Speech Synthesis & Toast System
└── README.md           # Setup, API & Deployment Documentation