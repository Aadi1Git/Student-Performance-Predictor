import pickle
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

from dotenv import load_dotenv
from groq import Groq

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AI Setup (Using Groq instead of Google) ---
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

groq_client = None
if GROQ_API_KEY:
    groq_client = Groq(api_key=GROQ_API_KEY)
    print("✅ Groq AI configured successfully.")
else:
    print("⚠️ Warning: GROQ_API_KEY not found in .env file.")

# --- Load Model ---
MODEL_PATH = "model.pkl"
model = None

@app.on_event("startup")
def load_model():
    global model
    try:
        if os.path.exists(MODEL_PATH):
            with open(MODEL_PATH, "rb") as f:
                model = pickle.load(f)
            print("✅ XGBoost Model loaded successfully.")
        else:
            print("⚠️ Warning: model.pkl not found.")
    except Exception as e:
        print(f"❌ Error loading model: {e}")

# --- Input Schema ---
class StudentInput(BaseModel):
    Midterm_Score: float
    Assignments_Avg: float
    Quizzes_Avg: float
    Projects_Score: float
    Study_Hours_per_Week: float
    Attendance: float
    Sleep_Hours_per_Night: float
    Stress_Level: int
    Participation_Score: float
    Branch: str
    Difficulty_Level: str
    Parent_Education_Level: str
    Family_Income_Level: str
    Internet_Access: str
    Hardest_Class: str = ""  # <-- ADDED NEW FIELD (defaults to empty string)

class GoalInput(BaseModel):
    student_data: StudentInput
    target_score: float

class ChatInput(BaseModel):
    student_data: StudentInput
    question: str

