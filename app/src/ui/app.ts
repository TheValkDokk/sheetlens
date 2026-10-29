import { parseArrayBuffer } from "../core/parse";
import { scanRisks } from "../core/risks";
import { buildEdges, formulaAt, impactOf } from "../core/deps";
import { explainFormula } from "../core/formula";
import { buildDemoWorkbook } from "../demo";
import type { Edge, Finding, Ref, WorkbookModel } from "../core/types";
import { ParseError } from "../core/types";

type Tab = "overview" | "risks" | "formulas" | "impact";

interface State {
  wb: WorkbookModel | null;
  findings: Finding[];
  edges: Edge[];
  tab: Tab;
  filter: string;
  impact: Ref | null;
  error: string | null;
  busy: boolean;
}

const state: State = {
  wb: null,
  findings: [],
  edges: [],
  tab: "overview",
  filter: "",
  impact: null,
  error: null,
  busy: false,
};

const root = document.getElementById("app") as HTMLElement;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function refLabel(r: Ref): string {
  return r.sheet + "!" + r.addr;
}

function refOfString(input: string): Ref | null {
  const raw = input.trim();
  if (!raw || !state.wb) return null;
  const idx = raw.lastIndexOf("!");
  if (idx === -1) {
    return { sheet: state.wb.sheets[0]?.name ?? "", addr: raw.toUpperCase() };
  }
  return { sheet: raw.slice(0, idx).replace(/^'|'$/g, ""), addr: raw.slice(idx + 1).toUpperCase() };
}

function characterise(sheet: { cellCount: number; formulaCount: number; hidden: 0 | 1 | 2 }): string {
  if (sheet.hidden === 2) return "Very hidden — only VBA can reveal it";
  if (sheet.hidden === 1) return "Hidden from the tab bar";
  if (sheet.cellCount === 0) return "Empty";
  const ratio = sheet.formulaCount / Math.max(1, sheet.cellCount);
  if (sheet.formulaCount === 0) return "Raw data — no formulas";
  if (ratio > 0.6) return "Calculation layer — mostly formulas";
  if (ratio > 0.25) return "Mixed data and calculation";
  return "Mostly data with a few computed cells";
}

/* ------------------------------------------------------------------ views */

function header(): string {
  return (
    '<div class="top"><span class="brand">Sheet<span class="dot">Lens</span></span>' +
    '<span class="badge">Nothing is uploaded</span></div>' +
    '<p class="lede">Drop a spreadsheet you inherited. See what it actually computes, which cells are dangerous, ' +
    "and what breaks if you edit one — before you edit it. Nothing is uploaded, ever.</p>"
  );
}

function intake(): string {
  return (
    '<section class="intake" aria-labelledby="drophead">' +
    '<div class="drop" id="drop">' +
    '<h2 id="drophead">Inspect a workbook</h2>' +
    "<p>.xlsx or .csv — parsed locally, never uploaded</p>" +
    '<div class="btn-row">' +
    '<label class="btn primary" for="file">Choose a file</label>' +
    '<input id="file" type="file" accept=".xlsx,.csv,text/csv" hidden />' +
    '<button class="btn ghost" data-action="demo" type="button">Load demo workbook</button>' +
    "</div></div>" +
    '<ul class="promises">' +
    "<li><b>Nothing leaves the tab</b>No upload, no analytics, no AI call. The file is read by your own browser.</li>" +
    "<li><b>No formula is missed</b>Cells that store a formula without a cached result are counted too — the case most parsers drop.</li>" +
    "<li><b>Every flag shows its evidence</b>A finding without the offending fragment is an opinion, not a finding.</li>" +
    "</ul></section>"
  );
}

function statCard(k: string, v: string, cls: string): string {
  return '<div class="stat ' + cls + '"><div class="k">' + k + '</div><div class="v">' + v + "</div></div>";
}

