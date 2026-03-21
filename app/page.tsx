// app/page.tsx
'use client';
import { useState, useEffect, useMemo } from 'react';
import { Check, X, Plus, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { saveToGithub } from '@/lib/github';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
  // 页面加载时实时获取最新数据，加上时间戳防止浏览器缓存
  fetch(`https://raw.githubusercontent.com/${process.env.NEXT_PUBLIC_REPO_OWNER}/${process.env.NEXT_PUBLIC_REPO_NAME}/main/data/database.json?t=${Date.now()}`)
    .then(res => res.json())
    .then(data => setTasks(data.tasks))
    .catch(err => console.error("Failed to load initial data", err));
}, []);

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const completionPercentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // 触发保存到 GitHub
  const syncData = async (updatedTasks: any) => {
    setIsSyncing(true);
    const success = await saveToGithub({ tasks: updatedTasks, weeklyStats: initialData.weeklyStats });
    if (!success) alert("Sync failed. Check your GitHub Token permissions.");
    setIsSyncing(false);
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const newTasks = [...tasks, { id: Date.now().toString(), text: newTaskText, completed: false }];
    setTasks(newTasks);
    setNewTaskText('');
    syncData(newTasks);
  };

  const toggleTask = (id: string) => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(newTasks);
    syncData(newTasks);
  };

  const deleteTask = (id: string) => {
    const newTasks = tasks.filter(t => t.id !== id);
    setTasks(newTasks);
    syncData(newTasks);
  };

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
              <div 
                className="bg-[#8A9A8B] h-full transition-all duration-500 ease-out" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            {isSyncing && <div className="text-xs text-gray-400 mt-2 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Syncing to Repo...</div>}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Daily Focus - 占据左侧和中间 */}
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
                  <LineChart data={initialData.weeklyStats} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
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

          {/* Yearly Archive - 占据右侧 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-medium mb-4 text-gray-700">Yearly Archive</h2>
            <div className="flex flex-wrap gap-2">
              {['Mar 19, 2026', 'Mar 18, 2026', 'Mar 17, 2026'].map((date) => (
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