@app.post("/predict")
def predict_performance(data: StudentInput):
    if not model:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # --- DATA PREPARATION ---
        branch_civil = 1 if data.Branch == 'Civil' else 0
        branch_ece = 1 if data.Branch == 'ECE' else 0
        branch_eee = 1 if data.Branch == 'EEE' else 0
        branch_me = 1 if data.Branch == 'ME' else 0
        
        internet_yes = 1 if data.Internet_Access == 'Yes' else 0

        diff_map = {'Low': 0, 'Medium': 1, 'High': 2}
        difficulty_val = diff_map.get(data.Difficulty_Level, 1)

        edu_map = {'High School': 0, 'College': 1, 'Postgraduate': 2}
        parent_edu_val = edu_map.get(data.Parent_Education_Level, 1)

        income_map = {'Low': 0, 'Medium': 1, 'High': 2}
        income_val = income_map.get(data.Family_Income_Level, 1)

        # --- CREATE DATAFRAME ---
        # Note: We do NOT include Hardest_Class here because the XGBoost model wasn't trained on it
        input_dict = {
            'Difficulty_Level': [difficulty_val],
            'Attendance (%)': [data.Attendance], 
            'Midterm_Score': [data.Midterm_Score],
            'Assignments_Avg': [data.Assignments_Avg],
            'Quizzes_Avg': [data.Quizzes_Avg],
            'Participation_Score': [data.Participation_Score],
            'Projects_Score': [data.Projects_Score],
            'Study_Hours_per_Week': [data.Study_Hours_per_Week],
            'Parent_Education_Level': [parent_edu_val],
            'Family_Income_Level': [income_val],
            'Stress_Level': [data.Stress_Level],
            'Sleep_Hours_per_Night': [data.Sleep_Hours_per_Night],
            'Branch_Civil': [branch_civil],
            'Branch_ECE': [branch_ece],
            'Branch_EEE': [branch_eee],
            'Branch_ME': [branch_me],
            'Internet_Access_at_Home_Yes': [internet_yes]
        }
        
        df = pd.DataFrame(input_dict)
        
        # --- 1. PREDICT SCORE (XGBoost) ---
        prediction_array = model.predict(df)
        final_score = float(prediction_array[0])

        # --- 2. GENERATE AI ACTION PLAN (Groq/Llama3) ---
        real_ai_plan = ""
        
        if groq_client:
            # Inject the difficult class context if the user provided it
            subject_context = f"\n            - Struggling Subject: {data.Hardest_Class}" if data.Hardest_Class else ""
            
            prompt = f"""
            A student in the {data.Branch} branch has these metrics:
            - Midterm Score: {data.Midterm_Score}/100
            - Assignments: {data.Assignments_Avg}/10
            - Quizzes: {data.Quizzes_Avg}/10
            - Projects: {data.Projects_Score}/20
            - Study Hours/Week: {data.Study_Hours_per_Week}
            - Attendance: {data.Attendance}%
            - Sleep Hours: {data.Sleep_Hours_per_Night}
            - Stress Level: {data.Stress_Level}/10{subject_context}
            
            Their predicted final score is {round(final_score, 1)}/100.
            
            Identify their top weakest areas based ONLY on this data. Write exactly 3 short, actionable bullet points advising them on how to turn those specific weak areas into strong areas. 
            If a struggling subject is provided, tailor your advice to include strategies specifically for mastering that subject.
            Do not use introductory text. Just provide the 3 bullet points starting with a dash (-).
            """
            
            try:
                chat_completion = groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "You are an expert academic advisor."},
                        {"role": "user", "content": prompt}
                    ],
                    model="llama-3.1-8b-instant",
                    temperature=0.5,
                )
                real_ai_plan = chat_completion.choices[0].message.content
            except Exception as e:
                print(f"❌ Groq generation error: {e}")
                real_ai_plan = "- Focus on maintaining consistent study hours.\n- Review your weakest topics.\n- Keep your attendance high."
        else:
            real_ai_plan = "- AI Advisor is currently offline. Please check back later."

        # --- 3. RETURN BOTH ---
        return {
            "predicted_score": final_score,
            "ai_action_plan": real_ai_plan
        }

    except Exception as e:
        import traceback
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
def chat_with_advisor(data: ChatInput):
    if not groq_client:
        raise HTTPException(status_code=503, detail="Groq API offline")

    # Inject the difficult class context if the user provided it
    subject_context = f" They have specifically noted they are struggling with {data.student_data.Hardest_Class}." if data.student_data.Hardest_Class else ""

    # We inject the student's exact stats so the AI knows who it is talking to!
    prompt = f"""
    You are an expert academic advisor helping an engineering student in the {data.student_data.Branch} branch.{subject_context}
    Their current data: Midterm: {data.student_data.Midterm_Score}/100, Study: {data.student_data.Study_Hours_per_Week}hrs/wk, Sleep: {data.student_data.Sleep_Hours_per_Night}hrs/night, Attendance: {data.student_data.Attendance}%, Stress: {data.student_data.Stress_Level}/10.

    The student asks: "{data.question}"

    Provide a helpful, direct, and encouraging answer (max 3 sentences) tailored to their specific data. Don't use bullet points.
    """

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a friendly, highly intelligent academic advisor."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant", 
            temperature=0.7,
        )
        return {"answer": chat_completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/goal")
def reverse_calculate_goal(data: GoalInput):
    if not model:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    # Helper function to run the model quickly
    def get_prediction(student_data):
        input_dict = {
            'Difficulty_Level': [{'Low': 0, 'Medium': 1, 'High': 2}.get(student_data.Difficulty_Level, 1)],
            'Attendance (%)': [student_data.Attendance], 
            'Midterm_Score': [student_data.Midterm_Score],
            'Assignments_Avg': [student_data.Assignments_Avg],
            'Quizzes_Avg': [student_data.Quizzes_Avg],
            'Participation_Score': [student_data.Participation_Score],
            'Projects_Score': [student_data.Projects_Score],
            'Study_Hours_per_Week': [student_data.Study_Hours_per_Week],
            'Parent_Education_Level': [{'High School': 0, 'College': 1, 'Postgraduate': 2}.get(student_data.Parent_Education_Level, 1)],
            'Family_Income_Level': [{'Low': 0, 'Medium': 1, 'High': 2}.get(student_data.Family_Income_Level, 1)],
            'Stress_Level': [student_data.Stress_Level],
            'Sleep_Hours_per_Night': [student_data.Sleep_Hours_per_Night],
            'Branch_Civil': [1 if student_data.Branch == 'Civil' else 0],
            'Branch_ECE': [1 if student_data.Branch == 'ECE' else 0],
            'Branch_EEE': [1 if student_data.Branch == 'EEE' else 0],
            'Branch_ME': [1 if student_data.Branch == 'ME' else 0],
            'Internet_Access_at_Home_Yes': [1 if student_data.Internet_Access == 'Yes' else 0]
        }
        df = pd.DataFrame(input_dict)
        return float(model.predict(df)[0])

    # 1. Check current trajectory
    current_prediction = get_prediction(data.student_data)
    
    if current_prediction >= data.target_score:
        return {
            "status": "on_track",
            "message": f"You are already on track to hit {current_prediction:.1f}, which beats your goal of {data.target_score}!",
            "required_metrics": None
        }

    # 2. Optimization Loop (Iteratively increase grades until target is hit)
    # We use .dict() and ** to safely copy the pydantic model
    test_data = StudentInput(**data.student_data.dict())
    
    # Max possible scores
    MAX_ASSIGN = 10.0
    MAX_QUIZ = 10.0
    MAX_PROJ = 20.0
    
    iterations = 0
    while current_prediction < data.target_score and iterations < 100:
        # Increment remaining coursework
        if test_data.Assignments_Avg < MAX_ASSIGN: test_data.Assignments_Avg += 0.2
        if test_data.Quizzes_Avg < MAX_QUIZ: test_data.Quizzes_Avg += 0.2
        if test_data.Projects_Score < MAX_PROJ: test_data.Projects_Score += 0.5
        
        current_prediction = get_prediction(test_data)
        iterations += 1
        
        # Break if we've maxed out all grades
        if test_data.Assignments_Avg >= MAX_ASSIGN and test_data.Quizzes_Avg >= MAX_QUIZ and test_data.Projects_Score >= MAX_PROJ:
            break

    # 3. Return results
    if current_prediction >= data.target_score:
        return {
            "status": "achievable",
            "message": f"To hit a {data.target_score}, you need to average these scores on your remaining work:",
            "required_metrics": {
                "Assignments": min(round(test_data.Assignments_Avg, 1), MAX_ASSIGN),
                "Quizzes": min(round(test_data.Quizzes_Avg, 1), MAX_QUIZ),
                "Projects": min(round(test_data.Projects_Score, 1), MAX_PROJ)
            }
        }
    else:
        return {
            "status": "unachievable",
            "message": "Even with perfect 100% scores on all remaining assignments, quizzes, and projects, the model predicts you will fall slightly short of this specific goal. Aiming for maximum effort is still highly recommended!",
            "required_metrics": None
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)