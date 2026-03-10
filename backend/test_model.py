import pickle
import pandas as pd
import numpy as np

print("--- DIAGNOSTIC START ---")

# 1. Try to Load the Model
try:
    with open("model.pkl", "rb") as f:
        model = pickle.load(f)
    print("✅ Model loaded successfully.")
except Exception as e:
    print(f"❌ CRITICAL ERROR: Could not load model.pkl. {e}")
    exit()

# 2. Create Dummy Data (Matches what your API creates)
# These are the 4 Engineered Features we are currently sending.
data = {
    'Academic_Performance_Index': [85.0],
    'Engagement_Score': [90.0],
    'Wellbeing_Index': [5.0],
    'Participation_Attendance_Ratio': [0.8]
}
df = pd.DataFrame(data)

print("\nTrying to predict with these columns:")
print(df.columns.tolist())

# 3. Try to Predict
try:
    prediction = model.predict(df)
    print(f"\n✅ SUCCESS! The model works. Prediction: {prediction}")
except Exception as e:
    print(f"\n❌ PREDICTION FAILED.")
    print(f"Error Message: {e}")
    
    print("\n--- TROUBLESHOOTING ---")
    # Try to inspect what features the model actually wants
    try:
        # Check XGBoost specific feature names
        if hasattr(model, 'feature_names_in_'):
            print(f"The model expects these columns: {model.feature_names_in_}")
        elif hasattr(model, 'get_booster'):
            print(f"The model expects these columns: {model.get_booster().feature_names}")
    except:
        print("Could not retrieve feature names from model.")

print("--- DIAGNOSTIC END ---")