import json
import os
from datetime import datetime, timedelta

# 核心时间逻辑：真正的“昨天”永远比“今天”少 1 天，彻底解决时区与手动触发的错位 bug
new_today = datetime.utcnow() + timedelta(hours=8)
target_date = new_today - timedelta(days=1)

target_name = target_date.strftime('%a') 
new_today_name = new_today.strftime('%a')
target_date_str = target_date.strftime('%b %d, %Y') 

# 生成按月归档的永久文件名，例如 "2026-03"
history_month_str = target_date.strftime('%Y-%m')

FILE_PATH = 'data/database.json'
HISTORY_DIR = 'data/history'
HISTORY_FILE_PATH = f'{HISTORY_DIR}/{history_month_str}.json'

def run_archive():
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    tasks = data.get('tasks', [])
    total_tasks = len(tasks)
    
    completed_tasks = sum(1 for t in tasks if t.get('completed', False))
    completion_rate = round((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0

    # 1. 严格锁定：周一到周日的自然周图表
    weekly_stats = data.get('weeklyStats', [])
    default_stats = [
        {"name": "Mon", "completion": 0}, {"name": "Tue", "completion": 0},
        {"name": "Wed", "completion": 0}, {"name": "Thu", "completion": 0},
        {"name": "Fri", "completion": 0}, {"name": "Sat", "completion": 0},
        {"name": "Sun", "completion": 0}
    ]
    if len(weekly_stats) != 7 or weekly_stats[0].get("name") != "Mon":
        weekly_stats = default_stats

    # 填入昨天的结算率
    for stat in weekly_stats:
        if stat.get("name") == target_name:
            stat["completion"] = completion_rate
            break
            
    # 如果今天是周一，全部清零迎接新的一周
    if new_today_name == 'Mon':
        weekly_stats = default_stats

    data['weeklyStats'] = weekly_stats

    # 2. 生成归档的数据块
    target_archive = {
        "date": target_date_str,
        "completion_rate": completion_rate,
        "tasks": tasks
    }

    # 3. 处理前端展示的“热数据”（永远只保留最近 7 天，保证网页秒开）
    archives = data.get('archives', [])
    archives = [a for a in archives if type(a) == dict and a.get("date") != target_date_str]
    archives.insert(0, target_archive)
    if len(archives) > 7:
        archives = archives[:7]
    data['archives'] = archives

    # 4. 核心功能：写入永久保留的“冷数据”月度档案
    os.makedirs(HISTORY_DIR, exist_ok=True) 
    
    history_data = []
    if os.path.exists(HISTORY_FILE_PATH):
        with open(HISTORY_FILE_PATH, 'r', encoding='utf-8') as hf:
            try:
                history_data = json.load(hf)
            except json.JSONDecodeError:
                pass
                
    history_data = [h for h in history_data if h.get("date") != target_date_str]
    history_data.insert(0, target_archive) # 把昨天的记录推到本月档案的最上面
    
    with open(HISTORY_FILE_PATH, 'w', encoding='utf-8') as hf:
        json.dump(history_data, hf, indent=2, ensure_ascii=False)

    # 5. 清空看板留给今天未完成的任务
    new_tasks = [t for t in tasks if not t.get('completed', False)]
    data['tasks'] = new_tasks

    # 覆写保存 database.json
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ 归档成功！数据已同步至 {FILE_PATH} (7天热数据) 和 {HISTORY_FILE_PATH} (冷数据库)。")

if __name__ == "__main__":
    run_archive()
