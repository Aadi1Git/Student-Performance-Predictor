import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, CartesianGrid } from 'recharts';
import { Moon, Sun, Award, BrainCircuit, Lightbulb, Mail, Lock, User, ArrowRight, Download, Send, MessageSquare, History, Activity, Target } from 'lucide-react';

// Firebase Imports
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { ref, push, set, get, child, serverTimestamp } from 'firebase/database';

// PDF Imports
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const App = () => {
  // --- STATE ---
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('predictor'); 
  
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [insights, setInsights] = useState([]); 
  
  // GOAL MODE STATE
  const [isGoalMode, setIsGoalMode] = useState(false);
  const [targetScore, setTargetScore] = useState(90);
  const [goalResult, setGoalResult] = useState(null);

  // CHAT STATE
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // HISTORY STATE
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // PDF State and Ref
  const reportRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // AUTH STATE
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); 
  const [isLoginView, setIsLoginView] = useState(true);
  const [authChecking, setAuthChecking] = useState(true); 

  const [formData, setFormData] = useState({
    Midterm_Score: 75,
    Assignments_Avg: 8,
    Quizzes_Avg: 7,
    Projects_Score: 16,
    Study_Hours_per_Week: 15,
    Attendance: 90,
    Sleep_Hours_per_Night: 7,
    Stress_Level: 5,
    Participation_Score: 8,
    Branch: 'CS',
    Difficulty_Level: 'Medium',
    Parent_Education_Level: 'College',
    Family_Income_Level: 'Medium',
    Internet_Access: 'Yes',
    Hardest_Class: '' 
  });

  // --- DARK MODE & FIREBASE AUTH LISTENER ---
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setCurrentUser(user); 
      setAuthChecking(false);
      if (user) fetchUserHistory(user.uid); 
    });
    return () => unsubscribe();
  }, []);

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? (parseFloat(value) || 0) : value
    });
  };

  const handleLogout = async () => {
    try { await signOut(auth); } 
    catch (error) { console.error("Error logging out:", error); }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, 
        backgroundColor: isDarkMode ? '#09090b' : '#fafafa',
        windowWidth: element.scrollWidth, 
        windowHeight: element.scrollHeight,

      });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', [imgWidth, imgHeight]);
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      const userName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Student';
      pdf.save(`${userName}_Performance_Report.pdf`);
    } catch (err) { alert("Issue generating PDF."); } 
    finally { setIsDownloading(false); }
  };

  // --- REALTIME DATABASE FETCH LOGIC ---
  const fetchUserHistory = async (userId) => {
    setIsLoadingHistory(true);
    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `predictions/${userId}`));
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const historyData = [];
        
        for (const key in data) {
          const item = data[key];
          if (item.date) {
            historyData.push({
              id: key,
              Score: parseFloat(item.score),
              Date: new Date(item.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }),
              StudyHours: item.studyHours
            });
          }
        }
        setPredictionHistory(historyData);
      } else {
        setPredictionHistory([]);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // MAIN PREDICT SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setGoalResult(null);
    
    try {
      if (isGoalMode) {
        // --- GOAL MODE API CALL ---
        const response = await axios.post('https://student-performance-predictor-rbqq.onrender.com/goal', {
          student_data: formData,
          target_score: parseFloat(targetScore)
        });
        
        const result = response.data;
        setGoalResult(result);
        setPrediction(null); // Clear standard prediction view
        
        // --- DYNAMIC AI INSIGHTS FOR GOAL MODE ---
        if (result.status === 'on_track') {
          setInsights([
            "Keep doing exactly what you're doing. Your current habits are working beautifully.",
            "Avoid complacency; maintain your current study hours and class participation."
          ]);
        } else if (result.status === 'achievable') {
          setInsights([
            "Focus heavily on the required metrics shown above to bridge the gap.",
            "If the required project score is high, start outlining and working on it immediately.",
            "Consider increasing your weekly study hours slightly to build a safety net."
          ]);
        } else if (result.status === 'unachievable') {
          setInsights([
            "Your target is mathematically highly improbable given your current midterm baseline.",
            "Focus on maximizing your learning and understanding rather than chasing a specific number.",
            "Try lowering your target by a few points to set a realistic, achievable milestone."
          ]);
        }
        
      } else {
        // --- STANDARD PREDICT API CALL ---
        const response = await axios.post('https://student-performance-predictor-rbqq.onrender.com/predict', formData);
        const finalScore = Math.min(100, response.data.predicted_score);
        
        setPrediction(finalScore);
        
        const rawAiText = response.data.ai_action_plan;
        let cleanInsights = [];
        if (rawAiText) {
          cleanInsights = rawAiText.split('\n').filter(line => line.trim().length > 0).map(line => line.replace(/^-\s*/, '').replace(/^\*\s*/, '').trim());
        }
        if (cleanInsights.length === 0) cleanInsights.push("Keep up the consistent effort.");
        setInsights(cleanInsights); 

        // SAVE TO REALTIME DATABASE
        if (currentUser) {
          const userPredictionsRef = ref(db, `predictions/${currentUser.uid}`);
          const newPredictionRef = push(userPredictionsRef); 
          
          await set(newPredictionRef, {
            score: finalScore.toFixed(1),
            date: serverTimestamp(),
            studyHours: formData.Study_Hours_per_Week
          });
          
          fetchUserHistory(currentUser.uid); 
        }
      }

    } catch (err) {
      setError('Error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // CHAT SUBMIT HANDLER
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newChatHistory = [...chatHistory, { role: 'user', text: chatInput }];
    setChatHistory(newChatHistory);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await axios.post('https://student-performance-predictor-rbqq.onrender.com/chat', {
        student_data: formData, question: chatInput     
      });
      setChatHistory([...newChatHistory, { role: 'ai', text: response.data.answer }]);
    } catch (err) {
      setChatHistory([...newChatHistory, { role: 'ai', text: "Service temporarily unavailable." }]);
    } finally { setIsChatLoading(false); }
  };

  // --- CHART DATA PREPARATION ---
  const barChartData = [
    { subject: 'Midterm', Student: formData.Midterm_Score, Average: 72 },
    { subject: 'Assign (%)', Student: formData.Assignments_Avg * 10, Average: 75 },
    { subject: 'Quizzes (%)', Student: formData.Quizzes_Avg * 10, Average: 68 },
    { subject: 'Projects (%)', Student: (formData.Projects_Score / 20) * 100, Average: 80 },
  ];

  const radarData = [
    { subject: 'Exams', value: formData.Midterm_Score },
    { subject: 'Projects', value: (formData.Projects_Score / 20) * 100 },
    { subject: 'Study Habit', value: Math.min(100, (formData.Study_Hours_per_Week / 40) * 100) },
    { subject: 'Sleep Health', value: Math.min(100, (formData.Sleep_Hours_per_Night / 8) * 100) },
    { subject: 'Attendance', value: formData.Attendance },
    { subject: 'Activity', value: formData.Participation_Score * 10 }
  ];

  if (authChecking) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950"><BrainCircuit className="animate-spin text-zinc-900 dark:text-zinc-50 w-8 h-8" /></div>;
  if (!isAuthenticated) return <AuthScreen isLoginView={isLoginView} setIsLoginView={setIsLoginView} isDark={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />;
  if (currentUser && !currentUser.emailVerified) {
    return (
        <div className={`min-h-screen transition-colors duration-300 font-sans p-4 flex items-center justify-center ${isDarkMode ? 'bg-zinc-950 text-zinc-50' : 'bg-zinc-50 text-zinc-900'}`}>
        <div className="max-w-md w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl p-8 text-center animate-fade-in-up">
          <div className="flex justify-center mb-6"><div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-full text-zinc-900 dark:text-zinc-50"><Mail size={24} /></div></div>
          <h2 className="text-xl font-bold tracking-tight mb-2">Check your email</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">A verification link has been sent to <br/><span className="font-semibold text-zinc-900 dark:text-zinc-50">{currentUser.email}</span>.</p>
          <div className="space-y-3">
            <button onClick={() => window.location.reload()} className="w-full py-2.5 rounded-lg font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors">I verified my email</button>
            <button onClick={handleLogout} className="w-full py-2.5 rounded-lg font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">Log Out</button>
          </div>
        </div>
      </div>
    );
  }

  const userName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Student';

  // THEME VARIABLES FOR MOBBIN AESTHETIC
  const cardClass = "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm";
  const primaryChartColor = isDarkMode ? '#fafafa' : '#18181b'; 
  const secondaryChartColor = isDarkMode ? '#27272a' : '#e4e4e7';

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans p-4 sm:p-8 flex flex-col items-center
      ${isDarkMode ? 'bg-zinc-950 text-zinc-50' : 'bg-zinc-50 text-zinc-900'}`}>
      
      <div className="max-w-7xl w-full mx-auto animate-fade-in-up flex-grow">
        
        {/* HEADER & TABS */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2 bg-zinc-900 dark:bg-zinc-50 rounded text-white dark:text-zinc-900"><BrainCircuit size={20} strokeWidth={2.5} /></div>
            <h1 className="text-xl font-bold tracking-tight">Predictor</h1>
          </div>
          
          {/* --- NEW 3-PART TAB NAVIGATION --- */}
          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
            <button 
              onClick={() => { setActiveTab('predictor'); setIsGoalMode(false); }} 
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'predictor' && !isGoalMode ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
            >
              <Activity size={16} /> Predictor
            </button>
            <button 
              onClick={() => { setActiveTab('predictor'); setIsGoalMode(true); setGoalResult(null); setPrediction(null); setInsights([]); }} 
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'predictor' && isGoalMode ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
            >
              <Target size={16} /> Goal Mode
            </button>
            <button 
              onClick={() => setActiveTab('history')} 
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
            >
              <History size={16} /> History
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">Log Out</button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-zinc-700 dark:text-zinc-300">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        {/* --- TAB VIEW LOGIC --- */}
        {activeTab === 'predictor' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* LEFT COLUMN */}
            <div className="lg:col-span-7 flex flex-col gap-6 h-full">
              <div className={`${cardClass} p-6 sm:p-8 flex-grow flex flex-col`}>
                <form onSubmit={handleSubmit} className="space-y-8 h-full flex flex-col">
                  
                  {isGoalMode && (
                    <div className="mb-2 p-4 border border-zinc-900 dark:border-zinc-50 rounded-xl bg-zinc-50 dark:bg-zinc-900/20">
                      <InputField label="Your Target Final Score (0-100)" name="targetScore" value={targetScore} onChange={(e) => setTargetScore(e.target.value)} min={0} max={100} />
                    </div>
                  )}

                  <Section title="Academic Metrics" isDark={isDarkMode}>
                    <InputField label="Midterm(0-100)" name="Midterm_Score" value={formData.Midterm_Score} onChange={handleChange} isDark={isDarkMode} min={0} max={100} />
                    {!isGoalMode && (
                      <>
                        <InputField label="Assignments(0-10)" name="Assignments_Avg" value={formData.Assignments_Avg} onChange={handleChange} isDark={isDarkMode} min={0} max={10} />
                        <InputField label="Quizzes(0-10)" name="Quizzes_Avg" value={formData.Quizzes_Avg} onChange={handleChange} isDark={isDarkMode} min={0} max={10} />
                        <InputField label="Projects(0-20)" name="Projects_Score" value={formData.Projects_Score} onChange={handleChange} isDark={isDarkMode} min={0} max={20} />
                      </>
                    )}
              <InputField label="Struggling Subject" name="Hardest_Class" type="text" value={formData.Hardest_Class} onChange={handleChange} />
                  </Section>
                  
                  <Section title="Habits" isDark={isDarkMode}>
                    <InputField label="Study Hrs/Week" name="Study_Hours_per_Week" value={formData.Study_Hours_per_Week} onChange={handleChange} isDark={isDarkMode} min={0} max={70} />
                    <InputField label="Sleep Hrs/Night" name="Sleep_Hours_per_Night" value={formData.Sleep_Hours_per_Night} onChange={handleChange} isDark={isDarkMode} min={0} max={24} />
                    <InputField label="Participation In Class" name="Participation_Score" value={formData.Participation_Score} onChange={handleChange} isDark={isDarkMode} min={0} max={10} />
                    <SelectField label="Internet Access" name="Internet_Access" value={formData.Internet_Access} onChange={handleChange} isDark={isDarkMode} options={['Yes', 'No']} />
                  </Section>
                  
                  <Section title="Demographics" isDark={isDarkMode}>
                    <SelectField label="Branch" name="Branch" value={formData.Branch} onChange={handleChange} isDark={isDarkMode} options={['Civil', 'ECE', 'EEE', 'ME', 'CS', 'Other']} />
                    <SelectField label="Difficulty" name="Difficulty_Level" value={formData.Difficulty_Level} onChange={handleChange} isDark={isDarkMode} options={['Low', 'Medium', 'High']} />
                    <SelectField label="Education" name="Parent_Education_Level" value={formData.Parent_Education_Level} onChange={handleChange} isDark={isDarkMode} options={['High School', 'College', 'Postgraduate']} />
                    <SelectField label="Income" name="Family_Income_Level" value={formData.Family_Income_Level} onChange={handleChange} isDark={isDarkMode} options={['Low', 'Medium', 'High']} />
                  </Section>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2 flex-grow">
                    <SliderField label="Attendance" name="Attendance" value={formData.Attendance} onChange={handleChange} min={0} max={100} isDark={isDarkMode} />
                    <SliderField label="Stress Level" name="Stress_Level" value={formData.Stress_Level} onChange={handleChange} min={0} max={10} isDark={isDarkMode} />
                  </div>
                  
                  <div className="pt-4 mt-auto">
                    <button type="submit" disabled={loading} className={`w-full py-3.5 rounded-lg font-semibold text-sm transition-colors flex justify-center items-center gap-2 ${loading ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900'}`}>
                      {loading ? <span className="animate-pulse">Processing...</span> : isGoalMode ? <>Calculate Required Scores</> : <>Predict Performance</>}
                    </button>
                    {error && <p className="text-red-500 text-sm text-center font-medium mt-3">{error}</p>}
                  </div>
                </form>
              </div>

              {/* Graphs Grid (Only show in predict mode for now) */}
              {!isGoalMode && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-auto">
                  <div className={`${cardClass} p-5`}>
                    <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-widest">Comparison</h3>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                          <XAxis dataKey="subject" tick={{ fill: isDarkMode ? '#a1a1aa' : '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: isDarkMode ? '#a1a1aa' : '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: isDarkMode ? '#27272a' : '#f4f4f5' }} contentStyle={{ backgroundColor: isDarkMode ? '#09090b' : '#ffffff', borderRadius: '8px', border: `1px solid ${isDarkMode ? '#27272a' : '#e4e4e7'}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }}/>
                          <Bar dataKey="Student" fill={primaryChartColor} radius={[2, 2, 0, 0]} />
                          <Bar dataKey="Average" fill={secondaryChartColor} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className={`${cardClass} p-5`}>
                    <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-widest">Shape</h3>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                          <PolarGrid stroke={isDarkMode ? '#27272a' : '#e4e4e7'} />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: isDarkMode ? '#a1a1aa' : '#52525b', fontSize: 10 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Score" dataKey="value" stroke={primaryChartColor} fill={primaryChartColor} fillOpacity={0.15} />
                          <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#09090b' : '#ffffff', borderRadius: '8px', border: `1px solid ${isDarkMode ? '#27272a' : '#e4e4e7'}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-5 flex flex-col gap-6 h-full pb-8" ref={reportRef}>
              <div className={`${cardClass} p-4 flex justify-between items-center`}>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2"><Award className="w-4 h-4" /> Report</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 ml-6"><span className="font-semibold text-zinc-900 dark:text-zinc-50">{userName}</span></p>
                </div>
                {(prediction !== null || goalResult !== null) && (
                  <button onClick={handleDownloadPDF} disabled={isDownloading} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors ${isDownloading ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border-transparent cursor-not-allowed' : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}>
                    {isDownloading ? <span className="animate-pulse">Generating</span> : <><Download size={14} /> Download</>}
                  </button>
                )}
              </div>

              {/* DYNAMIC SCORE CARD (Standard vs Goal Mode) */}
              <div className={`${cardClass} p-8 flex flex-col items-center justify-center flex-grow min-h-[250px]`}>
                
                {isGoalMode && goalResult ? (
                  <div className="flex flex-col items-center justify-center w-full animate-fade-in-up text-center">
                    <Target size={32} className="mb-4 text-zinc-900 dark:text-zinc-50" />
                    <h3 className="text-xl font-bold mb-2">
                      {goalResult.status === 'on_track' ? 'You are on track!' : goalResult.status === 'achievable' ? 'Target Achievable' : 'Target Out of Reach'}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 px-4">{goalResult.message}</p>
                    
                    {goalResult.required_metrics && (
                      <div className="w-full grid grid-cols-3 gap-3">
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Assign</p>
                          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{goalResult.required_metrics.Assignments}/10</p>
                        </div>
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Quiz</p>
                          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{goalResult.required_metrics.Quizzes}/10</p>
                        </div>
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Project</p>
                          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{goalResult.required_metrics.Projects}/20</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : prediction !== null ? (
                  <div className="relative flex items-center justify-center animate-fade-in-up">
                    <svg className="w-40 h-40 transform -rotate-90">
                      <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-zinc-100 dark:text-zinc-900" />
                      <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray="440" strokeDashoffset={440 - (prediction / 100) * 440} strokeLinecap="round" className="text-zinc-900 dark:text-zinc-50 transition-all duration-1500 ease-out" />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-4xl font-black">{prediction.toFixed(1)}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold mt-1 uppercase tracking-widest">Score</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-zinc-400 dark:text-zinc-600 flex flex-col items-center">
                    <div className="w-32 h-32 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]"><BrainCircuit size={28} className="opacity-40" /></div>
                    <p className="mt-4 text-xs font-medium uppercase tracking-widest">{isGoalMode ? 'Awaiting Target' : 'Awaiting Data'}</p>
                  </div>
                )}
              </div>

              {/* AI Action Plan */}
              <div className={`${cardClass} p-5 flex flex-col h-[280px] min-h-[280px]`}>
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2 shrink-0"><Lightbulb className="w-4 h-4" /> Plan</h3>
                {(prediction !== null || goalResult !== null) ? (
                  <div className="flex-grow overflow-y-auto pr-2" style={{ scrollbarWidth: 'none' }}>
                    <ul className="space-y-2">
                      {insights.map((insight, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/30">
                          <span className="font-bold mt-0.5 shrink-0 text-zinc-400 dark:text-zinc-500">→</span>
                          <span className="text-zinc-600 dark:text-zinc-300">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center py-8 text-zinc-400 dark:text-zinc-600 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/20"><p className="text-xs">Run calculation to view plan.</p></div>
                )}
              </div>

              {/* AI CHAT ASSISTANT */}
              <div className={`${cardClass} p-5 flex flex-col`}>
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Advisor</h3>
                {(prediction !== null || goalResult !== null) ? (
                  <>
                    <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-lg p-3 flex flex-col h-[160px] min-h-[160px] max-h-[160px] overflow-y-auto mb-3 border border-zinc-200 dark:border-zinc-800/50" style={{ scrollbarWidth: 'none' }}>
                      {chatHistory.length === 0 ? (
                        <div className="m-auto text-xs text-zinc-500 dark:text-zinc-400 text-center">Ask a question regarding your metrics.</div>
                      ) : (
                        <div className="space-y-3">
                          {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`text-xs px-3 py-2 rounded-lg max-w-[85%] ${msg.role === 'user' ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 font-medium' : 'bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'}`}>{msg.text}</div>
                            </div>
                          ))}
                          {isChatLoading && <div className="flex justify-start"><div className="text-xs px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-500 animate-pulse">Thinking...</div></div>}
                        </div>
                      )}
                    </div>
                    <form onSubmit={handleChatSubmit} className="relative mt-auto">
                      <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message..." className="w-full pl-3 pr-10 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-50 focus:border-zinc-900 dark:focus:border-zinc-50 outline-none transition-colors placeholder-zinc-400 dark:placeholder-zinc-600" disabled={isChatLoading} />
                      <button type="submit" disabled={isChatLoading || !chatInput.trim()} className="absolute right-1.5 top-1.5 p-1.5 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><Send size={14} /></button>
                    </form>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col items-center justify-center h-[160px] min-h-[160px] max-h-[160px] text-zinc-400 dark:text-zinc-600 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg mb-3 bg-zinc-50/50 dark:bg-zinc-900/20"><MessageSquare size={20} className="mb-2 opacity-40" /><p className="text-xs px-4 text-center">Interact to unlock advisor.</p></div>
                    <div className="relative mt-auto"><input type="text" disabled placeholder="Unavailable" className="w-full pl-3 pr-10 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-sm outline-none cursor-not-allowed placeholder-zinc-300 dark:placeholder-zinc-700" /><button disabled className="absolute right-1.5 top-1.5 p-1.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-400 transition-colors opacity-50 cursor-not-allowed"><Send size={14} /></button></div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          
          /* --- NEW HISTORY TAB CONTENT --- */
          <div className={`${cardClass} p-6 sm:p-10 min-h-[500px] flex flex-col`}>
            <div className="flex justify-between items-center mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Performance Trend</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Track your predicted scores over time based on your changing habits.</p>
              </div>
            </div>

            {isLoadingHistory ? (
              <div className="flex-grow flex items-center justify-center flex-col gap-4 text-zinc-500">
                <BrainCircuit className="animate-spin opacity-50 w-8 h-8" />
                <p className="text-sm font-medium">Loading historical data...</p>
              </div>
            ) : predictionHistory.length > 0 ? (
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={predictionHistory} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#27272a' : '#e4e4e7'} vertical={false} />
                    <XAxis dataKey="Date" tick={{ fill: isDarkMode ? '#a1a1aa' : '#52525b', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis domain={[0, 100]} tick={{ fill: isDarkMode ? '#a1a1aa' : '#52525b', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: isDarkMode ? '#09090b' : '#ffffff', borderRadius: '8px', border: `1px solid ${isDarkMode ? '#27272a' : '#e4e4e7'}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                      labelStyle={{ color: isDarkMode ? '#fafafa' : '#18181b', fontWeight: 'bold', marginBottom: '4px' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                    <Line type="monotone" dataKey="Score" stroke={primaryChartColor} strokeWidth={3} dot={{ r: 5, fill: primaryChartColor, strokeWidth: 0 }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center py-16 text-zinc-400 dark:text-zinc-600 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20">
                <History size={48} className="mb-4 opacity-20" />
                <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">No history found</h3>
                <p className="text-sm">Run your first prediction to start tracking your progress over time.</p>
                <button onClick={() => setActiveTab('predictor')} className="mt-6 px-4 py-2 rounded-lg font-semibold text-sm bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 hover:opacity-90 transition-opacity">
                  Go to Predictor
                </button>
              </div>
            )}
          </div>
        )}
        
      </div>
      <footer className="w-full max-w-7xl mt-12 pt-6 pb-8 border-t border-zinc-200 dark:border-zinc-800 text-center">
        <p className="text-zinc-500 dark:text-zinc-400 text-xs">Designed & Built by <span className="font-semibold text-zinc-900 dark:text-zinc-50">BIT-BY-BIT</span></p>
      </footer>
    </div>
  );
};

// --- REUSABLE COMPONENTS ---
const Section = ({ title, children, isDark }) => (
  <div>
    <h3 className="text-xs font-bold uppercase tracking-widest mb-4 pb-2 border-b text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800">{title}</h3>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
  </div>
);

const InputField = ({ label, name, value, onChange, min, max, type = "number" }) => (
  <div className="flex flex-col">
    <label className="text-xs font-semibold mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis text-zinc-700 dark:text-zinc-300">{label}</label>
    <input type={type} name={name} value={value} onChange={onChange} min={min} max={max} className="w-full p-2.5 rounded-lg border text-sm focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-50 focus:border-zinc-900 dark:focus:border-zinc-50 outline-none transition-colors bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400" />
  </div>
);

const SelectField = ({ label, name, value, onChange, options }) => (
  <div className="flex flex-col">
    <label className="text-xs font-semibold mb-1.5 text-zinc-700 dark:text-zinc-300">{label}</label>
    <select name={name} value={value} onChange={onChange} className="w-full p-2.5 rounded-lg border text-sm focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-50 focus:border-zinc-900 dark:focus:border-zinc-50 outline-none transition-colors appearance-none cursor-pointer bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
      {options.map(opt => <option key={opt} value={opt} className="bg-white dark:bg-zinc-950">{opt}</option>)}
    </select>
  </div>
);

const SliderField = ({ label, name, value, onChange, min, max }) => (
  <div className="flex flex-col">
    <div className="flex justify-between items-center mb-2">
      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{label}</label>
      <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">{value}</span>
    </div>
    <input type="range" name={name} min={min} max={max} value={value} onChange={onChange} className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-50 bg-zinc-200 dark:border-zinc-800" />
  </div>
);

const AuthScreen = ({ isLoginView, setIsLoginView, isDark, toggleTheme }) => {
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [name, setName] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      if (!isLoginView) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await sendEmailVerification(userCredential.user);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      let cleanError = err.message;
      if (cleanError.includes('email-already-in-use')) cleanError = 'Email already registered.';
      if (cleanError.includes('invalid-credential')) cleanError = 'Incorrect credentials.';
      if (cleanError.includes('weak-password')) cleanError = 'Password must be at least 6 characters.';
      setAuthError(cleanError);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans p-4 flex items-center justify-center
      ${isDark ? 'bg-zinc-950 text-zinc-50' : 'bg-zinc-50 text-zinc-900'}`}>
      
      <div className="absolute top-6 right-6">
        <button onClick={toggleTheme} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-zinc-700 dark:text-zinc-300">
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="w-full max-w-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl p-8 relative animate-fade-in-up">
        
        <div className="flex justify-center mb-6">
          <div className="p-2.5 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 rounded-lg">
            <BrainCircuit size={24} strokeWidth={2.5} />
          </div>
        </div>
        
        <h2 className="text-xl font-bold tracking-tight text-center mb-2">
          {isLoginView ? 'Welcome back' : 'Create an account'}
        </h2>
        <p className="text-center text-zinc-500 dark:text-zinc-400 mb-6 text-sm">
          {isLoginView ? 'Enter your details to sign in.' : 'Start analyzing performance.'}
        </p>

        {authError && (
          <div className="mb-4 p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-center text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {!isLoginView && (
            <div>
              <label className="block text-xs font-semibold mb-1.5">Name</label>
              <input type="text" required
                value={name} onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 rounded-lg border text-sm focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-50 focus:border-zinc-900 dark:focus:border-zinc-50 outline-none transition-colors bg-transparent border-zinc-200 dark:border-zinc-800" />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold mb-1.5">Email</label>
            <input type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 rounded-lg border text-sm focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-50 focus:border-zinc-900 dark:focus:border-zinc-50 outline-none transition-colors bg-transparent border-zinc-200 dark:border-zinc-800" />
          </div>

          <div>
             <label className="block text-xs font-semibold mb-1.5">Password</label>
            <input type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 rounded-lg border text-sm focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-50 focus:border-zinc-900 dark:focus:border-zinc-50 outline-none transition-colors bg-transparent border-zinc-200 dark:border-zinc-800" />
          </div>

          <button type="submit" disabled={authLoading}
            className={`w-full py-2.5 mt-2 rounded-lg font-semibold text-sm transition-colors flex justify-center items-center gap-2
              ${authLoading ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200'}`}
          >
            {authLoading ? <span className="animate-pulse">Loading...</span> : <>{isLoginView ? 'Sign in' : 'Sign up'}</>}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {isLoginView ? "Don't have an account? " : "Already have an account? "}
          <button type="button" onClick={() => { setIsLoginView(!isLoginView); setAuthError(''); }} className="text-zinc-900 dark:text-zinc-50 font-semibold hover:underline">
            {isLoginView ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;