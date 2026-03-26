import json
import os
from datetime import datetime, timedelta

# target_date 是我们要结算的“昨天”
target_date = datetime.utcnow() + timedelta(hours=8) - timedelta(hours=1)
# new_today 是已经迈入的“今天”
new_today = datetime.utcnow() + timedelta(hours=8)

target_name = target_date.strftime('%a') 
new_today_name = new_today.strftime('%a')
target_date_str = target_date.strftime('%b %d, %Y') 

FILE_PATH = 'data/database.json'

def run_archive():
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    tasks = data.get('tasks', [])
    total_tasks = len(tasks)
    
    completed_tasks = sum(1 for t in tasks if t.get('completed', False))
    completion_rate = round((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0

    # 1. 修复：彻底重构折线图逻辑
    weekly_stats = data.get('weeklyStats', [])
    
    # 步骤A：结算昨天的最终完成率（从后往前找，防止名字重复导致改错）
    for stat in reversed(weekly_stats):
        if stat.get("name") == target_name:
            stat["completion"] = completion_rate
            break
            
    # 步骤B：为今天创建一个全新的起点 (0%)，让前端有目标可以更新
    if not weekly_stats or weekly_stats[-1].get("name") != new_today_name:
        weekly_stats.append({"name": new_today_name, "completion": 0})
        
    # 步骤C：永远只保留最近的 7 天，实现完美的滑动窗口
    data['weeklyStats'] = weekly_stats[-7:]

    # 2. 归档昨天的任务明细
    archives = data.get('archives', [])
    target_archive = {
        "date": target_date_str,
        "tasks": tasks
    }
    
    archives = [a for a in archives if type(a) == dict and a.get("date") != target_date_str]
    archives.insert(0, target_archive)
    
    if len(archives) > 7:
        archives = archives[:7]
        
    data['archives'] = archives

    # 3. 清空看板（只保留没打勾的任务给今天）
    new_tasks = [t for t in tasks if not t.get('completed', False)]
    data['tasks'] = new_tasks

    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ 成功归档 {target_date_str}！昨日完成率: {completion_rate}%，已为 {new_today_name} 初始化图表。")

if __name__ == "__main__":
    run_archive()
