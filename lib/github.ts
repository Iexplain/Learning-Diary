export const saveToGithub = async (data: any) => {
  try {
    const GITHUB_TOKEN = typeof window !== 'undefined' ? localStorage.getItem('GITHUB_PAT') : null;
    const REPO_OWNER = process.env.NEXT_PUBLIC_REPO_OWNER;
    const REPO_NAME = process.env.NEXT_PUBLIC_REPO_NAME;
    const PATH = 'data/database.json';

    if (!GITHUB_TOKEN) {
      console.error("Missing GitHub Token. Please set it in Settings.");
      return;
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
    
  } catch (error) {
    console.error("Error saving to GitHub:", error);
  }
};

// 🌟 新增：探针 1 - 获取已归档的月份列表 (例如 ['2026-03', '2026-02'])
export const getHistoryMonths = async (): Promise<string[]> => {
  try {
    const GITHUB_TOKEN = typeof window !== 'undefined' ? localStorage.getItem('GITHUB_PAT') : null;
    const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
    if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

    const res = await fetch(`https://api.github.com/repos/${process.env.NEXT_PUBLIC_REPO_OWNER}/${process.env.NEXT_PUBLIC_REPO_NAME}/contents/data/history`, { headers });
    if (!res.ok) return [];
    
    const files = await res.json();
    if (!Array.isArray(files)) return [];
    
    // 过滤出 .json 文件，提取名字，并按月份倒序排列
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

// 🌟 新增：探针 2 - 拉取具体某个月份的所有历史任务
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
    // CDN 降级备用通道
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${process.env.NEXT_PUBLIC_REPO_OWNER}/${process.env.NEXT_PUBLIC_REPO_NAME}/main/data/history/${month}.json?t=${Date.now()}`);
      return await res.json();
    } catch (err) {
      console.error("Failed to load history", err);
      return [];
    }
  }
};
