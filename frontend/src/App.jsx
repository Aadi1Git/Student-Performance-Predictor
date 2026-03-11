import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Moon, Sun, Award, BrainCircuit } from 'lucide-react';

const App = () => {
  // --- STATE ---
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // UPDATED: Default values adjusted to fit within your new limits
  const [formData, setFormData] = useState({
    Midterm_Score: 75,
    Assignments_Avg: 8,      // Scaled down (Max 10)
    Quizzes_Avg: 7,          // Scaled down (Max 10)
    Projects_Score: 16,      // Scaled down (Max 20)
    Study_Hours_per_Week: 15,// Scaled down (Max 70)
    Attendance: 90,
    Sleep_Hours_per_Night: 7,
    Stress_Level: 5,         // Now out of 10
    Participation_Score: 8,  // Scaled down (Max 10)
    Branch: 'CS',
    Difficulty_Level: 'Medium',
    Parent_Education_Level: 'College',
    Family_Income_Level: 'Medium',
    Internet_Access: 'Yes'
  });

  // --- DARK MODE TOGGLE ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? (parseFloat(value) || 0) : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('https://student-performance-predictor-rbqq.onrender.com/predict', formData);
      // This ensures the score never goes above 100
    setTimeout(() => setPrediction(Math.min(100, response.data.predicted_score)), 500);
    } catch (err) {
      setError('Error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // --- CHART DATA ---
  // UPDATED: To make the chart look proportional, we scale all scores to percentages (0-100) 
  // just for the visual display. The model still gets the raw numbers.
  const chartData = [
    { subject: 'Midterm', Student: formData.Midterm_Score, Average: 72 },
    { subject: 'Assign (%)', Student: formData.Assignments_Avg * 10, Average: 75 },
    { subject: 'Quizzes (%)', Student: formData.Quizzes_Avg * 10, Average: 68 },
    { subject: 'Projects (%)', Student: (formData.Projects_Score / 20) * 100, Average: 80 },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans p-4 sm:p-8 flex items-center justify-center
      ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-slate-800 to-indigo-950' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100'}`}>
      
      <div className="max-w-7xl w-full mx-auto">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30 text-white">
              <BrainCircuit size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                Student Performance Predictor
              </h1>
              {/* <p className="text-sm font-medium text-gray-500 dark:text-gray-400"></p> */}
            </div>
          </div>
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-3 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-gray-200 dark:border-slate-700 shadow-sm hover:scale-105 transition-all text-gray-800 dark:text-gray-200"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: Form Section */}
          <div className="lg:col-span-7 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-2xl rounded-3xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50"></div>
            
            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              
              {/* UPDATED: Added min/max props and updated labels */}
              <Section title="Academic Metrics" isDark={isDarkMode}>
                <InputField label="Midterm (0-100)" name="Midterm_Score" value={formData.Midterm_Score} onChange={handleChange} isDark={isDarkMode} min={0} max={100} />
                <InputField label="Assignments (0-10)" name="Assignments_Avg" value={formData.Assignments_Avg} onChange={handleChange} isDark={isDarkMode} min={0} max={10} />
                <InputField label="Quizzes (0-10)" name="Quizzes_Avg" value={formData.Quizzes_Avg} onChange={handleChange} isDark={isDarkMode} min={0} max={10} />
                <InputField label="Projects (0-20)" name="Projects_Score" value={formData.Projects_Score} onChange={handleChange} isDark={isDarkMode} min={0} max={20} />
              </Section>

              <Section title="Habits & Engagement" isDark={isDarkMode}>
                <InputField label="Study Hrs (0-70)" name="Study_Hours_per_Week" value={formData.Study_Hours_per_Week} onChange={handleChange} isDark={isDarkMode} min={0} max={70} />
                <InputField label="Sleep Hrs/Nt" name="Sleep_Hours_per_Night" value={formData.Sleep_Hours_per_Night} onChange={handleChange} isDark={isDarkMode} min={0} max={24} />
                <InputField label="Participation (0-10)" name="Participation_Score" value={formData.Participation_Score} onChange={handleChange} isDark={isDarkMode} min={0} max={10} />
                <SelectField label="Internet" name="Internet_Access" value={formData.Internet_Access} onChange={handleChange} isDark={isDarkMode} options={['Yes', 'No']} />
              </Section>

              <Section title="Demographics" isDark={isDarkMode}>
                <SelectField label="Branch" name="Branch" value={formData.Branch} onChange={handleChange} isDark={isDarkMode} options={['Civil', 'ECE', 'EEE', 'ME', 'CS', 'Other']} />
                <SelectField label="Difficulty" name="Difficulty_Level" value={formData.Difficulty_Level} onChange={handleChange} isDark={isDarkMode} options={['Low', 'Medium', 'High']} />
                <SelectField label="Education" name="Parent_Education_Level" value={formData.Parent_Education_Level} onChange={handleChange} isDark={isDarkMode} options={['High School', 'College', 'Postgraduate']} />
                <SelectField label="Income" name="Family_Income_Level" value={formData.Family_Income_Level} onChange={handleChange} isDark={isDarkMode} options={['Low', 'Medium', 'High']} />
              </Section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <SliderField label="Attendance (%)" name="Attendance" value={formData.Attendance} onChange={handleChange} min={0} max={100} isDark={isDarkMode} />
                {/* UPDATED: Stress range set from 0 to 10 */}
                <SliderField label="Stress Level (0-10)" name="Stress_Level" value={formData.Stress_Level} onChange={handleChange} min={0} max={10} isDark={isDarkMode} />
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-xl shadow-indigo-500/30 transition-all active:scale-95 flex justify-center items-center gap-2
                  ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'}`}
              >
                {loading ? (
                  <span className="animate-pulse">Running XGBoost Model...</span>
                ) : (
                  <>Predict Future Performance</>
                )}
              </button>
              
              {error && <p className="text-red-500 text-center font-medium bg-red-100/50 dark:bg-red-900/30 p-3 rounded-lg">{error}</p>}
            </form>
          </div>

          {/* RIGHT: Dashboard Results Section */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-2xl rounded-3xl p-8 flex flex-col items-center justify-center min-h-[300px]">
              <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-6 flex items-center gap-2">
                <Award className="text-purple-500" /> AI Prediction Engine
              </h3>
              
              {prediction !== null ? (
                <div className="relative flex items-center justify-center animate-fade-in-up">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle cx="96" cy="96" r="85" stroke="currentColor" strokeWidth="12" fill="transparent" 
                      className="text-gray-200 dark:text-slate-700" />
                    <circle cx="96" cy="96" r="85" stroke="currentColor" strokeWidth="12" fill="transparent"
                      strokeDasharray="534" 
                      strokeDashoffset={534 - (prediction / 100) * 534}
                      strokeLinecap="round"
                      className={`transition-all duration-1500 ease-out 
                        ${prediction >= 80 ? 'text-green-500' : prediction >= 60 ? 'text-yellow-500' : 'text-red-500'}`} 
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-5xl font-extrabold text-gray-900 dark:text-white">
                      {prediction.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">out of 100</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 dark:text-gray-500 flex flex-col items-center">
                  <div className="w-48 h-48 border-8 border-dashed border-gray-200 dark:border-slate-700 rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]">
                    <BrainCircuit size={40} className="animate-pulse" />
                  </div>
                  <p className="mt-6 text-sm">Awaiting Input Data...</p>
                </div>
              )}
            </div>

            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-2xl rounded-3xl p-6 flex-grow">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">
                Student vs Class Average (Scaled %)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <XAxis dataKey="subject" tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                      contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                    <Bar dataKey="Student" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Average" fill={isDarkMode ? '#475569' : '#cbd5e1'} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      </div>
      {/* Footer Section */}
      <footer className="col-span-full w-full mt-12 pt-6 pb-8 border-t border-gray-200 dark:border-slate-700/50 text-center">
        <p className="text-gray-500 dark:text-slate-400 text-sm tracking-wide">
          Designed & Built by <span className="text-purple-600 dark:text-purple-400 font-semibold">Aaditya Jaysawal</span>
        </p>
      </footer>
    </div>
  );
};

// --- REUSABLE COMPONENTS ---
// UPDATED: InputField now accepts min and max properties to enforce the limits
const Section = ({ title, children, isDark }) => (
  <div>
    <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 pb-2 border-b ${isDark ? 'text-indigo-400 border-slate-700' : 'text-indigo-600 border-indigo-100'}`}>
      {title}
    </h3>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
  </div>
);

const InputField = ({ label, name, value, onChange, isDark, min, max }) => (
  <div className="flex flex-col">
    <label className={`text-xs font-semibold mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{label}</label>
    <input 
      type="number" name={name} value={value} onChange={onChange} 
      min={min} max={max}
      className={`w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all backdrop-blur-sm
        ${isDark ? 'bg-slate-800/50 border-slate-600 text-white placeholder-gray-500 focus:border-indigo-500' 
                 : 'bg-white/50 border-gray-200 text-gray-900 focus:border-indigo-400 shadow-sm'}`} 
    />
  </div>
);

const SelectField = ({ label, name, value, onChange, options, isDark }) => (
  <div className="flex flex-col">
    <label className={`text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{label}</label>
    <select 
      name={name} value={value} onChange={onChange} 
      className={`w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all backdrop-blur-sm appearance-none cursor-pointer
        ${isDark ? 'bg-slate-800/50 border-slate-600 text-white focus:border-indigo-500' 
                 : 'bg-white/50 border-gray-200 text-gray-900 focus:border-indigo-400 shadow-sm'}`}
    >
      {options.map(opt => <option key={opt} value={opt} className={isDark ? "bg-slate-800" : ""}>{opt}</option>)}
    </select>
  </div>
);

const SliderField = ({ label, name, value, onChange, min, max, isDark }) => (
  <div className="flex flex-col">
    <div className="flex justify-between items-center mb-2">
      <label className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>
      <span className={`px-2 py-1 rounded-md text-xs font-bold ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
        {value}
      </span>
    </div>
    <input 
      type="range" name={name} min={min} max={max} value={value} onChange={onChange} 
      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-500 bg-gray-200 dark:bg-slate-700" 
    />
  </div>
);

export default App;