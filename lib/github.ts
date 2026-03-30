// lib/github.ts

export const saveToGithub = async (data: any) => {
  try {
    const GITHUB_TOKEN = typeof window !== 'undefined' ? localStorage.getItem('GITHUB_PAT') : null;
    const REPO_OWNER = process.env.NEXT_PUBLIC_REPO_OWNER || 'iexplain';
    const REPO_NAME = process.env.NEXT_PUBLIC_REPO_NAME || 'Learning-Diary';
    const PATH = 'data/database.json';

    if (!GITHUB_TOKEN) {
      alert("⚠️ 保存失败：未检测到管理员密钥！\n👉 请点击页面上方标题旁的 ⚙️ 齿轮图标，输入你的 Token。");
      return false;
    }

    // 🌟 核心修复：移除 headers 里的 Cache-Control，改用原生 cache: 'no-store' 选项，彻底避开跨域拦截！
    const getRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PATH}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!getRes.ok) {
      if (getRes.status === 401) alert("⚠️ Token 无效或已过期，请去 GitHub 重新生成！");
      else if (getRes.status === 404) alert(`⚠️ 找不到远程仓库 ${REPO_OWNER}/${REPO_NAME}，请检查名称。`);
      return false;
    }
    
    const fileData = await getRes.json();
    const sha = fileData.sha;
    
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

    if (!updateRes.ok) {
      const errData = await updateRes.json().catch(() => ({ message: 'Unknown error' }));
      alert(`❌ 致命错误：数据未能保存到 GitHub！\n\n状态码: ${updateRes.status}\n报错信息: ${errData.message}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Sync Protocol Error:", error);
    alert("⚠️ 发生严重网络错误，保存中断！");
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

    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/history?t=${Date.now()}`, { 
      cache: 'no-store',
      headers 
    });
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

    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/history/${month}.json?t=${Date.now()}`, { 
      cache: 'no-store',
      headers 
    });
    if (!res.ok) return [];
    
    const fileData = await res.json();
    const cleanBase64 = fileData.content.replace(/\n/g, '');
    
    const decodeBase64 = (str: string) => {
      return decodeURIComponent(atob(str).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    };
    
    const decodedContent = decodeBase64(cleanBase64);
    return JSON.parse(decodedContent);
  } catch (e) {
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
