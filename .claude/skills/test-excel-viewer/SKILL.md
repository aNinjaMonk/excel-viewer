---
name: test-excel-viewer
description: End-to-end test suite for the Excel Viewer app. Tests file loading, search, sort, row selection, delete confirmation, and error handling via browser automation.
---

# Excel Viewer — Test Suite

Run all test cases against the running app at `http://localhost:5173`. Start the dev server first if it isn't running:

```bash
cd /Users/abhi/projects/vibeCoding/excel-viewer && npm run dev -- --port 5173 &
sleep 2
```

Load browser tools with ToolSearch before starting:

```
select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__find,mcp__claude-in-chrome__file_upload,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp
```

---

## Fixture files

Write these to the scratchpad before running the tests. Use them by uploading via `file_upload` to the hidden file input (`ref` found with `find` → "file input").

### `basic.csv`
```
Name,Age,City,Score
Alice,30,Mumbai,95.5
Bob,25,Delhi,82.0
Charlie,35,Bangalore,78.3
Diana,28,Chennai,91.2
```
Four data rows. Numeric columns (Age, Score) should right-align. No preamble.

### `invalid.txt`
```
this is not a spreadsheet
```
Used only to verify error handling.

### Multi-sheet fixture
The project's own `.xlsx` (`BK - Anupama Panchal - (Beginning - 09 Oct 2026).xlsx` in the project root) is the standard preamble/XLSX fixture. Use its full path directly.

---

## Test cases

Run in order. After each action, take a screenshot and verify the stated expectation before proceeding. Record **PASS** or **FAIL** for each.

---

### TC-01 — Initial state

**Steps:** Navigate to `http://localhost:5173`.

**Expected:**
- Heading "Excel Viewer" and subtitle visible.
- Dropzone with "Drag & drop an Excel file here, or" and a "Choose file" button.
- Supported formats hint: `.xlsx, .xls, .xlsm, .xlsb, .ods, .csv`.
- No data table or error message.

---

### TC-02 — Invalid file type

**Steps:** Upload `invalid.txt` to the file input.

**Expected:**
- Red error message: `Unsupported file type ".txt". Use one of: .xlsx, .xls, .xlsm, .xlsb, .ods, .csv`
- No data table rendered (or if a file was previously loaded, previous table is still shown unchanged).

---

### TC-03 — Load CSV

**Steps:** Upload `basic.csv`.

**Expected:**
- Filename "basic.csv" shown as section heading.
- "Opened read-only…" notice shown (no File System Access handle).
- Row counter shows "4 of 4 rows".
- Columns in order: Name, Age, City, Score.
- Age and Score values are right-aligned (numeric).
- No preamble block above the table.

---

### TC-04 — Search: partial match (case-insensitive)

**Steps:** With `basic.csv` loaded, type `alice` (lowercase) into the search input.

**Expected:**
- Row counter updates to "1 of 4 rows".
- Only Alice's row is visible.
- Row content matches: Alice, 30, Mumbai, 95.5.

---

### TC-05 — Search: no results

**Steps:** Clear search and type `xyznonexistent`.

**Expected:**
- Row counter shows "0 of 4 rows".
- Table body shows one cell spanning all columns: "No matching rows".

---

### TC-06 — Search: clear via X button

**Steps:** With a search term active, click the × clear button inside the search input.

**Expected:**
- Search input empties.
- All 4 rows reappear.
- Row counter shows "4 of 4 rows".

---

### TC-07 — Sort: numeric ascending

**Steps:** Click the "Score" column header.

**Expected:**
- ▲ indicator appears next to "Score".
- Rows in order: Charlie (78.3), Bob (82), Diana (91.2), Alice (95.5).
- Sorted numerically, not lexicographically (82 before 91.2 before 95.5, not "78.3" < "82" < "91.2" alphabetically).

---

### TC-08 — Sort: numeric descending

**Steps:** Click "Score" header again.

**Expected:**
- ▼ indicator appears.
- Rows in order: Alice (95.5), Diana (91.2), Bob (82), Charlie (78.3).

---

### TC-09 — Sort: cleared on third click

**Steps:** Click "Score" header a third time.

**Expected:**
- No sort indicator on "Score".
- Rows revert to original CSV order: Alice, Bob, Charlie, Diana.

---

### TC-10 — Sort: text column alphabetical

**Steps:** Click the "City" column header.

**Expected:**
- ▲ indicator on "City".
- Rows: Charlie (Bangalore), Diana (Chennai), Bob (Delhi), Alice (Mumbai).

---

### TC-11 — Row selection: individual checkbox

**Steps:** Reset sort. Check the checkbox on Alice's row.

**Expected:**
- Alice's row is visually highlighted.
- Toolbar appears with: "1 selected", "Clear" button, red "Delete 1 row" button.
- Header checkbox shows an indeterminate (dash) state.

