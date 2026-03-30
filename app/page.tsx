'use client';
import { useState, useEffect } from 'react';
import { Check, X, Plus, RefreshCw, Archive as ArchiveIcon, Calendar, Loader2, Settings } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { saveToGithub, getHistoryMonths, getHistoryData } from '@/lib/github';

interface Task { id: string; text: string; completed: boolean; }
interface WeeklyStat { name: string; completion: number; }
interface Archive { date: string; completion_rate?: number; tasks: Task[]; }

const DEFAULT_WEEKLY_STATS: WeeklyStat[] = [
  { name: 'Mon', completion: 0 }, { name: 'Tue', completion: 0 },
  { name: 'Wed', completion: 0 }, { name: 'Thu', completion: 0 },
  { name: 'Fri', completion: 0 }, { name: 'Sat', completion: 0 }, { name: 'Sun', completion: 0 }
];

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>(DEFAULT_WEEKLY_STATS);
  const [archives, setArchives] = useState<Archive[]>([]);
  
  const [newTaskText, setNewTaskText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyMonths, setHistoryMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthData, setMonthData] = useState<Archive[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
    
    const fetchRealTimeData = async () => {
      try {
        const GITHUB_TOKEN = typeof window !== 'undefined' ? localStorage.getItem('GITHUB_PAT') : null;
        const REPO_OWNER = process.env.NEXT_PUBLIC_REPO_OWNER || 'iexplain';
        const REPO_NAME = process.env.NEXT_PUBLIC_REPO_NAME || 'Learning-Diary';
        
        const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json', 'Cache-Control': 'no-cache, no-store, must-revalidate' };
        if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

        // 🌟 添加时间戳强制粉碎 GitHub 的 CDN 读取缓存
        const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/database.json?t=${Date.now()}`, { headers });
        if (!res.ok) throw new Error(`API failed`);

        const fileData = await res.json();
        const cleanBase64 = fileData.content.replace(/\n/g, '');
        
        const decodeBase64 = (str: string) => {
          return decodeURIComponent(atob(str).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
        };
        const decodedContent = decodeBase64(cleanBase64);
        const data = JSON.parse(decodedContent);
        
        setTasks(data.tasks || []);
        setWeeklyStats(data.weeklyStats?.length === 7 ? data.weeklyStats : DEFAULT_WEEKLY_STATS);
        setArchives(data.archives || []);
        
      } catch (err) {
        const REPO_OWNER = process.env.NEXT_PUBLIC_REPO_OWNER || 'iexplain';
        const REPO_NAME = process.env.NEXT_PUBLIC_REPO_NAME || 'Learning-Diary';
        fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/data/database.json?t=${Date.now()}`)
          .then(res => res.json())
          .then(data => {
            setTasks(data.tasks || []);
            setWeeklyStats(data.weeklyStats?.length === 7 ? data.weeklyStats : DEFAULT_WEEKLY_STATS);
            setArchives(data.archives || []);
          })
          .catch(e => console.error("Load Error", e));
      }
    };
    fetchRealTimeData();
  }, []);

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const completionPercentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // 🌟 核心升级：带有“撤回功能”的同步函数
  const syncData = async (updatedTasks: Task[], updatedStats: WeeklyStat[], rollbackTasks: Task[], rollbackStats: WeeklyStat[]) => {
    setIsSyncing(true);
    const success = await saveToGithub({ tasks: updatedTasks, weeklyStats: updatedStats, archives: archives });
    setIsSyncing(false);
    
    // 如果后台拒绝了我们，立刻把界面倒退回刚才的样子，绝不留幻觉！
    if (!success) {
      setTasks(rollbackTasks);
      setWeeklyStats(rollbackStats);
    }
  };

  const handleUpdateTasks = (newTasks: Task[]) => {
    // 记住修改前的样子，留作备用撤回
    const oldTasks = [...tasks];
    const oldStats = [...weeklyStats];

    setTasks(newTasks);
    const newPercentage = newTasks.length === 0 ? 0 : Math.round((newTasks.filter(t => t.completed).length / newTasks.length) * 100);
    const todayShort = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    
    const newStats = weeklyStats.map(stat => 
      stat.name === todayShort ? { ...stat, completion: newPercentage } : stat
    );
    
    setWeeklyStats(newStats);
    
    // 把“如果失败用来撤回的数据”一并传过去
    syncData(newTasks, newStats, oldTasks, oldStats);
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const newTask = { id: Date.now().toString(), text: newTaskText, completed: false };
    const newTasks = [...tasks, newTask];
    setNewTaskText('');
    handleUpdateTasks(newTasks);
  };

  const toggleTask = (id: string) => handleUpdateTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteTask = (id: string) => handleUpdateTasks(tasks.filter(t => t.id !== id));

  const handleOpenHistory = async () => {
    setIsHistoryOpen(true);
    setIsLoadingHistory(true);
    const months = await getHistoryMonths();
    setHistoryMonths(months);
    if (months.length > 0) handleSelectMonth(months[0]);
    else setIsLoadingHistory(false);
  };

  const handleSelectMonth = async (month: string) => {
    setIsLoadingHistory(true);
    setSelectedMonth(month);
    const data = await getHistoryData(month);
    setMonthData(data);
    setIsLoadingHistory(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans relative">
      
      {isAdminPanelOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-6 transition-all">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-2">⚙️ Admin Gateway</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Inject your Personal Access Token (PAT) here. Ensure it has the full <b>repo</b> scope ticked.
            </p>
            <input 
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_................................"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8A9A8B] mb-6 text-sm font-mono"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAdminPanelOpen(false)} className="px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
              <button 
                onClick={() => {
                  if (tokenInput.trim()) {
                    localStorage.setItem('GITHUB_PAT', tokenInput.trim());
                    setIsAdminPanelOpen(false);
                    alert('✅ 密钥注入成功！请尝试添加任务。如果弹窗报错，说明密钥权限不足。');
                  }
                }} 
                className="px-5 py-2 text-sm font-medium bg-[#8A9A8B] text-white hover:bg-[#7A8A7B] rounded-xl shadow-sm transition-colors"
              >
                Inject Core
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 历史时光机弹窗 */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-50 p-6 transition-all">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <ArchiveIcon className="text-[#8A9A8B]" size={24} />
                <h2 className="text-xl font-semibold text-gray-800 tracking-tight">Time Machine Archive</h2>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-100 p-2 rounded-full transition-colors border border-gray-200 shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
              <div className="w-64 bg-gray-50/30 border-r border-gray-100 p-6 overflow-y-auto">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Timeline</h3>
                {historyMonths.length === 0 && !isLoadingHistory ? (
                  <p className="text-sm text-gray-400 px-2 italic">No history recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {historyMonths.map(month => (
                      <button 
                        key={month} 
                        onClick={() => handleSelectMonth(month)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedMonth === month ? 'bg-[#8A9A8B] text-white shadow-md' : 'text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200'}`}
                      >
                        <Calendar size={16} className={selectedMonth === month ? 'text-white/80' : 'text-gray-400'}/>
                        {month}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 bg-white p-8 overflow-y-auto relative">
                {isLoadingHistory ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-[#8A9A8B]">
                    <Loader2 size={32} className="animate-spin mb-4" />
                    <p className="text-sm font-medium">Decrypting history files...</p>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto space-y-10 pb-12">
                    {monthData.map((dayData, index) => (
                      <div key={index} className="relative pl-8 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-px before:bg-gray-200">
                        <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-[#8A9A8B] ring-4 ring-white" />
                        <div className="flex justify-between items-baseline mb-4">
                          <h4 className="text-lg font-semibold text-gray-800">{dayData.date}</h4>
                          <span className="text-xs font-bold px-3 py-1 bg-gray-100 text-[#8A9A8B] rounded-full">
                            {dayData.completion_rate ?? 0}% Achieved
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                          {dayData.tasks.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No tasks recorded on this day.</p>
                          ) : (
                            dayData.tasks.map(task => (
                              <div key={task.id} className="flex items-start gap-3 p-2">
                                <div className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border ${task.completed ? 'bg-[#8A9A8B] border-[#8A9A8B]' : 'border-gray-300 bg-white'}`}>
                                  {task.completed && <Check size={10} className="text-white" />}
                                </div>
                                <span className={`text-sm leading-relaxed ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                  {task.text}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主控制面板 */}
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">Learning Diary</h1>
              <button onClick={() => setIsAdminPanelOpen(true)} className="text-gray-300 hover:text-[#8A9A8B] transition-colors" title="Admin Control">
                <Settings size={18} />
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-1">{currentDate}</p>
          </div>
          <div className="flex flex-col items-end w-48">
            <div className="flex justify-between w-full text-sm mb-2 text-[#8A9A8B] font-medium">
              <span>{completionPercentage}% Complete</span>
              <span>{completedCount}/{totalCount} Tasks</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-[#8A9A8B] h-full transition-all duration-500 ease-out" style={{ width: `${completionPercentage}%` }}/>
            </div>
            {isSyncing && <div className="text-xs text-gray-400 mt-2 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Syncing...</div>}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-medium mb-4 text-gray-700">Daily Focus</h2>
              <div className="flex gap-3 mb-6">
                <input 
                  type="text" 
                  value={newTaskText} 
                  onChange={(e) => setNewTaskText(e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault(); 
                      addTask();
                    }
                  }}
                  placeholder="Enter your task here..." 
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8A9A8B] transition-all"
                />
                <button onClick={addTask} className="bg-[#8A9A8B] hover:bg-[#7A8A7B] text-white px-5 py-2 rounded-xl transition-colors flex items-center gap-2"><Plus size={18} /> Add</button>
              </div>
              <div className="space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className="group flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleTask(task.id)}>
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors ${task.completed ? 'bg-[#8A9A8B] border-[#8A9A8B]' : 'border-gray-300'}`}>
                        {task.completed && <Check size={14} className="text-white" />}
                      </div>
                      <span className={`transition-all ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.text}</span>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><X size={18} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-medium mb-4 text-gray-700">Weekly Analytics</h2>
              <div className="h-48 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyStats} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                    <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} tickFormatter={(value) => `${value}%`}/>
                    <Tooltip cursor={{stroke: '#f3f4f6', strokeWidth: 2}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                    <Line type="monotone" dataKey="completion" stroke="#8A9A8B" strokeWidth={3} dot={{r: 4, fill: '#8A9A8B', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
            <h2 className="text-lg font-medium mb-4 text-gray-700">Recent Archives</h2>
            <div className="flex flex-col gap-3 flex-1">
              {archives.map((archive) => {
                const dayCompleted = archive.tasks.filter(t => t.completed).length;
                const dayTotal = archive.tasks.length;
                const dayPercentage = archive.completion_rate ?? (dayTotal === 0 ? 0 : Math.round((dayCompleted / dayTotal) * 100));

                return (
                  <div key={archive.date} className="group relative inline-block">
                    <button className="w-full text-left px-4 py-2 bg-gray-50 group-hover:bg-[#8A9A8B] group-hover:text-white border border-gray-100 text-gray-500 text-sm rounded-full transition-all duration-300 cursor-default">
                      {archive.date}
                    </button>

                    <div className="absolute right-full top-0 mr-4 w-72 bg-white rounded-2xl shadow-xl border border-[#8A9A8B]/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-40 p-5 pointer-events-none transform translate-x-2 group-hover:translate-x-0">
                      <h3 className="text-sm font-semibold text-[#8A9A8B] mb-3">Tasks for {archive.date}</h3>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {archive.tasks.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No tasks recorded.</p>
                        ) : (
                          archive.tasks.map(task => (
                            <div key={task.id} className="flex items-start gap-3 p-2">
                              <div className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border ${task.completed ? 'bg-[#8A9A8B] border-[#8A9A8B]' : 'border-gray-300'}`}>
                                {task.completed && <Check size={10} className="text-white" />}
                              </div>
                              <span className={`text-xs leading-relaxed ${task.completed ? 'line-through text-[#8A9A8B]' : 'text-gray-600'}`}>
                                {task.text}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 text-right font-medium">
                        {dayPercentage}% Complete
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <button 
              onClick={handleOpenHistory}
              className="mt-6 w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-[#8A9A8B] border border-[#8A9A8B]/30 hover:bg-[#8A9A8B] hover:text-white rounded-xl transition-all shadow-sm"
            >
              <ArchiveIcon size={16} />
              Explore Time Machine
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
