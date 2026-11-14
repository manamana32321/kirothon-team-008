---
name: wrap-up
description: This skill should be used when the user asks to "세션 정리", "wrap up", "recap", "session close", "마무리", or signals the end of a multi-PR/multi-issue coding session. Collects session outputs (merged PRs, opened issues, external changes), auto-executes safe cleanup (worktree removal, merged-branch delete, workspace sync, base ff-pull) while asking only before killing dev servers or deleting origin branches, surfaces remaining work, and proposes a single session name.
---

# wrap-up

Conclude a coding session that produced multiple PRs, issues, or infrastructure changes. The skill reduces manual recall of "what got done", catches forgotten cleanup (orphan worktrees, dangling branches, running dev servers), and proposes a session name for later reference (chat history, brain notes, retros).

## When to invoke

Activate when the user signals end-of-session intent:

- "세션 정리", "마무리", "wrap up", "recap", "session close", "정리하자"
- "이름 추천" + summary context (multi-PR session)
- After the last expected merge of a work block

Skip when the session produced one trivial change with no cleanup needed (single edit + commit, no worktree, no background processes).

## Process

Execute the four phases in order. Report results progressively — do not batch the entire summary at the end.

### Phase 1 — Collect session outputs

**Scope to THIS session, not a wall-clock window.** The user routinely runs several sessions in parallel (one worktree each); a time window pulls in the _other_ sessions' merges and pollutes the summary. Derive outputs from what _this conversation_ actually did.

**Primary signal — reconstruct from the conversation:** the worktree(s) this session operated in, the branch(es) it created/committed/pushed, the PR number(s) it opened or merged, the issue number(s) it created or closed, and any external changes it mentioned.

Verify and enrich each _specific_ identifier — do NOT broad-scan by time:

```bash
# Loop over ONLY the PR/issue numbers this session touched
gh pr view <N> -R OWNER/REPO --json number,title,state,headRefName,mergedAt,mergeCommit
gh issue view <N> -R OWNER/REPO --json number,title,state,stateReason,closedAt
```

**Fallback when conversation context is thin (e.g., after compaction):** read the session worktree's _own_ reflog — reflog is per-worktree, so it is naturally isolated from concurrent sessions:

```bash
git -C <session-worktree> reflog --date=iso | grep -iE "checkout: moving|commit|branch:" | head -30
```

Only if that also fails, fall back to a time window AS A LAST RESORT — and then **intersect** the results with this session's branch names so concurrent sessions' PRs are excluded. Never present a raw `merged:>$SINCE` list as "this session".

**State your attribution.** List which PRs/issues/branches you assign to this session and on what basis ("from this conversation"). If a merged PR isn't yours, leave it out; invite the user to add anything you missed.

For external changes that gh/git cannot see (Vercel env edits, infra console changes, third-party API config), recall them from conversation context and list them explicitly. Mark these "external — not auto-detected" so the user knows the skill relied on memory rather than command output.

### Phase 2 — Cleanup (auto-execute safe items)

**Auto-execute** the safe cleanup below without asking — worktree removal, local branch delete, workspace-file sync, main fast-forward pull. These are reversible or refuse-on-danger (`branch -d`/ff-only). Report what was done, don't ask first. **Exceptions that still require asking** (never auto): background-process kill and origin-branch delete — see below.

Before removing a worktree you are currently inside, `cd` to the main or dev worktree first (removing your own cwd breaks the shell).

**Worktrees** (auto): `git worktree list` — remove ONLY worktrees whose branch THIS session merged (cross-check Phase 1). Use `git worktree remove --force` when the tree has gitignored artifacts (`.terraform`, `node_modules`, env symlinks) blocking a clean remove. Leave concurrent sessions' worktrees alone even if their branch looks merged — they may still be in use. Skip the main worktree.

**Local branches** (auto): For each merged PR's branch, `git branch -d <branch>`. **Squash-merged branches** (the repo default for feature→dev) are not ancestors of the base, so `-d` wrongly refuses — after confirming the PR is `MERGED` via gh (Phase 1), use `git branch -D <branch>`. Only fall back to `-D` on a gh-confirmed merge, never blindly.

**Workspace file** (auto): remove the merged worktree's entry from the project `.code-workspace` `folders` array (worktree convention — creation adds it, cleanup removes it).

**Origin branches**: Do NOT propose `git push origin --delete` by default. Many repos retain origin branches as audit trail; check project-level memory before suggesting. For `urp3-team-matching/web`, retention is the explicit policy (see auto-memory `project_repo_branch_cleanup_policy`).

**Background processes**: Check for `next dev`, `pnpm dev`, `supabase` containers, `vercel dev`, custom watchers:

```bash
ps aux | grep -E "next dev|pnpm dev|vercel" | grep -v grep
docker ps --filter "name=supabase_" --format "{{.Names}}\t{{.Status}}"
```