function results(): string {
  const wb = state.wb as WorkbookModel;
  const high = state.findings.filter((f) => f.severity === "high").length;
  const medium = state.findings.filter((f) => f.severity === "medium").length;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "risks", label: "Risks", count: state.findings.length },
    { id: "formulas", label: "Formulas", count: wb.totals.formulas },
    { id: "impact", label: "Impact" },
  ];

  const tabHtml = tabs
    .map(
      (t) =>
        '<button class="tab" role="tab" id="tab-' + t.id + '" data-tab="' + t.id + '" aria-selected="' +
        (state.tab === t.id) + '" aria-controls="panel" tabindex="' + (state.tab === t.id ? "0" : "-1") + '">' +
        t.label + (t.count !== undefined ? '<span class="count">' + t.count + "</span>" : "") +
        "</button>"
    )
    .join("");

  return (
    '<section class="results">' +
    '<div class="fileline"><div class="filename">' + esc(wb.fileName) +
    ' <span>· ' + wb.sheets.length + " sheets · " + wb.totals.cells.toLocaleString() + " cells</span></div>" +
    '<button class="btn ghost" data-action="reset" type="button">Start over</button></div>' +
    '<h2 class="sr-only" style="position:absolute;left:-9999px">Workbook summary</h2>' +
    '<div class="stats">' +
    statCard("Sheets", String(wb.sheets.length), "") +
    statCard("Formulas", wb.totals.formulas.toLocaleString(), "") +
    statCard("High risk", String(high), high > 0 ? "risk" : "ok") +
    statCard("Worth a look", String(medium), "") +
    "</div>" +
    (wb.warning ? '<div class="notice">' + esc(wb.warning) + "</div>" : "") +
    '<div class="tabs" role="tablist" aria-label="Workbook views">' + tabHtml + "</div>" +
    '<div class="panel" id="panel" role="tabpanel" aria-labelledby="tab-' + state.tab + '">' +
    panelContent() +
    "</div>" +
    '<div class="actions"><button class="btn primary" data-action="export" type="button">Export audit report</button>' +
    '<span class="hint">A single HTML file you can attach to an email. Opens offline.</span></div>' +
    "</section>"
  );
}

function panelContent(): string {
  if (state.tab === "overview") return overview();
  if (state.tab === "risks") return risks();
  if (state.tab === "formulas") return formulas();
  return impact();
}

function overview(): string {
  const wb = state.wb as WorkbookModel;
  const rows = wb.sheets
    .map(
      (s) =>
        "<tr><td><b>" + esc(s.name) + "</b>" + (s.hidden ? ' <span class="sev medium">hidden</span>' : "") + "</td>" +
        '<td class="num">' + s.rows + " × " + s.cols + "</td>" +
        '<td class="num">' + s.cellCount.toLocaleString() + "</td>" +
        '<td class="num">' + s.formulaCount.toLocaleString() + "</td>" +
        "<td>" + esc(characterise(s)) + "</td></tr>"
    )
    .join("");
  return (
    "<table><thead><tr><th>Sheet</th><th class=\"num\">Grid</th><th class=\"num\">Cells</th>" +
    '<th class="num">Formulas</th><th>What it looks like</th></tr></thead><tbody>' +
    rows +
    "</tbody></table>" +
    '<p class="hint" style="margin-top:14px">Hidden sheets are counted even when you cannot see them — content you cannot see still drives the numbers you can.</p>'
  );
}

/**
 * Repeated cells with the same defect are one finding, not five.
 * Per-cell rows live in the export; the screen groups them so unique risks stay visible.
 */
function groupFindings(): { lead: Finding; members: Finding[] }[] {
  const groups: { lead: Finding; members: Finding[] }[] = [];
  const index = new Map<string, number>();
  for (const f of state.findings) {
    const key = f.rule + "|" + f.sheet + "|" + f.title + "|" + f.detail;
    const at = index.get(key);
    if (at === undefined) {
      index.set(key, groups.length);
      groups.push({ lead: f, members: [f] });
    } else {
      groups[at].members.push(f);
    }
  }
  return groups;
}

function locationsLabel(members: Finding[]): string {
  const first = members[0];
  if (members.length === 1) return first.sheet + (first.addr ? "!" + first.addr : "");
  const parsed = members
    .map((m) => /^([A-Z]+)([0-9]+)$/.exec(m.addr))
    .filter((m): m is RegExpExecArray => m !== null);
  if (parsed.length === members.length) {
    const col = parsed[0][1];
    const rows = parsed.map((p) => Number(p[2])).sort((a, b) => a - b);
    const sameCol = parsed.every((p) => p[1] === col);
    const contiguous = rows.every((r, i) => i === 0 || r === rows[i - 1] + 1);
    if (sameCol && contiguous) {
      return first.sheet + "!" + col + rows[0] + "–" + col + rows[rows.length - 1];
    }
  }
  const head = members.slice(0, 3).map((m) => m.sheet + "!" + m.addr).join(", ");
  return head + (members.length > 3 ? " +" + (members.length - 3) + " more" : "");
}

