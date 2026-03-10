import pickle
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
            print("✅ Model loaded successfully.")
        else:
            print("⚠️ Warning: model.pkl not found.")
    except Exception as e:
        print(f"❌ Error loading model: {e}")

# --- Input Schema ---
# Matches the user inputs we need from the Frontend
class StudentInput(BaseModel):
    Midterm_Score: float
    Assignments_Avg: float
    Quizzes_Avg: float
    Projects_Score: float
    Study_Hours_per_Week: float
    Attendance: float # This will be mapped to 'Attendance (%)'
    Sleep_Hours_per_Night: float
    Stress_Level: int
    Participation_Score: float
    
    # New Categorical Inputs
    Branch: str  # Civil, ECE, EEE, ME, Other
    Difficulty_Level: str # Low, Medium, High
    Parent_Education_Level: str # High School, College, Postgraduate
    Family_Income_Level: str # Low, Medium, High
    Internet_Access: str # Yes, No

@app.post("/predict")
def predict_performance(data: StudentInput):
    if not model:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # --- DATA PREPARATION ---
        # We must manually encode the strings into the numbers the model expects
        
        # 1. Handle One-Hot Encoding for Branch
        # The model expects specific columns: Branch_Civil, Branch_ECE, etc.
        branch_civil = 1 if data.Branch == 'Civil' else 0
        branch_ece = 1 if data.Branch == 'ECE' else 0
        branch_eee = 1 if data.Branch == 'EEE' else 0
        branch_me = 1 if data.Branch == 'ME' else 0
        
        # 2. Handle Internet Access
        internet_yes = 1 if data.Internet_Access == 'Yes' else 0

        # 3. Handle Label Encoding (Mapping Text to Numbers)
        # Note: I am assuming standard mappings. If predictions are weird, these numbers might need swapping.
        
        # Difficulty: Low->0, Medium->1, High->2
        diff_map = {'Low': 0, 'Medium': 1, 'High': 2}
        difficulty_val = diff_map.get(data.Difficulty_Level, 1)

        # Parent Education: High School->0, College->1, Postgrad->2
        edu_map = {'High School': 0, 'College': 1, 'Postgraduate': 2}
        parent_edu_val = edu_map.get(data.Parent_Education_Level, 1)

        # Income: Low->0, Medium->1, High->2
        income_map = {'Low': 0, 'Medium': 1, 'High': 2}
        income_val = income_map.get(data.Family_Income_Level, 1)

        # --- CREATE DATAFRAME ---
        # The keys here MUST match the "Expected" list from your error log exactly.
        input_dict = {
            'Difficulty_Level': [difficulty_val],
            'Attendance (%)': [data.Attendance],  # Note the exact spelling from error log
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
        
        # --- PREDICT ---
        prediction = model.predict(df)
        return {"predicted_score": float(prediction[0])}

    except Exception as e:
        import traceback
        traceback.print_exc() # Print full error to terminal
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)