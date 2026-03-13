import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Moon, Sun, Award, BrainCircuit, Lightbulb, Mail, Lock, User, ArrowRight, Download, Send, MessageSquare } from 'lucide-react';

// Firebase Imports
import { auth } from './firebase';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';

// PDF Imports
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const App = () => {
  // --- STATE ---
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [insights, setInsights] = useState([]); 
  
  // CHAT STATE
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
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
    Internet_Access: 'Yes'
  });

  // --- DARK MODE & FIREBASE AUTH LISTENER ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setCurrentUser(user); 
      setAuthChecking(false);
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
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // PDF Generator Function
  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
        windowWidth: element.scrollWidth, windowHeight: element.scrollHeight
      });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', [imgWidth, imgHeight]);
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      const userName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Student';
      pdf.save(`${userName}_Performance_Report.pdf`);
    } catch (err) {
      alert("There was an issue generating the PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  // MAIN PREDICT SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('https://student-performance-predictor-rbqq.onrender.com/predict', formData);
      
      setTimeout(() => {
        setPrediction(Math.min(100, response.data.predicted_score));
        const rawAiText = response.data.ai_action_plan;
        let cleanInsights = [];
        if (rawAiText) {
          cleanInsights = rawAiText.split('\n').filter(line => line.trim().length > 0).map(line => line.replace(/^-\s*/, '').replace(/^\*\s*/, '').trim());
        }
        if (cleanInsights.length === 0) cleanInsights.push("Keep up the fantastic work!");
        setInsights(cleanInsights); 
      }, 500);
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
        student_data: formData, 
        question: chatInput     
      });
      
      setChatHistory([...newChatHistory, { role: 'ai', text: response.data.answer }]);
    } catch (err) {
      setChatHistory([...newChatHistory, { role: 'ai', text: "Sorry, I couldn't process that right now. Try again later!" }]);
    } finally {
      setIsChatLoading(false);
    }
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

  if (authChecking) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><BrainCircuit className="animate-spin text-indigo-500 w-10 h-10" /></div>;

  if (!isAuthenticated) return <AuthScreen isLoginView={isLoginView} setIsLoginView={setIsLoginView} isDark={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />;

  if (currentUser && !currentUser.emailVerified) {
    return (
      <div className={`min-h-screen transition-colors duration-500 font-sans p-4 flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-slate-800 to-indigo-950' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100'}`}>
        <div className="max-w-md w-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-2xl rounded-3xl p-8 text-center animate-fade-in-up">
          <div className="flex justify-center mb-6"><div className="p-4 bg-yellow-500 rounded-2xl shadow-lg shadow-yellow-500/30 text-white"><Mail size={40} /></div></div>
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-4">Check Your Inbox</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 text-sm">We sent a secure verification link to <br/><span className="font-bold text-indigo-600 dark:text-indigo-400">{currentUser.email}</span>. <br/><br/>Please click the link in that email to prove you own this address.</p>
          <div className="space-y-4">
            <button onClick={() => window.location.reload()} className="w-full py-3.5 rounded-xl font-bold text-white shadow-xl shadow-indigo-500/30 transition-all active:scale-95 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500">I've Verified My Email</button>
            <button onClick={handleLogout} className="w-full py-3.5 rounded-xl font-bold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 hover:bg-white/50 dark:hover:bg-slate-800">Log Out</button>
          </div>
        </div>
      </div>
    );
  }

  const userName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Student';

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans p-4 sm:p-8 flex items-center justify-center
      ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-slate-800 to-indigo-950' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100'}`}>
      
      <div className="max-w-7xl w-full mx-auto animate-fade-in-up">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30 text-white"><BrainCircuit size={28} /></div>
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                Student Performance Predictor
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="px-5 py-2.5 text-sm font-bold rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-gray-200 dark:border-slate-700 shadow-sm hover:scale-105 transition-all text-indigo-600 dark:text-indigo-400">Log Out</button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-gray-200 dark:border-slate-700 shadow-sm hover:scale-105 transition-all text-gray-800 dark:text-gray-200">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-2xl rounded-3xl p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50"></div>
              <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
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
                  <SliderField label="Stress Level (0-10)" name="Stress_Level" value={formData.Stress_Level} onChange={handleChange} min={0} max={10} isDark={isDarkMode} />
                </div>
                <button type="submit" disabled={loading} className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-xl shadow-indigo-500/30 transition-all active:scale-95 flex justify-center items-center gap-2 ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'}`}>
                  {loading ? <span className="animate-pulse">Running AI Models...</span> : <>Predict Future Performance</>}
                </button>
                {error && <p className="text-red-500 text-center font-medium bg-red-100/50 dark:bg-red-900/30 p-3 rounded-lg">{error}</p>}
              </form>
            </div>

            {/* Graphs Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-xl rounded-3xl p-6">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider text-center">Class Comparison</h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <XAxis dataKey="subject" tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }}/>
                      <Bar dataKey="Student" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Average" fill={isDarkMode ? '#475569' : '#cbd5e1'} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-xl rounded-3xl p-6">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider text-center">Student Profile Shape</h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke={isDarkMode ? '#475569' : '#cbd5e1'} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563', fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Score Strength" dataKey="value" stroke="#a855f7" fill="#a855f7" fillOpacity={0.5} />
                      <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-5 flex flex-col gap-6" ref={reportRef}>
            
            <div className="flex justify-between items-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-xl rounded-2xl p-5">
               <div>
                 <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
                   <Award className="text-purple-500 w-5 h-5" /> Performance Report
                 </h3>
                 <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1.5 ml-7">
                   Student: <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">{userName}</span>
                 </p>
               </div>
               
               {prediction !== null && (
                 <button onClick={handleDownloadPDF} disabled={isDownloading} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-lg transition-all shadow-md ${isDownloading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/30 active:scale-95'}`}>
                   {isDownloading ? <span className="animate-pulse">Generating...</span> : <><Download size={14} /> Download PDF</>}
                 </button>
               )}
            </div>

            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-2xl rounded-3xl p-8 flex flex-col items-center justify-center min-h-[250px]">
              {prediction !== null ? (
                <div className="relative flex items-center justify-center animate-fade-in-up">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle cx="96" cy="96" r="85" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-200 dark:text-slate-700" />
                    <circle cx="96" cy="96" r="85" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="534" strokeDashoffset={534 - (prediction / 100) * 534} strokeLinecap="round" className={`transition-all duration-1500 ease-out ${prediction >= 80 ? 'text-green-500' : prediction >= 60 ? 'text-yellow-500' : 'text-red-500'}`} />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-5xl font-extrabold text-gray-900 dark:text-white">{prediction.toFixed(1)}</span>
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

            {/* AI Action Plan - ALWAYS VISIBLE */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-2xl rounded-3xl p-6 flex flex-col">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Lightbulb className={prediction !== null ? "text-yellow-500 w-5 h-5" : "text-gray-400 dark:text-gray-500 w-5 h-5"} /> AI Action Plan
              </h3>
              
              {prediction !== null ? (
                <div className="max-h-[220px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#818cf8 transparent' }}>
                  <ul className="space-y-3">
                    {insights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300 bg-white/40 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-100 dark:border-slate-700/50 animate-fade-in-up">
                        <span className="text-indigo-500 font-bold mt-0.5 shrink-0">→</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl">
                   <p className="text-sm font-medium">Awaiting Data to Generate Plan...</p>
                </div>
              )}
            </div>

            {/* AI CHAT ASSISTANT - ALWAYS VISIBLE */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-2xl rounded-3xl p-6 flex flex-col flex-grow">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className={prediction !== null ? "text-indigo-500 w-5 h-5" : "text-gray-400 dark:text-gray-500 w-5 h-5"} /> Ask AI Advisor
              </h3>
              
              {prediction !== null ? (
                <>
                  {/* Chat History Box - FIXED HEIGHT AND SCROLLBAR */}
                  <div className="bg-white/40 dark:bg-slate-800/40 rounded-2xl p-4 flex flex-col h-[180px] min-h-[180px] max-h-[180px] overflow-y-auto mb-4 border border-gray-100 dark:border-slate-700/50" style={{ scrollbarWidth: 'thin', scrollbarColor: '#818cf8 transparent' }}>
                    {chatHistory.length === 0 ? (
                      <div className="m-auto text-sm text-gray-400 dark:text-gray-500 text-center italic">
                        "Have a specific question about your stats? Ask me anything!"
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {chatHistory.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`text-sm px-4 py-2 rounded-2xl max-w-[85%] shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-200 dark:border-slate-600'}`}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        {isChatLoading && (
                           <div className="flex justify-start">
                             <div className="text-sm px-4 py-2 rounded-2xl bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-bl-sm animate-pulse border border-gray-200 dark:border-slate-600">
                               Thinking...
                             </div>
                           </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Chat Input Field */}
                  <form onSubmit={handleChatSubmit} className="relative mt-auto">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={`How do I improve my ${formData.Branch} grades?`} 
                      className={`w-full pl-4 pr-12 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm ${isDarkMode ? 'bg-slate-800/50 border-slate-600 text-white placeholder-gray-500' : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-400 shadow-sm'}`}
                      disabled={isChatLoading}
                    />
                    <button 
                      type="submit" 
                      disabled={isChatLoading || !chatInput.trim()}
                      className="absolute right-2 top-2 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </>
              ) : (
                <>
                  {/* Chat Placeholder Box - MATCHING FIXED HEIGHT */}
                  <div className="flex flex-col items-center justify-center h-[180px] min-h-[180px] max-h-[180px] text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl mb-4">
                    <MessageSquare size={32} className="mb-3 opacity-50" />
                    <p className="text-sm font-medium px-6 text-center">Run a prediction to unlock the AI Chat Assistant.</p>
                  </div>
                  {/* Disabled Chat Input */}
                  <div className="relative mt-auto">
                    <input 
                      type="text" 
                      disabled
                      placeholder="Awaiting data..." 
                      className={`w-full pl-4 pr-12 py-3 rounded-xl border outline-none transition-all text-sm opacity-60 cursor-not-allowed ${isDarkMode ? 'bg-slate-800/30 border-slate-700 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                    />
                    <button 
                      disabled
                      className="absolute right-2 top-2 p-1.5 rounded-lg bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-gray-400 transition-all opacity-50 cursor-not-allowed"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
        
        <footer className="col-span-full w-full mt-12 pt-6 pb-8 border-t border-gray-200 dark:border-slate-700/50 text-center">
          <p className="text-gray-500 dark:text-slate-400 text-sm tracking-wide">
            Designed & Built by <span className="text-purple-600 dark:text-purple-400 font-semibold">Aaditya Jaysawal</span>
          </p>
        </footer>
      </div>
    </div>
  );
};

// --- REUSABLE COMPONENTS ---
const Section = ({ title, children, isDark }) => (
  <div>
    <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 pb-2 border-b ${isDark ? 'text-indigo-400 border-slate-700' : 'text-indigo-600 border-indigo-100'}`}>{title}</h3>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
  </div>
);

const InputField = ({ label, name, value, onChange, isDark, min, max }) => (
  <div className="flex flex-col">
    <label className={`text-xs font-semibold mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{label}</label>
    <input type="number" name={name} value={value} onChange={onChange} min={min} max={max} className={`w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all backdrop-blur-sm ${isDark ? 'bg-slate-800/50 border-slate-600 text-white placeholder-gray-500 focus:border-indigo-500' : 'bg-white/50 border-gray-200 text-gray-900 focus:border-indigo-400 shadow-sm'}`} />
  </div>
);

const SelectField = ({ label, name, value, onChange, options, isDark }) => (
  <div className="flex flex-col">
    <label className={`text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{label}</label>
    <select name={name} value={value} onChange={onChange} className={`w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all backdrop-blur-sm appearance-none cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-600 text-white focus:border-indigo-500' : 'bg-white/50 border-gray-200 text-gray-900 focus:border-indigo-400 shadow-sm'}`}>
      {options.map(opt => <option key={opt} value={opt} className={isDark ? "bg-slate-800" : ""}>{opt}</option>)}
    </select>
  </div>
);

const SliderField = ({ label, name, value, onChange, min, max, isDark }) => (
  <div className="flex flex-col">
    <div className="flex justify-between items-center mb-2">
      <label className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>
      <span className={`px-2 py-1 rounded-md text-xs font-bold ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>{value}</span>
    </div>
    <input type="range" name={name} min={min} max={max} value={value} onChange={onChange} className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-500 bg-gray-200 dark:bg-slate-700" />
  </div>
);

// --- AUTH SCREEN ---
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
      if (cleanError.includes('email-already-in-use')) cleanError = 'This email is already registered. Try logging in!';
      if (cleanError.includes('invalid-credential')) cleanError = 'Incorrect email or password. Try again.';
      if (cleanError.includes('weak-password')) cleanError = 'Password must be at least 6 characters.';
      setAuthError(cleanError);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans p-4 flex items-center justify-center
      ${isDark ? 'bg-gradient-to-br from-gray-900 via-slate-800 to-indigo-950' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100'}`}>
      
      <div className="absolute top-6 right-6">
        <button onClick={toggleTheme} className="p-3 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-gray-200 dark:border-slate-700 shadow-sm hover:scale-105 transition-all text-gray-800 dark:text-gray-200">
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="w-full max-w-md bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-2xl rounded-3xl p-8 relative overflow-hidden animate-fade-in-up">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50"></div>
        
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/30 text-white">
            <BrainCircuit size={40} />
          </div>
        </div>
        
        <h2 className="text-3xl font-extrabold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
          {isLoginView ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-6 text-sm">
          {isLoginView ? 'Enter your details to access the Predictor.' : 'Sign up to analyze student performance.'}
        </p>

        {authError && (
          <div className="mb-4 p-3 bg-red-100/50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-center text-sm font-semibold text-red-600 dark:text-red-400">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-5">
          {!isLoginView && (
            <div className="relative">
              <User className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Full Name" required
                value={name} onChange={(e) => setName(e.target.value)}
                className={`w-full pl-10 p-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all backdrop-blur-sm
                  ${isDark ? 'bg-slate-800/50 border-slate-600 text-white placeholder-gray-500' : 'bg-white/50 border-gray-200 text-gray-900'}`} />
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
            <input type="email" placeholder="Email Address" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className={`w-full pl-10 p-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all backdrop-blur-sm
                ${isDark ? 'bg-slate-800/50 border-slate-600 text-white placeholder-gray-500' : 'bg-white/50 border-gray-200 text-gray-900'}`} />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
            <input type="password" placeholder="Password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className={`w-full pl-10 p-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all backdrop-blur-sm
                ${isDark ? 'bg-slate-800/50 border-slate-600 text-white placeholder-gray-500' : 'bg-white/50 border-gray-200 text-gray-900'}`} />
          </div>

          <button type="submit" disabled={authLoading}
            className={`w-full py-3.5 rounded-xl font-bold text-white shadow-xl shadow-indigo-500/30 transition-all flex justify-center items-center gap-2 mt-2
              ${authLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95'}`}
          >
            {authLoading ? <span className="animate-pulse">Loading...</span> : <>{isLoginView ? 'Sign In' : 'Sign Up'} <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          {isLoginView ? "Don't have an account? " : "Already have an account? "}
          <button type="button" onClick={() => { setIsLoginView(!isLoginView); setAuthError(''); }} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
            {isLoginView ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;