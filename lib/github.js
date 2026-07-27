const API = "https://api.github.com";

function configured() {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
}

async function getFileSha(path) {
  const [owner, repo] = process.env.GITHUB_REPO.split("/");
  const res = await fetch(`${API}/repos/${owner}/${repo}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub getFileSha ${res.status}`);
  const json = await res.json();
  return json.sha;
}

async function commitFile(path, contentString, message) {
  if (!configured()) return { skipped: true };
  const [owner, repo] = process.env.GITHUB_REPO.split("/");
  const sha = await getFileSha(path);
  const res = await fetch(`${API}/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(contentString, "utf-8").toString("base64"),
      sha: sha ?? undefined,
      branch: "main",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub commitFile ${res.status}: ${text}`);
  }
  return res.json();
}

module.exports = { configured, commitFile };