function risks(): string {
  if (state.findings.length === 0) {
    return '<div class="empty"><b>No risk patterns found</b>This workbook does not use hardcoded rates, volatile functions, external links or hidden sheets. It still deserves a read-through before you edit it.</div>';
  }
  const groups = groupFindings();
  return groups
    .map(({ lead, members }) => {
      const many = members.length > 1;
      return (
        '<article class="finding ' + lead.severity + '">' +
        '<div class="fhead"><span class="sev ' + lead.severity + '">' + lead.severity + "</span>" +
        '<span class="ftitle">' + esc(lead.title) + "</span>" +
        '<span class="loc">' + esc(locationsLabel(members)) +
        (many ? ' <span class="sev low">' + members.length + " cells</span>" : "") + "</span></div>" +
        '<p class="fdetail">' + esc(lead.detail) + "</p>" +
        (many
          ? '<p class="hint" style="margin:6px 0 0">One pattern, ' + members.length + " cells: " +
            esc(members.map((m) => m.addr).slice(0, 8).join(", ")) + (members.length > 8 ? " …" : "") + "</p>"
          : "") +
        '<code class="evidence">' + esc(lead.evidence) + "</code>" +
        "</article>"
      );
    })
    .join("");
}

function formulas(): string {
  const wb = state.wb as WorkbookModel;
  if (wb.formulas.length === 0) {
    return '<div class="empty"><b>No formulas in this workbook</b>Every cell is a value. That is either a clean export or a hardcoded model — worth confirming which.</div>';
  }
  const q = state.filter.toLowerCase();
  const matched = wb.formulas.filter(
    (c) => q === "" || c.formula.toLowerCase().includes(q) || c.addr.toLowerCase().includes(q) || c.sheet.toLowerCase().includes(q)
  );
  const shown = matched.slice(0, 200);
  const rows = shown
    .map(
      (c) =>
        '<div class="frow"><div class="hdr"><b class="mono">' + esc(c.sheet) + "!" + esc(c.addr) + "</b>" +
        '<code>' + esc(c.formula) + "</code></div>" +
        '<div class="say">' + esc(explainFormula(c.formula)) + "</div></div>"
    )
    .join("");
  return (
    '<div class="toolbar"><input class="search" id="filter" type="search" placeholder="Filter by sheet, cell or function…" value="' +
    esc(state.filter) + '" aria-label="Filter formulas" />' +
    '<span class="hint">' + matched.length + " match" + (matched.length === 1 ? "" : "es") + "</span></div>" +
    (rows || '<div class="empty"><b>Nothing matches that filter</b>Try a sheet name, a cell address or a function such as VLOOKUP.</div>') +
    (matched.length > shown.length
      ? '<p class="hint" style="margin-top:12px">Showing the first ' + shown.length + " of " + matched.length + " — the export contains all of them.</p>"
      : "")
  );
}

function impact(): string {
  const wb = state.wb as WorkbookModel;
  if (wb.formulas.length === 0) {
    return '<div class="empty"><b>Nothing depends on anything</b>Without formulas there is no dependency graph to walk.</div>';
  }
  const current = state.impact;
  const label = current ? refLabel(current) : "";
  const results = current ? impactOf(state.edges, current) : null;

  let body = "";
  if (!current || !results) {
    body = '<div class="empty"><b>Pick a cell</b>Type a cell address such as ' + esc(wb.sheets[0]?.name ?? "") + "!B4 to see every formula that would change.</div>";
  } else if (results.direct.length === 0 && results.transitive.length === 0) {
    body = '<div class="empty"><b>Nothing depends on ' + esc(label) + "</b>You can edit this cell without changing any formula in the workbook.</div>";
  } else {
    const list = (refs: Ref[]) =>
      refs
        .map((r) => {
          const f = formulaAt(wb, r);
          return (
            '<div class="frow"><div class="hdr"><b class="mono">' + esc(refLabel(r)) + "</b>" +
            (f ? "<code>" + esc(f) + "</code>" : "") +
            "</div>" + (f ? '<div class="say">' + esc(explainFormula(f)) + "</div>" : "") + "</div>"
          );
        })
        .join("");
    body =
      '<p class="hint" style="margin:0 0 6px"><b style="color:var(--text)">Direct</b> — formulas that read ' +
      esc(label) + " right now</p>" +
      (results.direct.length ? list(results.direct) : '<p class="hint">None.</p>') +
      '<p class="hint" style="margin:20px 0 6px"><b style="color:var(--text)">Downstream</b> — formulas that change because those changed</p>' +
      (results.transitive.length ? list(results.transitive) : '<p class="hint">None.</p>');
  }

  return (
    '<div class="toolbar"><label class="hint" for="impactor">Cell to test</label>' +
    '<input class="search" id="impactor" type="text" value="' + esc(label) + '" placeholder="Sheet!B4" />' +
    '<button class="btn" data-action="impact-run" type="button">Trace</button></div>' + body
  );
}

