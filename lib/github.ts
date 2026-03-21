// lib/github.ts

// 移除危险的 NEXT_PUBLIC_GITHUB_TOKEN 环境变量读取
const REPO_OWNER = process.env.NEXT_PUBLIC_REPO_OWNER; // 你的 GitHub 用户名 (公开无妨)
const REPO_NAME = process.env.NEXT_PUBLIC_REPO_NAME;   // 仓库名 (公开无妨)
const FILE_PATH = 'data/database.json';

export async function saveToGithub(newData: any) {
  // 核心安全改进：在浏览器端动态从本地存储读取 Token
  // 避免在打包时将具备写权限的 Token 暴露给所有访问者
  const GITHUB_TOKEN = typeof window !== 'undefined' ? localStorage.getItem('GITHUB_PAT') : null;

  if (!GITHUB_TOKEN) {
    console.error("Missing GitHub Token in localStorage");
    alert("授权失败：未找到 GitHub Token！请按 F12 打开控制台，输入 localStorage.setItem('GITHUB_PAT', '你的Token') 进行绑定。");
    return false;
  }

  if (!REPO_OWNER || !REPO_NAME) {
    console.error("Repository configuration is missing in environment variables.");
    return false;
  }

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
  const headers = {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  try {
    // 1. 获取当前文件的 SHA
    const getRes = await fetch(url, { headers, cache: 'no-store' });
    
    // 新增：拦截非 200 响应，防止网络或权限问题导致代码静默崩溃
    if (!getRes.ok) {
        throw new Error(`Failed to fetch file SHA: ${getRes.status} ${getRes.statusText}`);
    }
    
    const fileData = await getRes.json();
    const sha = fileData.sha;

    // 2. 将新数据安全地转为 Base64
    const jsonString = JSON.stringify(newData, null, 2);
    // 保留原有的 encodeURIComponent 方案，它是浏览器端处理中文字符转化为 Base64 最兼容的做法
    const content = btoa(unescape(encodeURIComponent(jsonString)));

    // 3. 提交更新
    const putRes = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: 'chore: update dashboard data via UI',
        content: content,
        sha: sha
      })
    });

    if (!putRes.ok) {
        throw new Error(`Failed to update file: ${putRes.status} ${putRes.statusText}`);
    }

    return true;
  } catch (error) {
    console.error("Error saving to GitHub:", error);
    return false;
  }
}
