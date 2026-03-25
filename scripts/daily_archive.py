import json
import os
from datetime import datetime, timedelta

target_date = datetime.utcnow() + timedelta(hours=8) - timedelta(hours=1)
today_name = target_date.strftime('%a') 
today_date_str = target_date.strftime('%b %d, %Y') 

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

    # 2. 核心打包：存储今天的详细任务字典，并限制最近 7 天
    archives = data.get('archives', [])
    
    today_archive = {
        "date": today_date_str,
        "tasks": tasks
    }
    
    # 清理掉可能重复生成的当天数据
    archives = [a for a in archives if type(a) == dict and a.get("date") != today_date_str]
    
    # 插入最新数据到最前面
    archives.insert(0, today_archive)
    
    # 强制截断，只保留 7 天
    if len(archives) > 7:
        archives = archives[:7]
        
    data['archives'] = archives

    # 3. 清空明天的看板（只保留没打勾的任务）
    new_tasks = [t for t in tasks if not t.get('completed', False)]
    data['tasks'] = new_tasks

    # 覆写保存
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"成功归档 {today_date_str} 的数据！完成率: {completion_rate}%")

if __name__ == "__main__":
    run_archive()