---

### TC-12 — Header checkbox: select all

**Steps:** Click the header checkbox (currently indeterminate).

**Expected:**
- All 4 rows checked.
- Header checkbox is fully checked (not indeterminate).
- Toolbar shows "4 selected" and "Delete 4 rows".

---

### TC-13 — Header checkbox: deselect all

**Steps:** Click the header checkbox again (currently fully checked).

**Expected:**
- All rows deselected.
- Toolbar (selected count + Delete button) disappears.
- Header checkbox is unchecked.

---

### TC-14 — Clear button

**Steps:** Check 2 rows individually, then click "Clear".

**Expected:**
- Both rows deselected.
- Toolbar disappears.

---

### TC-15 — Select all applies only to visible rows

**Steps:** Type `a` in search (matches Alice, Charlie, Diana — 3 rows). Click header checkbox.

**Expected:**
- Row counter shows "3 of 4 rows".
- Exactly 3 rows checked.
- Toolbar shows "3 selected".
- Bob (not visible) is not in the selected set.

Verify: clear search — Bob's row should be unchecked.

---

### TC-16 — Delete confirm dialog: opens with preview

**Steps:** Clear search and selection. Check Alice's row. Click "Delete 1 row".

**Expected:**
- Modal dialog opens with blurred/dimmed backdrop.
- Title: "Delete 1 row?"
- Preview table shows Alice's data using the first 3 columns: Name, Age, City.
- Two buttons: "Cancel" (default focus) and red "Delete 1 row".

---

### TC-17 — Delete confirm dialog: cancel via button

**Steps:** With dialog open, click "Cancel".

**Expected:**
- Dialog closes.
- Table data unchanged (all 4 rows still present).
- Alice's row remains selected (selection preserved).

---

### TC-18 — Delete confirm dialog: cancel via Escape key

**Steps:** Reopen delete dialog. Press `Escape`.

**Expected:**
- Dialog closes without deleting.
- Data unchanged.

---

### TC-19 — Delete confirm dialog: cancel via backdrop click

**Steps:** Reopen delete dialog. Click outside the dialog box (on the darkened backdrop area).

**Expected:**
- Dialog closes without deleting.
- Data unchanged.

---

### TC-20 — Delete row: read-only mode downloads updated file

**Steps:** Ensure `basic.csv` is loaded via hidden input (not File System Access). Select Alice's row, click "Delete 1 row", confirm in dialog.

**Expected:**
- A file download is triggered (browser downloads the updated CSV).
- Table updates to show 3 rows (Bob, Charlie, Diana).
- Selection is cleared.
- Notice message appears: `Deleted 1 row. Your browser can't edit files in place, so the updated file was downloaded instead.`

---

### TC-21 — Load XLSX with preamble

**Steps:** Upload `BK - Anupama Panchal - (Beginning - 09 Oct 2026).xlsx` from the project root.

**Expected:**
- Preamble block rendered above the table with:
  - Title row: "Bahi Khata - Account Statement"
  - `Account Name`: Anupama Panchal
  - `Balance as on Start`: ₹0.00
  - `Account Statement from Beginning to 09 Oct 2026`
- Row counter: "2 of 2 rows".
- Columns: Txn Date, Description, Amount Received, Amount Given, Balance.
- Numeric/currency columns right-aligned.
- Row 1: 29 Oct 2024 — Payment Received — ₹1,50,000.00.
- Row 2: 06 Nov 2024 — Payment Sent — ₹1,51,500.00.

---

### TC-22 — Date column sort

**Steps:** With the XLSX loaded, click "Txn Date" header.

**Expected:**
- ▲ indicator, dates sorted chronologically oldest-first (29 Oct 2024 first).

Click again:

**Expected:**
- ▼ indicator, newest-first (06 Nov 2024 first).

---

### TC-23 — Replace loaded file

**Steps:** With the XLSX loaded (and any sort/search/selection active), upload `basic.csv`.

**Expected:**
- Previous XLSX data is completely replaced by CSV data.
- Sort state reset (no sort indicator).
- Search input cleared.
- Selection cleared.
- Row counter shows "4 of 4 rows" for the CSV.

---

### TC-24 — Sort preserved across search

**Steps:** Sort by Score ascending. Then type `a` in the search (matches Alice, Charlie, Diana).

**Expected:**
- Rows shown in sorted order within the filter: Charlie (78.3), Diana (91.2), Alice (95.5).
- Row counter: "3 of 4 rows".

---

## Reporting

After all test cases, report a summary table:

| ID | Name | Result | Notes |
|----|------|--------|-------|
| TC-01 | Initial state | PASS/FAIL | |
| TC-02 | Invalid file type | PASS/FAIL | |
| … | … | … | |

List any FAILs with: what was expected, what was observed, and a screenshot reference.