function guides(): string {
  const links: [string, string][] = [
    ["what-does-this-excel-formula-mean.html", "What does this Excel formula mean?"],
    ["understand-a-spreadsheet-someone-else-built.html", "Understand a spreadsheet someone else built"],
    ["find-hardcoded-numbers-in-an-excel-model.html", "Find hardcoded numbers in a model"],
    ["excel-ref-error-what-to-do.html", "Excel #REF! — what to do"],
  ];
  return (
    '<section class="home-guides"><h2>Guides</h2><ul>' +
    links.map((l) => '<li><a href="./guides/' + l[0] + '">' + l[1] + "</a></li>").join("") +
    "</ul></section>"
  );
}

function shell(): string {
  const body = state.wb ? results() : intake();
  const err = state.error
    ? '<div class="err" role="alert"><b>Could not read that file</b>' + esc(state.error) + "</div>"
    : "";
  return (
    '<div class="wrap">' +
    header() +
    err +
    body +
    (state.wb ? "" : guides()) +
    '<footer class="footer">SheetLens reads .xlsx and .csv locally. No upload, no tracking, no third-party requests. ' +
    "Findings are heuristics with evidence attached — they tell you where to look, not what to conclude.</footer>" +
    "</div>"
  );
}

function render(): void {
  root.innerHTML = shell();
  const drop = document.getElementById("drop");
  if (drop) {
    drop.addEventListener("dragover", (e) => {
      e.preventDefault();
      drop.classList.add("hot");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("hot"));
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      drop.classList.remove("hot");
      const f = (e as DragEvent).dataTransfer?.files?.[0];
      if (f) void loadFile(f);
    });
  }
  const file = document.getElementById("file") as HTMLInputElement | null;
  if (file) {
    file.addEventListener("change", () => {
      const f = file.files?.[0];
      if (f) void loadFile(f);
    });
  }
}

function readError(e: unknown): string {
  if (e instanceof ParseError) return e.message;
  return e instanceof Error ? e.message : String(e);
}

async function loadFile(file: File): Promise<void> {
  state.busy = true;
  try {
    const buf = await file.arrayBuffer();
    ingest(buf, file.name);
  } catch (e) {
    state.error = readError(e);
    render();
  } finally {
    state.busy = false;
  }
}

function ingest(buf: ArrayBuffer, name: string): void {
  try {
    const wb = parseArrayBuffer(buf, name);
    const findings = scanRisks(wb);
    const edges = buildEdges(wb);

    // Default the impact view to the cell with the widest blast radius.
    let best: Ref | null = null;
    let bestCount = -1;
    for (const cell of wb.formulas) {
      const ref = { sheet: cell.sheet, addr: cell.addr };
      const im = impactOf(edges, ref);
      const n = im.direct.length + im.transitive.length;
      if (n > bestCount) {
        bestCount = n;
        best = ref;
      }
    }

    state.wb = wb;
    state.findings = findings;
    state.edges = edges;
    state.impact = best;
    state.error = null;
    state.tab = findings.some((f) => f.severity === "high") ? "risks" : "overview";
    render();
  } catch (e) {
    state.wb = null;
    state.error = readError(e);
    render();
  }
}

function loadDemo(): void {
  try {
    ingest(buildDemoWorkbook(), "Q3_Pricing_Model.xlsx");
  } catch (e) {
    state.error = readError(e);
    render();
  }
}

/* ------------------------------------------------------------------ export */

