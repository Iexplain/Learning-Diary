// lib/github.ts

export const saveToGithub = async (data: any) => {
  try {
    const GITHUB_TOKEN = typeof window !== 'undefined' ? localStorage.getItem('GITHUB_PAT') : null;
    
    // 🌟 核心修复 1：防弹衣！如果环境变量丢失，强制回退到你自己的专属仓库名，绝不迷路
    const REPO_OWNER = process.env.NEXT_PUBLIC_REPO_OWNER || 'iexplain';
    const REPO_NAME = process.env.NEXT_PUBLIC_REPO_NAME || 'Learning-Diary';
    const PATH = 'data/database.json';

    // 🌟 核心修复 2：大喇叭！如果没拿到钥匙，直接弹窗警告，拒绝静默失败
    if (!GITHUB_TOKEN) {
      alert("⚠️ 保存失败：未检测到管理员密钥！\n👉 请点击页面上方标题旁的 ⚙️ 齿轮图标，输入你的 Token。");
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
      if (getRes.status === 401) alert("⚠️ Token 无效或已过期，请去 GitHub 重新生成！");
      if (getRes.status === 404) alert(`⚠️ 找不到远程仓库 ${REPO_OWNER}/${REPO_NAME}，请检查名称。`);
      throw new Error('Failed to fetch file SHA');
    }
    
    const fileData = await getRes.json();
    const sha = fileData.sha;
    
    // 🌟 核心修复 3：中文翻译官！彻底解决原生 btoa 遇到中文字符直接崩溃的底层 Bug
    const encodeBase64 = (str: string) => {
      return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
          function toSolidBytes(match, p1) {
              return String.fromCharCode(Number('0x' + p1));
      }));
    };
    const contentEncoded = encodeBase64(JSON.stringify(data, null, 2));

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
    console.error("Sync Protocol Error:", error);
    return false;
  }
};

export const getHistoryMonths = async (): Promise<string[]> => {
  try {
    const GITHUB_TOKEN = typeof window !== 'undefined' ? localStorage.getItem('GITHUB_PAT') : null;
    const REPO_OWNER = process.env.NEXT_PUBLIC_REPO_OWNER || 'iexplain';
    const REPO_NAME = process.env.NEXT_PUBLIC_REPO_NAME || 'Learning-Diary';

    const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
    if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/history`, { headers });
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
    const REPO_OWNER = process.env.NEXT_PUBLIC_REPO_OWNER || 'iexplain';
    const REPO_NAME = process.env.NEXT_PUBLIC_REPO_NAME || 'Learning-Diary';
    
    const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
    if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/history/${month}.json`, { headers });
    if (!res.ok) return [];
    
    const fileData = await res.json();
    const cleanBase64 = fileData.content.replace(/\n/g, '');
    
    // 🌟 同步修复获取历史数据时的中文解码问题
    const decodeBase64 = (str: string) => {
      return decodeURIComponent(atob(str).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    };
    
    const decodedContent = decodeBase64(cleanBase64);
    return JSON.parse(decodedContent);
  } catch (e) {
    // CDN 降级备用通道
    try {
      const REPO_OWNER = process.env.NEXT_PUBLIC_REPO_OWNER || 'iexplain';
      const REPO_NAME = process.env.NEXT_PUBLIC_REPO_NAME || 'Learning-Diary';
      const res = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/data/history/${month}.json?t=${Date.now()}`);
      return await res.json();
    } catch (err) {
      return [];
    }
  }
};
