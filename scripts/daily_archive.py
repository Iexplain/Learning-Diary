import json
import os
from datetime import datetime, timedelta

# 获取当前的东八区时间
today = datetime.utcnow() + timedelta(hours=8)
today_name = today.strftime('%a') 
today_date_str = today.strftime('%b %d, %Y') 

FILE_PATH = 'data/database.json'

def run_archive():
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    tasks = data.get('tasks', [])
    total_tasks = len(tasks)
    
    completed_tasks = sum(1 for t in tasks if t.get('completed', False))
    completion_rate = round((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0

    # 1. 更新折线图
    weekly_stats = data.get('weeklyStats', [])
    if len(weekly_stats) >= 7:
        weekly_stats.pop(0) 
    weekly_stats.append({"name": today_name, "completion": completion_rate})
    data['weeklyStats'] = weekly_stats

    # 2. 核心修改：打包保存今天的详细任务，并仅保留近 7 天
    archives = data.get('archives', [])
    
    today_archive = {
        "date": today_date_str,
        "tasks": tasks # 把今天所有的任务（包含已完成和未完成）存起来
    }
    
    # 剔除可能重复的今天的数据
    archives = [a for a in archives if type(a) == dict and a.get("date") != today_date_str]
    
    archives.insert(0, today_archive)
    
    # 限制归档长度为 7 天
    if len(archives) > 7:
        archives = archives[:7]
        
    data['archives'] = archives

    # 3. 清理已完成任务
    new_tasks = [t for t in tasks if not t.get('completed', False)]
    data['tasks'] = new_tasks

    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ 成功清算 {today_date_str} 的数据！今日完成率: {completion_rate}%")

if __name__ == "__main__":
    run_archive()