function reportHtml(): string {
  const wb = state.wb as WorkbookModel;
  const high = state.findings.filter((f) => f.severity === "high").length;
  const rows = state.findings
    .map(
      (f) =>
        "<tr><td>" + f.severity + "</td><td>" + esc(f.sheet) + (f.addr ? "!" + esc(f.addr) : "") + "</td><td>" +
        esc(f.title) + "</td><td>" + esc(f.detail) + "</td><td><code>" + esc(f.evidence) + "</code></td></tr>"
    )
    .join("");
  const sheetRows = wb.sheets
    .map(
      (s) =>
        "<tr><td>" + esc(s.name) + "</td><td>" + s.rows + "x" + s.cols + "</td><td>" + s.cellCount +
        "</td><td>" + s.formulaCount + "</td><td>" + esc(characterise(s)) + "</td></tr>"
    )
    .join("");
  const gen = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

  return (
    "<!doctype html><html lang=en><head><meta charset=utf-8><title>Workbook audit — " + esc(wb.fileName) +
    "</title><style>body{font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;color:#111}" +
    "table{border-collapse:collapse;width:100%;margin:12px 0 24px;font-size:14px}th,td{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}" +
    "th{background:#f6f6f6;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#555}code{background:#f4f4f6;padding:1px 4px;border-radius:3px;font-size:12px}" +
    ".meta{color:#666;font-size:13px}h1{font-size:24px;margin-bottom:4px}h2{font-size:17px;margin-top:32px}</style></head><body>" +
    "<h1>Workbook audit</h1><p class=meta>" + esc(wb.fileName) + " &middot; generated " + gen +
    " &middot; by SheetLens (local, offline)</p>" +
    "<p class=meta>" + wb.sheets.length + " sheets &middot; " + wb.totals.cells + " cells &middot; " +
    wb.totals.formulas + " formulas &middot; " + high + " high-risk findings</p>" +
    "<h2>Sheets</h2><table><tr><th>Sheet</th><th>Grid</th><th>Cells</th><th>Formulas</th><th>Character</th></tr>" +
    sheetRows + "</table><h2>Findings</h2>" +
    (rows
      ? "<table><tr><th>Severity</th><th>Location</th><th>Issue</th><th>Why it matters</th><th>Evidence</th></tr>" + rows + "</table>"
      : "<p>No risk patterns were detected.</p>") +
    "<p class=meta>Findings are heuristics with evidence attached. They indicate where a human should look; they are not an audit opinion.</p>" +
    "</body></html>"
  );
}

function exportReport(): void {
  if (!state.wb) return;
  const blob = new Blob([reportHtml()], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = state.wb.fileName.replace(/\.[^.]+$/, "") + "-audit.html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ events */

root.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const tabBtn = target.closest("[data-tab]") as HTMLElement | null;
  if (tabBtn) {
    state.tab = tabBtn.dataset.tab as Tab;
    render();
    return;
  }
  const action = (target.closest("[data-action]") as HTMLElement | null)?.dataset.action;
  if (action === "demo") loadDemo();
  if (action === "export") exportReport();
  if (action === "reset") {
    state.wb = null;
    state.findings = [];
    state.edges = [];
    state.error = null;
    state.filter = "";
    render();
  }
  if (action === "impact-run") {
    const input = document.getElementById("impactor") as HTMLInputElement | null;
    if (input) state.impact = refOfString(input.value);
    render();
  }
});

root.addEventListener("input", (e) => {
  const el = e.target as HTMLInputElement;
  if (el.id === "filter") {
    state.filter = el.value;
    const panel = document.getElementById("panel");
    if (panel) {
      const pos = el.selectionStart;
      panel.innerHTML = panelContent();
      const again = document.getElementById("filter") as HTMLInputElement | null;
      if (again) {
        again.focus();
        if (pos !== null) again.setSelectionRange(pos, pos);
      }
    }
  }
});

root.addEventListener("keydown", (e) => {
  const el = e.target as HTMLElement;
  if (el.getAttribute("role") !== "tab") return;
  const order: Tab[] = ["overview", "risks", "formulas", "impact"];
  const i = order.indexOf(el.dataset.tab as Tab);
  if (i === -1) return;
  let next = i;
  if (e.key === "ArrowRight") next = (i + 1) % order.length;
  else if (e.key === "ArrowLeft") next = (i - 1 + order.length) % order.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = order.length - 1;
  else return;
  e.preventDefault();
  state.tab = order[next];
  render();
  const nextTab = document.getElementById("tab-" + state.tab);
  nextTab?.focus();
});

render();

// Reproducible demo entry point: /?demo=1 loads the sample workbook.
if (new URLSearchParams(location.search).get("demo") === "1") {
  loadDemo();
}

export {};