**Do NOT auto-kill.** Ask whether to stop. The user runs dev servers themselves (port-based, and `pgrep -f <path>` can match Claude Code's own process → self-SIGKILL). Default suggestion: stop if the user is ending the session; keep if they will resume immediately. Killing is user-approved only.

**Main/dev worktree catch-up** (auto): If the base worktree (the branch the PR merged into — usually `dev`, sometimes `main`) is behind its origin, `git pull origin <base> --ff-only` so local reflects merged work. `git status` first; if the tree is dirty or ff fails (diverged), stop and report — never blindly stash or force.

### Phase 3 — Remaining work

**Scope to THIS session's leftovers only.** Do NOT list the repo's whole open-PR/open-issue backlog — the user already tracks that elsewhere, and a full dump buries what actually needs a follow-up. Wrap-up answers "what did this session leave unfinished", not "what is open in this repo".

Include ONLY:

- Issues this session **created** (follow-ups split out of the work, deferred findings)
- PRs this session **opened but did not merge** (draft, blocked, awaiting review)
- Work this session **explicitly deferred** — a problem found and consciously postponed, a scope item the user cut
- Unresolved TODOs still pending in the current TodoWrite list

Verify by specific number, same as Phase 1 — `gh pr view <N>` / `gh issue view <N>`. Never broad-list with `gh issue list --assignee @me` or `gh pr list --author @me`; those return concurrent sessions' and past sessions' work.

If this session left nothing open, say "남은 작업 없음" and move on. That is a normal outcome, not a gap to fill by scanning the backlog.

**One exception, kept short:** if this session's work has an obvious direct successor already tracked as an issue (the next phase of the same epic, a known follow-up the change unblocks), name at most 1–2 by number with one clause each on why they connect. Do not expand this into a backlog review.

### Phase 4 — Session name

Propose exactly ONE name — no candidate table, no tone variants. Pick the fully-descriptive form (what was done + why it matters, e.g. "dicebear 퇴출 — 아바타 폴백 자급자족 전환"): it must contain the session's unique search keyword so the user can find it later.

**Status prefix (required).** Prepend a bracket tag reflecting the session's terminal state:

- `[완] ` — work completed (PR merged, issue closed, goal reached)
- `[진행] ` — still in progress (draft PR, unmerged work, follow-up pending)
- `[취소] ` — abandoned/cancelled (branch dropped, decision reversed, no ship)

Pick by what THIS session actually shipped, not intent. Merged + closed → `[완]`. Draft PR left open → `[진행]`. e.g. `[완] 섭외 답변 기한 정책 확정 — 발송일+3일`.

Derive the theme from:

- Common file paths touched across PRs (e.g., `utils/supabase/*` → "supabase 정합성")
- Issue topics (security finding → "보안 audit")
- Time markers (regression age, e.g., "8.5개월 묵은 회귀")
- Tooling/framework involved (e.g., "Next 16 upgrade 후속")

Add 1 sentence of reasoning. Avoid generic names like "버그 fix 세션" or "PR 머지 작업" — they convey nothing for future search.

Format the name as plain text — no surrounding quotation marks ("", '', 「」), no bold-only wrapper. The user copies it verbatim as a session title; decoration pollutes the copy.

## Constraints

**Auto-execute safe cleanup; ask only for the two exceptions.** Worktree removal, local branch delete, workspace-file sync, and base-branch ff-pull run automatically (Phase 2) — they are reversible or refuse-on-danger. Report what was done. The ONLY items that still require explicit approval: **background-process kill** (user runs dev servers; self-SIGKILL risk) and **origin-branch delete**.

**Never delete origin branches** unless project-level memory explicitly allows. Default = retain. Not covered by auto-execute.

**Never commit or push to main directly.** This skill only proposes cleanup of existing branches/worktrees, not new commits. Hook `main-branch-guard.sh` blocks direct commits anyway.

**Scope to the session, not the clock.** Attribute only PRs/issues/branches this conversation actually produced. The user runs parallel sessions — a wall-clock window mixes in other sessions' work. When you must fall back to a time window, intersect with this session's branches and flag the results as inferred, not certain.

**Mark uncertainty.** Vercel env changes, dashboard clicks, MCP-driven config — these cannot be detected by gh/git. Recall from conversation and label clearly so the user can verify or correct.

## Tool patterns

**Repo detection**: Read `.git/config` or `git remote get-url origin` from the main worktree. Avoid hard-coding repo names.

**Worktree enumeration**: `git worktree list --porcelain` parses cleaner than `git worktree list` for scripting.

**Process detection on WSL/Linux**: `ps aux` works. On macOS the same. Avoid `pgrep -f` for `next dev` because pnpm scripts wrap it differently.

**Docker containers**: `docker ps --filter "name=supabase_"` catches Supabase CLI's standard prefix. For other tooling, filter by image or label.

## Output format

Lead with a one-line completion summary, then four sections:

```
✅ 세션 wrap-up — N PRs merged, M issues touched, K cleanup candidates

## 📦 산출물
[table of PRs + issues]

## 🧹 Cleanup
[worktrees + branches + workspace + base-pull — DONE, report each]
[background processes / origin branches — listed, awaiting approval if any]

## 📋 남은 작업
[only THIS session's unmerged PRs / created issues / deferred items — "남은 작업 없음" if none]

## 🏷️ 세션 이름
[[완]/[진행]/[취소] prefix + single name — plain text, NO quotation marks + 1-sentence reasoning]
```

Safe cleanup is already executed and reported as done. End with a question ONLY if a deferred exception remains (running dev servers to kill, or origin branches to delete): "dev 서버 stop 할까요?" etc. Otherwise no closing question.

## Failure modes to avoid

**Stale gh cache**: If `gh pr list` returns network error, retry once with 3-second backoff. Do not silently skip — report the failure so the user knows the summary is incomplete.

**Forgetting external changes**: The user may have made Vercel env edits, Supabase dashboard clicks, MCP config changes during the session. These are invisible to gh/git. Actively recall conversation context for any "I changed X in the dashboard" / "applied env update" / "added a rule" mentions and list them under "External — not auto-detected".

**Over-aggressive auto-cleanup**: Never auto-remove worktrees whose branch is still open (unmerged PR), or worktrees belonging to concurrent sessions — auto-execute is gated on Phase 1 attribution (THIS session's gh-confirmed merges only). When unsure whether a worktree is this session's, leave it and mention it, don't remove it.

**Session name laziness**: the single name must carry the session's unique keyword (tool, discovery, or scope) — not a generic wrapper. If the first draft would match a dozen other sessions, it's wrong.
