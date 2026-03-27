import json
import os
from datetime import datetime, timedelta

# 获取当前的东八区时间作为“今天”
new_today = datetime.utcnow() + timedelta(hours=8)

# 真正的“昨天”，永远比“今天”少 1 天，无论几点触发
target_date = new_today - timedelta(days=1)

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

    # 1. 彻底固定周一到周日的数组结构
    weekly_stats = data.get('weeklyStats', [])
    default_stats = [
        {"name": "Mon", "completion": 0}, {"name": "Tue", "completion": 0},
        {"name": "Wed", "completion": 0}, {"name": "Thu", "completion": 0},
        {"name": "Fri", "completion": 0}, {"name": "Sat", "completion": 0},
        {"name": "Sun", "completion": 0}
    ]
    
    # 强制校验：如果顺序乱了，直接重置为标准模板
    if len(weekly_stats) != 7 or weekly_stats[0].get("name") != "Mon":
        weekly_stats = default_stats

    # 2. 结算昨天的任务完成率，填入对应的星期格子
    for stat in weekly_stats:
        if stat.get("name") == target_name:
            stat["completion"] = completion_rate
            break
            
    # 3. 🌟 核心逻辑：如果跨入了周一，图表全部清零，迎接新的一周！
    if new_today_name == 'Mon':
        weekly_stats = [
            {"name": "Mon", "completion": 0}, {"name": "Tue", "completion": 0},
            {"name": "Wed", "completion": 0}, {"name": "Thu", "completion": 0},
            {"name": "Fri", "completion": 0}, {"name": "Sat", "completion": 0},
            {"name": "Sun", "completion": 0}
        ]

    data['weeklyStats'] = weekly_stats

    # 4. 归档昨天的任务明细 (保持不变)
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

    # 5. 清空看板留给今天
    new_tasks = [t for t in tasks if not t.get('completed', False)]
    data['tasks'] = new_tasks

    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ 归档 {target_date_str}！昨日完成率: {completion_rate}%，周视图已更新。")

if __name__ == "__main__":
    run_archive()
