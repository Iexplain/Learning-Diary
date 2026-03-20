// lib/github.ts
const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN;
const REPO_OWNER = process.env.NEXT_PUBLIC_REPO_OWNER; // 你的 GitHub 用户名
const REPO_NAME = process.env.NEXT_PUBLIC_REPO_NAME;   // 仓库名
const FILE_PATH = 'data/database.json';

export async function saveToGithub(newData: any) {
  if (!GITHUB_TOKEN) {
    console.error("Missing GitHub Token");
    return false;
  }

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
  const headers = {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  try {
    // 1. 获取当前文件的 SHA (GitHub API 更新文件必需)
    const getRes = await fetch(url, { headers, cache: 'no-store' });
    const fileData = await getRes.json();
    const sha = fileData.sha;

    // 2. 将新数据转为 Base64 并提交更新
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(newData, null, 2))));
    const putRes = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: 'Update dashboard data via UI',
        content: content,
        sha: sha
      })
    });

    return putRes.ok;
  } catch (error) {
    console.error("Error saving to GitHub:", error);
    return false;
  }
}
