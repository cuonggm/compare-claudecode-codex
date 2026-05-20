# Codex Conventions

- Luôn chat với user bằng tiếng Việt có dấu.
- Code, comments, identifiers, commit messages, and test names must be in English.
- Trả lời ngắn gọn và tập trung vào kết quả cụ thể.
- Nêu cả các phát hiện bất ngờ, rủi ro ẩn, và lỗi/miss gần phạm vi đang làm.
- Prefer `rg` for search.
- Use `apply_patch` for manual file edits.
- Do not revert unrelated local changes.
- For this project, keep data local and avoid paid APIs, real secrets, hosted databases, or external runtime services.
- Enforce permissions in backend APIs, not only in the frontend.
- Use prepared SQL statements or safe ORM-style access.
- Run `npm run verify` before final handoff when feasible.
