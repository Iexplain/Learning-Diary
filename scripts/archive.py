import os
import requests
import datetime

def main():
    # 1. 获取 GitHub Actions 注入的环境变量
    TOKEN = os.getenv('GITHUB_TOKEN')
    REPO = os.getenv('GITHUB_REPOSITORY')

    if not TOKEN or not REPO:
        print("错误: 找不到 GITHUB_TOKEN 或 GITHUB_REPOSITORY 环境变量。")
        return

    headers = {
        'Authorization': f'token {TOKEN}',
        'Accept': 'application/vnd.github.v3+json'
    }

    # 2. 获取当前日期 (处理时区：GitHub 服务器是 UTC，这里加 8 小时转换为东八区时间)
    now = datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    date_str = now.strftime('%Y-%m-%d')

    # 将当天的起点设为 00:00:00，并转回 UTC 供 API 查询
    start_of_day_local = datetime.datetime(now.year, now.month, now.day)
    start_of_day_utc = start_of_day_local - datetime.timedelta(hours=8)
    since_str = start_of_day_utc.strftime('%Y-%m-%dT%H:%M:%SZ')

    print(f"正在拉取 {date_str} (自 {since_str} 起) 完成的任务...")

    # 3. 拉取今天关闭的带有 daily-task 标签的 Issues
    url = f'https://api.github.com/repos/{REPO}/issues?state=closed&labels=daily-task&since={since_str}'
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"API 请求失败: {response.status_code} - {response.text}")
        return
        
    closed_issues = response.json()

    # 4. 生成极简的静态 HTML 归档页面
    html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{date_str} 学习归档</title>
    <style>
        body {{ font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #333; }}
        h1 {{ color: #2563eb; border-bottom: 2px solid #eee; padding-bottom: 10px; }}
        .summary {{ background: #f3f4f6; padding: 15px; border-radius: 8px; font-weight: bold; }}
        ul {{ padding-left: 20px; }}
        li {{ margin-bottom: 10px; }}
        a {{ color: #2563eb; text-decoration: none; }}
        a:hover {{ text-decoration: underline; }}
    </style>
</head>
<body>
    <h1>📅 历史归档：{date_str}</h1>
    <div class="summary">
        今天你一共完成了 {len(closed_issues)} 项任务！
    </div>
    <h2>完成清单：</h2>
    <ul>
"""
    if len(closed_issues) == 0:
        html_content += "<li>今天没有完成记录哦。</li>\n"
    else:
        for issue in closed_issues:
            html_content += f"        <li>{issue['title']}</li>\n"

    html_content += """    </ul>
    <br>
    <a href="../index.html">← 返回控制台主页</a>
</body>
</html>
"""

    # 5. 保存到 archives 文件夹
    os.makedirs('archives', exist_ok=True)
    file_path = f'archives/{date_str}.html'
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"✅ 归档文件已生成: {file_path}")

if __name__ == "__main__":
    main()
