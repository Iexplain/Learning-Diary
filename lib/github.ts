// lib/github.ts

export const saveToGithub = async (data: any) => {
  try {
    // 🌟 架构级重构：绝对不从环境变量读取私钥，仅从当前浏览器的安全缓存读取！
    const GITHUB_TOKEN = typeof window !== 'undefined' ? localStorage.getItem('GITHUB_PAT') : null;
    const REPO_OWNER = process.env.NEXT_PUBLIC_REPO_OWNER;
    const REPO_NAME = process.env.NEXT_PUBLIC_REPO_NAME;
    const PATH = 'data/database.json';

    // 如果没有 Token，直接拦截，拒绝毫无意义的空请求，防止界面卡死
    if (!GITHUB_TOKEN) {
      console.warn("🔒 管理员未登录：数据目前仅在本地浏览器生效，刷新将丢失。");
      return false;
    }

    const getRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PATH}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!getRes.ok) {
      if (getRes.status === 401) alert("⚠️ 严重警告：Token 已失效或被 GitHub 安全拦截！请去网页隐藏设置中重新配置。");
      throw new Error('Failed to fetch file SHA');
    }
    
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
        message: 'Update task data via UI (Admin)',
        content: contentEncoded,
        sha: sha
      })
    });

    if (!updateRes.ok) {
      if (updateRes.status === 409) console.warn("⏳ 操作过快导致版本号冲突，已被系统自动消化，请勿频繁点击。");
      throw new Error('Failed to update file');
    }
    return true;
  } catch (error) {
    console.error("Sync Protocol Error:", error);
    return false;
  }
};

export const getHistoryMonths = async (): Promise<string[]> => {
  try {
    const GITHUB_TOKEN = typeof window !== 'undefined' ? localStorage.getItem('GITHUB_PAT') : null;
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
    return [];
  }
};

export const getHistoryData = async (month: string) => {
  try {
    const GITHUB_TOKEN = typeof window !== 'undefined' ? localStorage.getItem('GITHUB_PAT') : null;
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
      return [];
    }
  }
};
