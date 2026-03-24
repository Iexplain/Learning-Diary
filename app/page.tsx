'use client';
import { useState, useEffect } from 'react';
import { Check, X, Plus, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { saveToGithub } from '@/lib/github';

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface WeeklyStat {
  name: string;
  completion: number;
}

interface Archive {
  date: string;
  tasks: Task[];
}

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

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
    
    const fetchRealTimeData = async () => {
      try {
        const GITHUB_TOKEN = typeof window !== 'undefined' ? localStorage.getItem('GITHUB_PAT') : null;
        const headers: HeadersInit = {
          'Accept': 'application/vnd.github.v3+json',
          'Cache-Control': 'no-cache'
        };
        if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

        const res = await fetch(`https://api.github.com/repos/${process.env.NEXT_PUBLIC_REPO_OWNER}/${process.env.NEXT_PUBLIC_REPO_NAME}/contents/data/database.json`, { headers });
        if (!res.ok) throw new Error(`API failed`);

        const fileData = await res.json();
        const cleanBase64 = fileData.content.replace(/\n/g, '');
        const decodedContent = decodeURIComponent(escape(atob(cleanBase64)));
        const data = JSON.parse(decodedContent);
        
        setTasks(data.tasks || []);
        setWeeklyStats(data.weeklyStats?.length > 0 ? data.weeklyStats : DEFAULT_WEEKLY_STATS);
        setArchives(data.archives || []);
        
      } catch (err) {
        fetch(`https://raw.githubusercontent.com/${process.env.NEXT_PUBLIC_REPO_OWNER}/${process.env.NEXT_PUBLIC_REPO_NAME}/main/data/database.json?t=${Date.now()}`)
          .then(res => res.json())
          .then(data => {
            setTasks(data.tasks || []);
            setWeeklyStats(data.weeklyStats?.length > 0 ? data.weeklyStats : DEFAULT_WEEKLY_STATS);
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

  const syncData = async (updatedTasks: Task[], updatedStats: WeeklyStat[]) => {
    setIsSyncing(true);
    await saveToGithub({ tasks: updatedTasks, weeklyStats: updatedStats, archives: archives });
    setIsSyncing(false);
  };

  const handleUpdateTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    const newPercentage = newTasks.length === 0 ? 0 : Math.round((newTasks.filter(t => t.completed).length / newTasks.length) * 100);
    const todayShort = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    const newStats = weeklyStats.map(stat => stat.name === todayShort ? { ...stat, completion: newPercentage } : stat);
    setWeeklyStats(newStats);
    syncData(newTasks, newStats);
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    handleUpdateTasks([...tasks, { id: Date.now().toString(), text: newTaskText, completed: false }]);
    setNewTaskText('');
  };

  const toggleTask = (id: string) => handleUpdateTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteTask = (id: string) => handleUpdateTasks(tasks.filter(t => t.id !== id));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Lin An's Digital Space</h1>
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
          
          {/* 左侧：Daily Focus & Analytics */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-medium mb-4 text-gray-700">Daily Focus</h2>
              <div className="flex gap-3 mb-6">
                <input 
                  type="text" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addTask()}
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

          {/* 右侧：具有悬浮交互的 Yearly Archive */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-medium mb-4 text-gray-700">Recent Archives</h2>
            <div className="flex flex-col gap-3">
              {archives.map((archive) => {
                const dayCompleted = archive.tasks.filter(t => t.completed).length;
                const dayTotal = archive.tasks.length;
                const dayPercentage = dayTotal === 0 ? 0 : Math.round((dayCompleted / dayTotal) * 100);

                return (
                  <div key={archive.date} className="group relative inline-block">
                    {/* 触发器：日期按钮 */}
                    <button className="w-full text-left px-4 py-2 bg-gray-50 group-hover:bg-[#8A9A8B] group-hover:text-white border border-gray-100 text-gray-500 text-sm rounded-full transition-all duration-300 cursor-default">
                      {archive.date}
                    </button>

                    {/* 悬浮弹窗 (Popover) */}
                    <div className="absolute right-full top-0 mr-4 w-72 bg-white rounded-2xl shadow-xl border border-[#8A9A8B]/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 p-5 pointer-events-none transform translate-x-2 group-hover:translate-x-0">
                      <h3 className="text-sm font-semibold text-[#8A9A8B] mb-3">Tasks for {archive.date}</h3>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {archive.tasks.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No tasks recorded.</p>
                        ) : (
                          archive.tasks.map(task => (
                            <div key={task.id} className="flex items-start gap-3">
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
          </div>

        </div>
      </div>
    </div>
  );
}
