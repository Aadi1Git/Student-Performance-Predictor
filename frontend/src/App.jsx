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
        scale: 2, backgroundColor: isDarkMode ? '#0d1117' : '#f6f8fa',
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

  if (authChecking) return <div className="min-h-screen flex items-center justify-center bg-[#f6f8fa] dark:bg-[#0d1117]"><BrainCircuit className="animate-spin text-blue-600 dark:text-blue-500 w-10 h-10" /></div>;

  if (!isAuthenticated) return <AuthScreen isLoginView={isLoginView} setIsLoginView={setIsLoginView} isDark={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />;

  if (currentUser && !currentUser.emailVerified) {
    return (
      <div className={`min-h-screen transition-colors duration-300 font-sans p-4 flex items-center justify-center ${isDarkMode ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'}`}>
        <div className="max-w-md w-full bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] shadow-sm rounded-2xl p-8 text-center animate-fade-in-up">
          <div className="flex justify-center mb-6"><div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl text-yellow-600 dark:text-yellow-500"><Mail size={32} /></div></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Check Your Inbox</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-sm">We sent a secure verification link to <br/><span className="font-bold text-gray-900 dark:text-gray-200">{currentUser.email}</span>. <br/><br/>Please click the link to verify your account.</p>
          <div className="space-y-3">
            <button onClick={() => window.location.reload()} className="w-full py-2.5 rounded-lg font-semibold text-white transition-colors bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500">I've Verified My Email</button>
            <button onClick={handleLogout} className="w-full py-2.5 rounded-lg font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-[#30363d] hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors">Log Out</button>
          </div>
        </div>
      </div>
    );
  }

  const userName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Student';

  // THEME VARIABLES
  const cardClass = "bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl shadow-sm";
  const primaryColor = isDarkMode ? '#3b82f6' : '#2563eb'; // blue-500 : blue-600

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans p-4 sm:p-8 flex items-center justify-center
      ${isDarkMode ? 'bg-[#0d1117] text-gray-200' : 'bg-[#f6f8fa] text-gray-900'}`}>
      
      <div className="max-w-7xl w-full mx-auto animate-fade-in-up">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-200 dark:border-[#30363d]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-lg text-white"><BrainCircuit size={24} /></div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                Performance Predictor
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-[#30363d] bg-white dark:bg-[#21262d] hover:bg-gray-50 dark:hover:bg-[#30363d] transition-colors text-gray-700 dark:text-gray-300">Log Out</button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-md border border-gray-300 dark:border-[#30363d] bg-white dark:bg-[#21262d] hover:bg-gray-50 dark:hover:bg-[#30363d] transition-colors text-gray-700 dark:text-gray-300">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-7 flex flex-col gap-6 h-full">
            <div className={`${cardClass} p-6 sm:p-8 flex-grow flex flex-col`}>
              <form onSubmit={handleSubmit} className="space-y-8 h-full flex flex-col">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2 flex-grow">
                  <SliderField label="Attendance (%)" name="Attendance" value={formData.Attendance} onChange={handleChange} min={0} max={100} isDark={isDarkMode} />
                  <SliderField label="Stress Level (0-10)" name="Stress_Level" value={formData.Stress_Level} onChange={handleChange} min={0} max={10} isDark={isDarkMode} />
                </div>
                
                <div className="pt-4 mt-auto">
                  <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg font-semibold text-sm text-white transition-colors flex justify-center items-center gap-2 ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 dark:bg-green-600 dark:hover:bg-green-500'}`}>
                    {loading ? <span className="animate-pulse">Analyzing Data...</span> : <>Predict Future Performance</>}
                  </button>
                  {error && <p className="text-red-600 dark:text-red-400 text-sm text-center font-medium mt-3">{error}</p>}
                </div>
              </form>
            </div>

            {/* Graphs Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-auto">
              <div className={`${cardClass} p-5`}>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">Class Comparison</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <XAxis dataKey="subject" tick={{ fill: isDarkMode ? '#8b949e' : '#6e7781', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: isDarkMode ? '#8b949e' : '#6e7781', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: isDarkMode ? '#21262d' : '#f3f4f6' }} contentStyle={{ backgroundColor: isDarkMode ? '#161b22' : '#ffffff', borderRadius: '8px', border: `1px solid ${isDarkMode ? '#30363d' : '#e5e7eb'}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }}/>
                      <Bar dataKey="Student" fill={primaryColor} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Average" fill={isDarkMode ? '#30363d' : '#e5e7eb'} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`${cardClass} p-5`}>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">Profile Shape</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke={isDarkMode ? '#30363d' : '#e5e7eb'} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: isDarkMode ? '#8b949e' : '#6e7781', fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Score" dataKey="value" stroke={primaryColor} fill={primaryColor} fillOpacity={0.3} />
                      <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#161b22' : '#ffffff', borderRadius: '8px', border: `1px solid ${isDarkMode ? '#30363d' : '#e5e7eb'}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-5 flex flex-col gap-6 h-full" ref={reportRef}>
            
            <div className={`${cardClass} p-4 flex justify-between items-center`}>
               <div>
                 <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                   <Award className="text-blue-600 dark:text-blue-500 w-4 h-4" /> Performance Report
                 </h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-6">
                   Student: <span className="text-gray-900 dark:text-gray-200 font-medium">{userName}</span>
                 </p>
               </div>
               
               {prediction !== null && (
                 <button onClick={handleDownloadPDF} disabled={isDownloading} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors ${isDownloading ? 'bg-gray-100 dark:bg-[#21262d] text-gray-400 cursor-not-allowed border-transparent' : 'bg-white dark:bg-[#21262d] border-gray-300 dark:border-[#30363d] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#30363d]'}`}>
                   {isDownloading ? <span className="animate-pulse">Generating...</span> : <><Download size={14} /> PDF</>}
                 </button>
               )}
            </div>

            {/* PREDICTION SCORE CARD */}
            <div className={`${cardClass} p-8 flex flex-col items-center justify-center flex-grow`}>
              {prediction !== null ? (
                <div className="relative flex items-center justify-center animate-fade-in-up">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100 dark:text-[#21262d]" />
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="440" strokeDashoffset={440 - (prediction / 100) * 440} strokeLinecap="round" className={`transition-all duration-1500 ease-out ${prediction >= 80 ? 'text-green-500' : prediction >= 60 ? 'text-yellow-500' : 'text-red-500'}`} />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">{prediction.toFixed(1)}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1 uppercase tracking-widest">Score</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 dark:text-gray-600 flex flex-col items-center">
                  <div className="w-32 h-32 border-4 border-dashed border-gray-200 dark:border-[#30363d] rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]">
                    <BrainCircuit size={32} className="opacity-50" />
                  </div>
                  <p className="mt-4 text-sm font-medium">Awaiting Input Data</p>
                </div>
              )}
            </div>

            {/* AI Action Plan - ALWAYS VISIBLE, FIXED HEIGHT */}
            <div className={`${cardClass} p-5 flex flex-col h-[280px] min-h-[280px]`}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2 shrink-0">
                <Lightbulb className={prediction !== null ? "text-yellow-500 w-4 h-4" : "text-gray-400 dark:text-gray-600 w-4 h-4"} /> Action Plan
              </h3>
              
              {prediction !== null ? (
                <div className="flex-grow overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: isDarkMode ? '#4b5563 transparent' : '#d1d5db transparent' }}>
                  <ul className="space-y-2">
                    {insights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300 p-2.5 rounded-lg border border-gray-100 dark:border-[#30363d] bg-gray-50/50 dark:bg-[#21262d]/50">
                        <span className="text-blue-500 font-bold mt-0.5 shrink-0">→</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-[#30363d] rounded-lg bg-gray-50/50 dark:bg-[#0d1117]/50">
                   <p className="text-sm">Run prediction to generate plan.</p>
                </div>
              )}
            </div>

            {/* AI CHAT ASSISTANT - ALWAYS VISIBLE */}
            <div className={`${cardClass} p-5 flex flex-col`}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <MessageSquare className={prediction !== null ? "text-blue-500 w-4 h-4" : "text-gray-400 dark:text-gray-600 w-4 h-4"} /> AI Advisor
              </h3>
              
              {prediction !== null ? (
                <>
                  <div className="bg-gray-50 dark:bg-[#0d1117] rounded-lg p-3 flex flex-col h-[160px] min-h-[160px] max-h-[160px] overflow-y-auto mb-3 border border-gray-200 dark:border-[#30363d]" style={{ scrollbarWidth: 'thin' }}>
                    {chatHistory.length === 0 ? (
                      <div className="m-auto text-xs text-gray-500 dark:text-gray-400 text-center">
                        Ask a question about your metrics.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {chatHistory.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`text-xs px-3 py-2 rounded-lg max-w-[85%] ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-[#21262d] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#30363d]'}`}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        {isChatLoading && (
                           <div className="flex justify-start">
                             <div className="text-xs px-3 py-2 rounded-lg bg-white dark:bg-[#21262d] text-gray-500 border border-gray-200 dark:border-[#30363d] animate-pulse">
                               Thinking...
                             </div>
                           </div>
                        )}
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleChatSubmit} className="relative mt-auto">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={`Improve ${formData.Branch} grades?`} 
                      className={`w-full pl-3 pr-10 py-2.5 rounded-lg border text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${isDarkMode ? 'bg-[#0d1117] border-[#30363d] text-gray-200 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                      disabled={isChatLoading}
                    />
                    <button 
                      type="submit" 
                      disabled={isChatLoading || !chatInput.trim()}
                      className="absolute right-1.5 top-1.5 p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center justify-center h-[160px] min-h-[160px] max-h-[160px] text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-[#30363d] rounded-lg mb-3 bg-gray-50/50 dark:bg-[#0d1117]/50">
                    <MessageSquare size={24} className="mb-2 opacity-50" />
                    <p className="text-xs px-4 text-center">Predict to unlock Chat.</p>
                  </div>
                  <div className="relative mt-auto">
                    <input type="text" disabled placeholder="Disabled" className={`w-full pl-3 pr-10 py-2.5 rounded-lg border text-sm outline-none cursor-not-allowed ${isDarkMode ? 'bg-[#21262d]/50 border-[#30363d] text-gray-600' : 'bg-gray-100 border-gray-200 text-gray-400'}`} />
                    <button disabled className="absolute right-1.5 top-1.5 p-1.5 rounded-md bg-gray-300 dark:bg-[#30363d] text-gray-500 transition-colors opacity-50 cursor-not-allowed"><Send size={14} /></button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
        
        <footer className="col-span-full w-full mt-12 pt-6 pb-8 border-t border-gray-200 dark:border-[#30363d] text-center">
          <p className="text-gray-500 dark:text-gray-400 text-xs">
            Designed & Built by <span className="font-semibold text-gray-900 dark:text-gray-200">Aaditya Jaysawal</span>
          </p>
        </footer>
      </div>
    </div>
  );
};

// --- REUSABLE COMPONENTS ---
const Section = ({ title, children, isDark }) => (
  <div>
    <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 pb-2 border-b ${isDark ? 'text-gray-400 border-[#30363d]' : 'text-gray-500 border-gray-200'}`}>{title}</h3>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
  </div>
);

const InputField = ({ label, name, value, onChange, isDark, min, max }) => (
  <div className="flex flex-col">
    <label className={`text-xs font-medium mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>
    <input type="number" name={name} value={value} onChange={onChange} min={min} max={max} className={`w-full p-2.5 rounded-lg border text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${isDark ? 'bg-[#0d1117] border-[#30363d] text-gray-200 placeholder-gray-600' : 'bg-gray-50 border-gray-300 text-gray-900'}`} />
  </div>
);

const SelectField = ({ label, name, value, onChange, options, isDark }) => (
  <div className="flex flex-col">
    <label className={`text-xs font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>
    <select name={name} value={value} onChange={onChange} className={`w-full p-2.5 rounded-lg border text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors appearance-none cursor-pointer ${isDark ? 'bg-[#0d1117] border-[#30363d] text-gray-200' : 'bg-gray-50 border-gray-300 text-gray-900'}`}>
      {options.map(opt => <option key={opt} value={opt} className={isDark ? "bg-[#161b22]" : ""}>{opt}</option>)}
    </select>
  </div>
);

const SliderField = ({ label, name, value, onChange, min, max, isDark }) => (
  <div className="flex flex-col">
    <div className="flex justify-between items-center mb-2">
      <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>
      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${isDark ? 'bg-[#21262d] text-gray-300' : 'bg-gray-100 text-gray-700'}`}>{value}</span>
    </div>
    <input type="range" name={name} min={min} max={max} value={value} onChange={onChange} className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500 bg-gray-200 dark:bg-[#30363d]" />
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
      if (cleanError.includes('email-already-in-use')) cleanError = 'Email already registered.';
      if (cleanError.includes('invalid-credential')) cleanError = 'Incorrect email or password.';
      if (cleanError.includes('weak-password')) cleanError = 'Password must be at least 6 characters.';
      setAuthError(cleanError);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans p-4 flex items-center justify-center
      ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'}`}>
      
      <div className="absolute top-6 right-6">
        <button onClick={toggleTheme} className="p-2 rounded-md border border-gray-300 dark:border-[#30363d] bg-white dark:bg-[#21262d] hover:bg-gray-50 dark:hover:bg-[#30363d] transition-colors text-gray-700 dark:text-gray-300">
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="w-full max-w-sm bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] shadow-sm rounded-2xl p-8 relative animate-fade-in-up">
        
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-blue-600 rounded-lg text-white">
            <BrainCircuit size={32} />
          </div>
        </div>
        
        <h2 className="text-xl font-semibold text-center mb-2 text-gray-900 dark:text-gray-100">
          {isLoginView ? 'Sign in to Predictor' : 'Create an account'}
        </h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-6 text-sm">
          {isLoginView ? 'Welcome back.' : 'Join to analyze performance.'}
        </p>

        {authError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-center text-sm font-medium text-red-600 dark:text-red-400">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {!isLoginView && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
              <input type="text" required
                value={name} onChange={(e) => setName(e.target.value)}
                className={`w-full p-2.5 rounded-lg border text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors
                  ${isDark ? 'bg-[#0d1117] border-[#30363d] text-gray-200' : 'bg-gray-50 border-gray-300 text-gray-900'}`} />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
            <input type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className={`w-full p-2.5 rounded-lg border text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors
                ${isDark ? 'bg-[#0d1117] border-[#30363d] text-gray-200' : 'bg-gray-50 border-gray-300 text-gray-900'}`} />
          </div>

          <div>
             <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
            <input type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className={`w-full p-2.5 rounded-lg border text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors
                ${isDark ? 'bg-[#0d1117] border-[#30363d] text-gray-200' : 'bg-gray-50 border-gray-300 text-gray-900'}`} />
          </div>

          <button type="submit" disabled={authLoading}
            className={`w-full py-2.5 mt-2 rounded-lg font-semibold text-sm text-white transition-colors flex justify-center items-center gap-2
              ${authLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-[#1f883d] hover:bg-[#1a7f37] dark:bg-[#238636] dark:hover:bg-[#2ea043]'}`}
          >
            {authLoading ? <span className="animate-pulse">Loading...</span> : <>{isLoginView ? 'Sign in' : 'Sign up'}</>}
          </button>
        </form>

        <div className="mt-6 p-4 border border-gray-200 dark:border-[#30363d] rounded-lg text-center text-sm text-gray-600 dark:text-gray-400">
          {isLoginView ? "New to Predictor? " : "Already have an account? "}
          <button type="button" onClick={() => { setIsLoginView(!isLoginView); setAuthError(''); }} className="text-blue-600 dark:text-blue-500 font-medium hover:underline">
            {isLoginView ? 'Create an account' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;