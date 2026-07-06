# PrepUp — AI-Powered Placement Intelligence Platform

PrepUp is an AI-powered Placement Intelligence Platform designed to help students prepare for campus placements through data-driven insights. Instead of relying on assumptions, the platform analyzes placement evidence such as coding performance, resume quality, communication skills, aptitude assessments, mock interviews, and application history to provide personalized recommendations, readiness scores, and intelligent career guidance.

---

## Problem Statement

Students today use multiple platforms for placement preparation, yet they often struggle to answer fundamental questions:

- Am I placement ready?
- What should I learn next?
- Which skills need improvement?
- Why am I getting rejected?
- How can I improve consistently?

PrepUp addresses this challenge by combining Artificial Intelligence, Machine Learning, and Natural Language Processing to transform fragmented preparation into measurable placement progress.

---

## Features

### Placement Readiness Intelligence
- AI-powered placement readiness assessment
- Personalized readiness score
- Skill gap identification
- Performance analytics dashboard

### Personalized Action Engine
- Daily AI-generated action plans
- Curated learning recommendations
- Weak area prioritization
- Goal-based preparation roadmap

### Communication Intelligence
- Speech-to-text analysis
- Speaking speed detection
- Filler word analysis
- Communication scoring
- Interview communication feedback

### Resume Intelligence
- Resume analysis
- Resume-role semantic matching
- Resume improvement suggestions
- ATS-friendly recommendations

### Mock Interview Intelligence
- AI interview evaluation
- STAR framework analysis
- Technical keyword detection
- Confidence scoring
- Interview feedback generation

### Failure Intelligence
- Placement rejection analysis
- Failure pattern detection
- Rejection clustering
- Personalized improvement insights

### AI Career Coach
- Gemini-powered career assistant
- Personalized placement guidance
- Resume advice
- Interview preparation support
- Career-related Q&A

### Progress & Momentum Tracking
- Progress dashboard
- Daily preparation tracking
- Learning consistency monitoring
- Performance visualization

---

## AI & Machine Learning Modules

| Module | Technique | Output |
|---------|-----------|--------|
| Placement Predictor | Random Forest Classifier | Placement probability |
| Interview Analyzer | Random Forest Regressor | Interview performance score |
| Communication Analyzer | Random Forest Regressor | Communication assessment |
| Failure Intelligence | TF-IDF + K-Means Clustering | Rejection pattern detection |
| Resume Matcher | TF-IDF + Cosine Similarity | Resume-role similarity score |
| AI Career Coach | Google Gemini LLM | Personalized career guidance |

---

## Machine Learning Pipeline

```text
Student Evidence
(Resume • Coding • Aptitude • Communication • Interview • Applications)

        │
        ▼

Feature Engineering
(TF-IDF • Assessment Metrics • Linguistic Features)

        │
        ▼

Machine Learning Models
(Random Forest • TF-IDF • K-Means)

        │
        ▼

Placement Intelligence

- Readiness Score
- Skill Gap Detection
- Resume Insights
- Communication Analysis
- Failure Analysis
- Personalized Recommendations

        │
        ▼

Gemini AI Coach
(Personalized Career Guidance)
```

---

## Tech Stack

### Frontend
- React.js
- TypeScript
- HTML5
- CSS3
- JavaScript

### Backend
- Node.js
- Express.js
- FastAPI
- Uvicorn
- Pydantic

### Database
- MongoDB Atlas

### Artificial Intelligence & Machine Learning
- Python
- Scikit-learn
- NumPy
- Random Forest
- TF-IDF
- K-Means Clustering
- Cosine Similarity
- Natural Language Processing (NLP)

### AI Services
- Google Gemini API
- Web Speech API

### Authentication
- JWT (JSON Web Token)

### Tools
- Git
- GitHub
- Twilio

---

## Project Structure

```text
PrepUP--final-system/

├── backend/
│   ├── app/
│   │   ├── ai/
│   │   ├── ml/
│   │   ├── main.py
│   │   └── models/
│   ├── src/
│   ├── requirements.txt
│   └── package.json
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── start.bat
└── README.md
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/KEERTHANASRI-A-M-0609/PrepUP--final-system.git

cd PrepUP--final-system
```

### Backend

```bash
cd backend

npm install

npm run dev
```

### AI Server

```bash
pip install -r backend/requirements.txt

python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --app-dir backend
```

### Frontend

```bash
cd frontend

npm install

npm run dev
```

### Quick Start

```bash
start.bat
```

---

## Application URLs

Frontend

```text
http://localhost:5173
```

Backend

```text
http://localhost:5000
```

AI Engine

```text
http://localhost:8000
```

AI Status

```text
http://localhost:8000/ai/status
```

---

## Environment Variables

Create a `.env` file inside the backend folder.

```env
MONGODB_URI=your_mongodb_connection

JWT_SECRET=your_secret_key

GEMINI_API_KEY=your_gemini_api_key
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ai/status` | GET | AI Engine Status |
| `/ml/placement-predict` | POST | Placement Prediction |
| `/ml/failure-cluster` | POST | Failure Pattern Analysis |
| `/ai/interview-score` | POST | Interview Scoring |
| `/ai/communication-score` | POST | Communication Analysis |
| `/ai/resume-insights` | POST | Resume Analysis |
| `/ai/chat` | POST | AI Career Coach |

---

## Vision

PrepUp aims to evolve into a comprehensive Placement Intelligence Platform that empowers students with data-driven insights, personalized guidance, and continuous progress tracking throughout their placement journey.

---

## Author

**Keerthanasri A M**

