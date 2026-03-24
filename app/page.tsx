// app/page.tsx
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

// 防线：健康的默认数据模板，防止图表因空数组而崩溃消失
const DEFAULT_WEEKLY_STATS: WeeklyStat[] = [
  { name: 'Mon', completion: 0 },
  { name: 'Tue', completion: 0 },
  { name: 'Wed', completion: 0 },
  { name: 'Thu', completion: 0 },
  { name: 'Fri', completion: 0 },
  { name: 'Sat', completion: 0 },
  { name: 'Sun', completion: 0 }
];

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  // 初始化时就带上模板，以防万一
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>(DEFAULT_WEEKLY_STATS);
  
  const [newTaskText, setNewTaskText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
    
    // 核心改进：双保险拉取实时数据
    const fetchRealTimeData = async () => {
      try {
        const GITHUB_TOKEN = typeof window !== 'undefined' ? localStorage.getItem('GITHUB_PAT') : null;
        const headers: HeadersInit = {
          'Accept': 'application/vnd.github.v3+json',
          'Cache-Control': 'no-cache' // 强烈要求不使用缓存
        };
        if (GITHUB_TOKEN) {
          headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
        }

        // 优先请求 GitHub 实时 API
        const res = await fetch(`https://api.github.com/repos/${process.env.NEXT_PUBLIC_REPO_OWNER}/${process.env.NEXT_PUBLIC_REPO_NAME}/contents/data/database.json`, { headers });
        
        if (!res.ok) throw new Error(`API failed with status ${res.status}`);

        const fileData = await res.json();
        
        // 清理 Base64 中的换行符并解码
        const cleanBase64 = fileData.content.replace(/\n/g, '');
        const decodedContent = decodeURIComponent(escape(atob(cleanBase64)));
        const data = JSON.parse(decodedContent);
        
        setTasks(data.tasks || []);
        // 判断如果云端数据丢失，则使用健康模板
        setWeeklyStats(data.weeklyStats?.length > 0 ? data.weeklyStats : DEFAULT_WEEKLY_STATS);
        
      } catch (err) {
        console.warn("Real-time API failed, automatically falling back to CDN...", err);
        
        // 降级方案：如果 API 失败（如频次超限），回退到 CDN
        fetch(`https://raw.githubusercontent.com/${process.env.NEXT_PUBLIC_REPO_OWNER}/${process.env.NEXT_PUBLIC_REPO_NAME}/main/data/database.json?t=${Date.now()}`)
          .then(res => res.json())
          .then(data => {
            setTasks(data.tasks || []);
            setWeeklyStats(data.weeklyStats?.length > 0 ? data.weeklyStats : DEFAULT_WEEKLY_STATS);
          })
          .catch(fallbackErr => console.error("Fatal: Both API and CDN failed to load data", fallbackErr));
      }
    };

    fetchRealTimeData();
  }, []);

  // 顶部进度条数据计算
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const completionPercentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // 触发保存到 GitHub
  const syncData = async (updatedTasks: Task[], updatedStats: WeeklyStat[]) => {
    setIsSyncing(true);
    const success = await saveToGithub({ tasks: updatedTasks, weeklyStats: updatedStats });
    if (!success) alert("Sync failed. Check your network or GitHub Token permissions.");
    setIsSyncing(false);
  };

  // 统一的数据更新和自动统计管道
  const handleUpdateTasks = (newTasks: Task[]) => {
    setTasks(newTasks);

    // 重新计算当天的完成率
    const newCompletedCount = newTasks.filter(t => t.completed).length;
    const newTotalCount = newTasks.length;
    const newPercentage = newTotalCount === 0 ? 0 : Math.round((newCompletedCount / newTotalCount) * 100);

    // 获取今天是星期几（如 "Mon", "Tue"）
    const todayShort = new Date().toLocaleDateString('en-US', { weekday: 'short' });

    // 更新图表数据
    const newStats = weeklyStats.map(stat => 
      stat.name === todayShort ? { ...stat, completion: newPercentage } : stat
    );

    setWeeklyStats(newStats);
    syncData(newTasks, newStats);
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const newTasks = [...tasks, { id: Date.now().toString(), text: newTaskText, completed: false }];
    setNewTaskText('');
    handleUpdateTasks(newTasks);
  };

  const toggleTask = (id: string) => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    handleUpdateTasks(newTasks);
  };

  const deleteTask = (id: string) => {
    const newTasks = tasks.filter(t => t.id !== id);
    handleUpdateTasks(newTasks);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Learning Diary</h1>
            <p className="text-gray-400 text-sm mt-1">{currentDate}</p>
          </div>
          <div className="flex flex-col items-end w-48">
            <div className="flex justify-between w-full text-sm mb-2 text-[#8A9A8B] font-medium">
              <span>{completionPercentage}% Complete</span>
              <span>{completedCount}/{totalCount} Tasks</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-[#8A9A8B] h-full transition-all duration-500 ease-out" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            {isSyncing && <div className="text-xs text-gray-400 mt-2 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Syncing to Repo...</div>}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Daily Focus */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-medium mb-4 text-gray-700">Daily Focus</h2>
              
              <div className="flex gap-3 mb-6">
                <input 
                  type="text" 
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTask()}
                  placeholder="Enter your task here..." 
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8A9A8B] focus:ring-1 focus:ring-[#8A9A8B] transition-all"
                />
                <button 
                  onClick={addTask}
                  className="bg-[#8A9A8B] hover:bg-[#7A8A7B] text-white px-5 py-2 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Plus size={18} /> Add
                </button>
              </div>

              <div className="space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className="group flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleTask(task.id)}>
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors ${task.completed ? 'bg-[#8A9A8B] border-[#8A9A8B]' : 'border-gray-300'}`}>
                        {task.completed && <Check size={14} className="text-white" />}
                      </div>
                      <span className={`transition-all ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {task.text}
                      </span>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Analytics */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-medium mb-4 text-gray-700">Weekly Analytics</h2>
              <div className="h-48 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyStats} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                    <YAxis 
                      domain={[0, 100]} 
                      ticks={[0, 20, 40, 60, 80, 100]} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#9CA3AF', fontSize: 12}} 
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip cursor={{stroke: '#f3f4f6', strokeWidth: 2}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                    <Line type="monotone" dataKey="completion" stroke="#8A9A8B" strokeWidth={3} dot={{r: 4, fill: '#8A9A8B', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Yearly Archive */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-medium mb-4 text-gray-700">Yearly Archive</h2>
            <div className="flex flex-wrap gap-2">
              {(initialData.archives || []).map((date) => (
                <a key={date} href="#" className="px-4 py-2 bg-gray-50 hover:bg-[#8A9A8B] hover:text-white border border-gray-100 text-gray-500 text-sm rounded-full transition-colors cursor-pointer">
                  {date}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
