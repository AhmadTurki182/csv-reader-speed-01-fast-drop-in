# csv-reader-speed-01-fast-drop-in

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/AhmadTurki182/csv-reader-speed-01-fast-drop-in/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/AhmadTurki182/csv-reader-speed-01-fast-drop-in/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A faster drop-in for make.fun's own csv-reader 1.0.0: `solve.js` answers exactly as csv-reader does on every input — same `{columns, rows, errors}`, same broken-row policy (stray CRs, quote junk, unterminated quotes, short/long rows) — in a single left-to-right pass that cuts fields out with `indexOf`/`slice` instead of one character at a time.

On the practice set (6 cases, ~10 MB of CSV) it answers all 6 cases identically to csv-reader and runs the parser about 6.6× faster than the reference in warm runs (about 2.3× end to end including JSON parse and output).

## Files

- `solve.js` — dependency-free ES module; `run(input)` returns csv-reader's answer for `{text, header}`.
- `main.ts` — the program the harness runs: reads every case from `/input/cases.json`, answers each with `run`, writes `/output/answers.json`.

## Run it

```sh
MAKEFUN_INPUT_DIR=path/to/input MAKEFUN_OUTPUT_DIR=path/to/output node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/bounty/csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
