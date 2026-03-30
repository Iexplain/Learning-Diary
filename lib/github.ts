// lib/github.ts

export const saveToGithub = async (data: any) => {
  try {
    // 🌟 核心修复 1：双重保障！优先读取本地缓存，如果没有，回退使用环境变量
    const GITHUB_TOKEN = (typeof window !== 'undefined' ? localStorage.getItem('GITHUB_PAT') : null) || process.env.NEXT_PUBLIC_GITHUB_TOKEN;
    const REPO_OWNER = process.env.NEXT_PUBLIC_REPO_OWNER;
    const REPO_NAME = process.env.NEXT_PUBLIC_REPO_NAME;
    const PATH = 'data/database.json';

    if (!GITHUB_TOKEN) {
      alert("⚠️ 同步失败：未找到 GitHub Token！请确保配置了 NEXT_PUBLIC_GITHUB_TOKEN");
      return false;
    }

    const getRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PATH}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!getRes.ok) throw new Error('Failed to fetch file SHA');
    
    const fileData = await getRes.json();
    const sha = fileData.sha;
    
    const contentEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

    const updateRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Update task data via UI',
        content: contentEncoded,
        sha: sha
      })
    });

    if (!updateRes.ok) throw new Error('Failed to update file');
    return true;
  } catch (error) {
    console.error("Error saving to GitHub:", error);
    alert("⚠️ 保存到 GitHub 失败，请检查网络或 Token 权限。");
    return false;
  }
};

export const getHistoryMonths = async (): Promise<string[]> => {
  try {
    const GITHUB_TOKEN = (typeof window !== 'undefined' ? localStorage.getItem('GITHUB_PAT') : null) || process.env.NEXT_PUBLIC_GITHUB_TOKEN;
    const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
    if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

    const res = await fetch(`https://api.github.com/repos/${process.env.NEXT_PUBLIC_REPO_OWNER}/${process.env.NEXT_PUBLIC_REPO_NAME}/contents/data/history`, { headers });
    if (!res.ok) return [];
    
    const files = await res.json();
    if (!Array.isArray(files)) return [];
    
    return files
      .filter((f: any) => f.name.endsWith('.json'))
      .map((f: any) => f.name.replace('.json', ''))
      .sort()
      .reverse();
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const getHistoryData = async (month: string) => {
  try {
    const GITHUB_TOKEN = (typeof window !== 'undefined' ? localStorage.getItem('GITHUB_PAT') : null) || process.env.NEXT_PUBLIC_GITHUB_TOKEN;
    const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
    if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

    const res = await fetch(`https://api.github.com/repos/${process.env.NEXT_PUBLIC_REPO_OWNER}/${process.env.NEXT_PUBLIC_REPO_NAME}/contents/data/history/${month}.json`, { headers });
    if (!res.ok) return [];
    
    const fileData = await res.json();
    const cleanBase64 = fileData.content.replace(/\n/g, '');
    const decodedContent = decodeURIComponent(escape(atob(cleanBase64)));
    return JSON.parse(decodedContent);
  } catch (e) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${process.env.NEXT_PUBLIC_REPO_OWNER}/${process.env.NEXT_PUBLIC_REPO_NAME}/main/data/history/${month}.json?t=${Date.now()}`);
      return await res.json();
    } catch (err) {
      console.error("Failed to load history", err);
      return [];
    }
  }
};
