# 🎓 Student Performance Predictor
> An AI-powered Student Performance Prediction System built with React, FastAPI, XGBoost, and Groq AI that predicts student performance and generates personalized study recommendations.

![Python](https://img.shields.io/badge/Python-3.10+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green)
![React](https://img.shields.io/badge/React-19-blue)
![Vite](https://img.shields.io/badge/Vite-Frontend-purple)
![XGBoost](https://img.shields.io/badge/XGBoost-ML-orange)
![Groq](https://img.shields.io/badge/Groq-Llama3-black)

## 📑 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [What Makes This Project Unique](#-what-makes-this-project-unique)
- [Demo](#-demo)
- [System Architecture](#-system-architecture)
- [Machine Learning Pipeline](#-machine-learning-pipeline)
- [Tech Stack](#-tech-stack)
- [Dataset](#-dataset)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [API](#-api)
- [Screenshots](#-screenshots)
- [Model Development](#-model-development)
- [Future Improvements](#-future-improvements)
- [Author](#-author)

## 📖 Overview

Student Performance Predictor is a full-stack Machine Learning application that predicts a student's final academic performance using academic, behavioral, and socioeconomic factors.

The application combines:

- XGBoost Machine Learning model
- FastAPI backend
- React + Vite frontend
- Groq Llama 3 AI for personalized study plans
- Interactive charts
- PDF report generation

The project demonstrates an end-to-end ML deployment workflow from prediction to AI-powered recommendations.

## ✨ Features

- Real-time student performance prediction
- Personalized AI study recommendations
- Interactive dashboard
- Downloadable PDF reports
- FastAPI REST API
- React + Tailwind UI
- XGBoost prediction model
- Firebase integration
- Performance visualization using Recharts

## 🚀 What Makes This Project Unique

Unlike traditional student performance prediction systems, this project combines **Machine Learning** and **Generative AI**.

- **XGBoost** predicts the student's final academic score.
- **Groq Llama 3** generates personalized study recommendations based on the predicted performance and the student's most challenging subject.
- **FastAPI** serves real-time predictions through a REST API.
- **React + Recharts** provides an interactive dashboard with downloadable PDF reports.

## 🎥 Demo

| Prediction Page | Dashboard |
|----------------|-----------|
| ![](frontend/screenshots/prediction-page.png) | ![](frontend/screenshots/dashboard.png) |

## 🏗 System Architecture

```text
Student Input
      │
      ▼
React Frontend (Vite)
      │
      ▼
FastAPI Backend
      │
      ▼
XGBoost Model
      │
      ▼
Predicted Score
      │
      ▼
Groq AI Study Plan
```

## 🧠 Machine Learning Pipeline

1. Student enters academic information.
2. FastAPI validates inputs.
3. Categorical variables are encoded.
4. Features are converted into a Pandas DataFrame.
5. XGBoost predicts the final score.
6. Groq AI generates a personalized study plan.
7. Results are displayed in the dashboard and exportable as PDF.

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 19 |
| Styling | Tailwind CSS |
| Backend | FastAPI |
| ML | XGBoost |
| Charts | Recharts |
| AI | Groq Llama 3 |
| PDF | jsPDF |
| Authentication | Firebase |

## 📊 Dataset

The model predicts a student's final academic performance using **17 academic, behavioral, and socioeconomic features** collected through the application form.

| Category | Features |
|----------|----------|
| Academic | Midterm Score, Assignment Average, Quiz Average, Project Score |
| Study Habits | Study Hours, Sleep Hours |
| Classroom Behavior | Attendance, Participation |
| Personal | Stress Level |
| Background | Branch, Parent Education, Family Income, Internet Access |
| Course | Difficulty Level |

## Why XGBoost?

XGBoost was selected because it performs exceptionally well on structured tabular datasets.

Compared with Linear Regression:

| Linear Regression | XGBoost |
|------------------|----------|
| Assumes linear relationships | Learns nonlinear patterns |
| Limited feature interactions | Captures complex interactions |
| More sensitive to outliers | More robust |
| Lower predictive accuracy | Higher predictive accuracy |

## 📂 Project Structure

```text
Student-Performance-Predictor/
├── backend/
│   ├── main.py
│   ├── model.pkl
│   ├── requirements.txt
│   └── test_model.py
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
└── README.md
```
## 🚀 Installation

### Clone Repository

```bash
git clone https://github.com/Aadi1Git/Student-Performance-Predictor.git
cd Student-Performance-Predictor
```

### Backend

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

pip install -r requirements.txt
```

### Frontend

```bash
cd frontend

npm install

npm run dev
```

## 🔑 Environment Variables

Create a `.env` file inside the `backend` folder.

```env
GROQ_API_KEY=your_api_key_here
```

## ▶️ Running the Project

### Start FastAPI

```bash
uvicorn main:app --reload
```

### Start React

```bash
npm run dev
```

## 🔌 API

### POST `/predict`

**Request**

```json
{
  "Midterm_Score": 78,
  "Assignments_Avg": 82,
  "Quizzes_Avg": 75,
  "Projects_Score": 88,
  "Study_Hours_per_Week": 16,
  "Attendance": 92,
  "Branch": "CSE"
}
```

**Response**

```json
{
  "predicted_score":84.6,
  "study_plan":"..."
}
```

## Screenshots

### Prediction Form

![Prediction](frontend/screenshots/prediction-page.png)

### Dashboard

![Dashboard](frontend/screenshots/dashboard.png)

### AI Study Plan

![AI](frontend/screenshots/ai-study-plan.png)

## 🧠 Model Development

The prediction model was developed using **XGBoost Regressor** and trained on **17 academic, behavioral, and socioeconomic features**.

### Model Configuration

| Parameter | Value |
|-----------|-------|
| Algorithm | XGBoost Regressor |
| Number of Features | 17 |
| Estimators | 300 |
| Max Depth | 3 |
| Learning Rate | 0.05 |

### Feature Engineering

The backend preprocesses user input before prediction by:

- Encoding categorical variables (Branch, Difficulty Level, Parent Education, Family Income, and Internet Access).
- Converting the processed inputs into a Pandas DataFrame.
- Passing the feature vector to the trained XGBoost model (`model.pkl`) for real-time score prediction.

### Most Influential Features

Based on the trained model's feature importance:

| Feature | Importance |
|---------|-----------:|
| Midterm Score | 0.6216 |
| Assignments Average | 0.1394 |
| Projects Score | 0.0716 |
| Quizzes Average | 0.0387 |
| Study Hours per Week | 0.0348 |
| Difficulty Level | 0.0308 |
| Attendance | 0.0253 |

The model assigns the highest importance to **Midterm Score**, indicating that previous academic performance is the strongest predictor of the final predicted score in this model.

## Future Improvements

- SHAP Explainable AI
- Teacher dashboard
- Multi-semester prediction
- Docker deployment
- AWS deployment
- CI/CD with GitHub Actions

## 👨‍💻 Author

**Aaditya Jaysawal**

B.Tech Computer Science Engineering — KIIT University

- GitHub: [Aadi1Git](https://github.com/Aadi1Git)
- LinkedIn: [Aaditya Jaysawal](https://www.linkedin.com/in/aaditya-jaysawal-487404298)
