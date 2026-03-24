import json
import os
from datetime import datetime, timedelta

# 获取服务器上的当前日期（转换为本地习惯格式）
today = datetime.utcnow() + timedelta(hours=8) # 假设你主要在北京/新加坡时间活跃
today_name = today.strftime('%a') # 例如 'Tue'
today_date_str = today.strftime('%b %d, %Y') # 例如 'Mar 24, 2026'

FILE_PATH = 'data/database.json'

def run_archive():
    # 1. 加载当前数据库
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 2. 计算今天的总完成率
    tasks = data.get('tasks', [])
    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.get('completed', False))
    completion_rate = round((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0

    # 3. 更新折线图数据（踢掉最旧的一天，加入今天）
    weekly_stats = data.get('weeklyStats', [])
    if len(weekly_stats) >= 7:
        weekly_stats.pop(0) 
    weekly_stats.append({"name": today_name, "completion": completion_rate})
    data['weeklyStats'] = weekly_stats

    # 4. 更新 Yearly Archive 归档列表
    archives = data.get('archives', [])
    if today_date_str not in archives:
        archives.insert(0, today_date_str) # 把今天的日期加到列表最前面
    data['archives'] = archives

    # 5. 重置第二天的任务
    # 逻辑：自动清理掉已经打勾完成的，保留没完成的让你明天接着做
    new_tasks = [t for t in tasks if not t.get('completed', False)]
    data['tasks'] = new_tasks

    # 6. 保存覆盖回 JSON
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Archive completed for {today_date_str}. Completion rate: {completion_rate}%")

if __name__ == "__main__":
    run_archive()
