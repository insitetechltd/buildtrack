# DeepSeek zh-TW Part A apply note (2026-08-27)

## Reply files
1. `~/Library/Mobile Documents/com~apple~CloudDocs/Downloads/deepseek_text_20260827_efeaff.txt`
2. `~/Library/Mobile Documents/com~apple~CloudDocs/Downloads/deepseek_text_20260827_a2aaa5.txt`
3. `~/Library/Mobile Documents/com~apple~CloudDocs/Downloads/deepseek_text_20260827_c06c63.txt`
4. `~/Library/Mobile Documents/com~apple~CloudDocs/Downloads/deepseek_text_20260827_b716c6.txt`

Mapped by `KEY | 譯文` to Part A chunks 1–4 (`docs/i18n/zh-TW-part-a-chunk-*.txt`, 661 keys).

## Parse / apply counts

| Category | Count |
|---|---|
| DeepSeek lines parsed | 661 |
| Malformed / empty | 0 |
| Leaf keys changed from prior zh-TW | 434 |
| Unchanged (DeepSeek == prior zh-TW) | 225 |
| Function interpolators updated | 4 |
| Keys inserted (present in en + DeepSeek, absent in prior zh-TW) | 2 (`tasks.couldNotLoadTasks`, `tasks.couldNotLoadTasksMessage`) |
| Final en / zh-TW leaf parity | **661 / 661** |

## Function keys (type-compatible with `en.ts`)

| Key | Signature preserved | Template |
|---|---|---|
| `createTask.usersSelected` | `(count: number)` | `` `已揀 ${count} 位用戶` `` |
| `createTask.filesAdded` | `(count: number)` | `` `已新增 ${count} 個檔案` `` |
| `createTask.doneSelected` | `(count: number)` | `` `完成（已揀 ${count} 項）` `` |
| `createTask.usersAvailable` | `(count: number, filtered?: number)` | conditional `` `${count}…${filtered ? `（從 ${filtered}…` : ''}` `` |

`{arg1}` / `{arg2}` from DeepSeek mapped to `${count}` / `${filtered}`.

## Still English / intentional non-translation vs en

- `login.buildTrack` = `BuildTrack` (brand)
- `profile.english` = `English`
- `profile.englishUS` = `English (United States)`
- `createCompany.workEmailPlaceholder` = `you@company.com`
- `profile.traditionalChinese` = `繁體中文` (same in en)

Emoji preserved (e.g. `auth.welcomeBack` → `歡迎返嚟！👋`).

## Locale file
`src/locales/zh-TW.ts` — no commit in this apply.
