# Einbaum Xu homepage

无构建工具的静态个人主页。视觉规范见 [DESIGN.md](DESIGN.md)，功能修改未改动 `styles.css`。

## 本地预览

在 PowerShell 中运行：

```powershell
cd D:\Github\homepage
python -m http.server 8765
```

打开 <http://localhost:8765>，结束时按 Ctrl+C。请通过 HTTP 预览；直接打开 `file://` 页面会受浏览器 JSON 读取限制，降级为英文静态内容。

## 数据与语言

- `data/site.json`：姓名、定位、简介、社交链接、项目和 EN / DE / 中字典，唯一内容来源。
- `site.js`：原生 JS 读取数据并生成 markup，无依赖、不使用 `innerHTML`；沿用 DESIGN.md 第 5 节 class。
- `index.html`：保留英文静态快照。禁用 JS、脚本失败或 JSON 无法加载时仍可阅读英文；无 JS 时语言链接不会产生译文。
- `.nojekyll`：让 GitHub Pages 直接发布静态文件，无需 Jekyll 处理。
- `scripts/synchronisiere_inhalte.py`：维护时同步英文快照，不是部署构建步骤。仓库中的 HTML 可以直接部署。
- 语言优先级：有效 `?lang=` → 已保存的选择 → 浏览器语言列表中的首个支持项 → 英文。支持 `en-*` / `de-*` / `zh-*`；显式选择保存在 localStorage，禁用存储时仍可切换。
- 切换同步更新 `html[lang]`、title、description、无障碍标签和 `aria-current`。动态项目交给页面底部同一个 IntersectionObserver；不支持 Observer 时直接显示。
- 单页方案不单独生成 `/de/` 或 `/zh/`：维护较轻；代价是无 JS 只有英文，搜索引擎的首屏 HTML 也只有英文。

姓名为 **Einbaum Xu**，GitHub 账号为 **DiesesKontofuerVerbindung**。长期研究方向 **Agent Security** 由本人提供。项目简介依据以下公开 README，仅概述项目，不推断个人分工或未披露实现：

- [WhereSheLongs](https://github.com/DiesesKontofuerVerbindung/WhereSheLongs)
- [ptcg-ai-agent-portfolio](https://github.com/DiesesKontofuerVerbindung/ptcg-ai-agent-portfolio)

个人背景、Email、LinkedIn 和 Scholar 仍为占位；`#` 不是可用目标。发布前请补充或移除这些项目。未读取或发布 TestDaF 成绩；项目年份未核实，因此暂不显示。

## 修改简介

1. 修改 `data/site.json` 的 `profile.name`、各语言的 `hero.role` / `hero.bio` 和 `profile.socials`。
2. `hero.bio` 是 1–3 个段落，每段为片段数组：字符串是普通文字，`{"em":"重点"}` 是强调，`{"text":"链接文字","href":"https://example.com"}` 是链接。不要填 HTML。
3. 英、德、中三份字典使用相同 key。名字、`~/` 路径、技术标签和年份不翻译；平台品牌可在各字典保留相同拼写。
4. 同步英文快照并验证：

```powershell
python scripts/synchronisiere_inhalte.py
python scripts/synchronisiere_inhalte.py --check
```

随后刷新本地预览。提交时同时提交 JSON 和更新后的 `index.html`，避免无 JS 内容过时。

## 新增项目

在 `projects` 数组添加一项（数组顺序即展示顺序）：

```json
{
  "id": "new-project",
  "href": "https://github.com/DiesesKontofuerVerbindung/new-project",
  "titleKey": "projects.new-project.title",
  "descriptionKey": "projects.new-project.description",
  "tags": ["python"],
  "year": "2026"
}
```

在 `locales.en`、`locales.de`、`locales.zh` 各添加上述两个 key 对应的标题和简介；英文简介建议不超过约 110 字符。`id` 唯一，tags 小写、不加方括号（脚本自动添加），`tags` 和 `year` 可省略。完成后运行上面的同步命令与冒烟测试。无需手写项目 HTML。

## 验证

提交前执行 `.claude/smoke` 中的全部命令（PowerShell）：

```powershell
Get-Content .claude/smoke | ForEach-Object { Invoke-Expression $_; if ($LASTEXITCODE -ne 0) { throw 'Smoke failed' } }
git diff --check
```

可选浏览器集成测试使用**现有** Playwright 和本机 Chrome，不安装 npm 包，不改变站点部署方式：

```powershell
$env:PLAYWRIGHT_MODULE_PATH = '你的现有 Playwright 模块绝对路径'
node tests/browser.cjs
```

测试自带临时本地 HTTP 服务，覆盖三语、元信息、语言优先级及记忆、动态 reveal、移动端宽度、无 JS / 数据 / 脚本、存储受限与 reduced motion。测试阻断外部字体请求；真实字体和最终视觉请在本地预览确认。

## 分支与部署（待本人确认，不自动执行）

流程：`dev` 开发并测试 → 合并 `main` → 本人本地校验 → 经确认合并 `master` → 另外获得 push 同意后，仅推送 `master`。

2026-10-26 预检：`gh auth status` 的激活账号是正确的 `DiesesKontofuerVerbindung`；查询 `DiesesKontofuerVerbindung/DiesesKontofuerVerbindung.github.io` 未找到仓库，尚不能确认存在且为空。未创建仓库、添加远端或 push。

建仓与最终发布由助手负责，待本人确认 main 本地验收通过后再进行；仓库尚不存在时需要创建公开的同名仓库。push 前仍需重新检查：

```powershell
gh auth status
gh repo view DiesesKontofuerVerbindung/DiesesKontofuerVerbindung.github.io --json nameWithOwner,isEmpty,url
```

必须是该激活账号、正确仓库且 `isEmpty: true`；不符则停止。下列命令仅供确认，**尚未执行**：

```powershell
# 只有 main 本地验收通过后
git switch master
git merge --ff-only main

# 另获 push 同意且上述预检通过后；已有 origin 时先核对，不覆盖
git remote add origin https://github.com/DiesesKontofuerVerbindung/DiesesKontofuerVerbindung.github.io.git
git push -u origin master
```

GitHub 仓库 **Settings → Pages → Build and deployment**：Source 选择 **Deploy from a branch**，Branch 选择 **master**，目录选择 **/ (root)**，点击 **Save**（[官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)）。以 Pages 设置页最终报告的地址为准，预计为 <https://DiesesKontofuerVerbindung.github.io/>。
