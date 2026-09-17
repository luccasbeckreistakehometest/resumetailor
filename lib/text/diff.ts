/**
 * Side-by-side line diff (LCS) between the original résumé and the rewritten one, with word-level
 * marks inside changed lines. Pure; small inputs (a résumé), so the quadratic table is fine.
 */
export type DiffRow =
  | { kind: "same"; a: string; b: string; bIndex: number }
  | { kind: "change"; a: string; b: string; bIndex: number }
  | { kind: "add"; b: string; bIndex: number }
  | { kind: "del"; a: string; bIndex: number };

const norm = (l: string) => l.replace(/^\s*[-*•]\s+|^#+\s+|\*\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();

export function diffLines(original: string, next: string): DiffRow[] {
  const A = original.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim());
  const Braw = next.replace(/\r\n?/g, "\n").split("\n");
  const B = Braw.map((l, i) => ({ l, i })).filter((x) => x.l.trim());
  const n = A.length, m = B.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = norm(A[i]) === norm(B[j].l) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const raw: DiffRow[] = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && norm(A[i]) === norm(B[j].l)) { raw.push({ kind: "same", a: A[i], b: B[j].l, bIndex: B[j].i }); i++; j++; }
    else if (j < m && (i >= n || dp[i][j + 1] > dp[i + 1][j])) { raw.push({ kind: "add", b: B[j].l, bIndex: B[j].i }); j++; }
    else { raw.push({ kind: "del", a: A[i], bIndex: j < m ? B[j].i : Braw.length }); i++; }
  }
  // A deleted line directly followed by an added one is a change of that line.
  const out: DiffRow[] = [];
  for (let k = 0; k < raw.length; k++) {
    const cur = raw[k], nxt = raw[k + 1];
    if (cur.kind === "del" && nxt?.kind === "add") { out.push({ kind: "change", a: cur.a, b: nxt.b, bIndex: nxt.bIndex }); k++; }
    else out.push(cur);
  }
  return out;
}

/** Word-level marks: which words of `b` are new relative to `a`. */
export function wordMarks(a: string, b: string): { text: string; added: boolean }[] {
  const have = new Set(a.toLowerCase().split(/\s+/));
  return b.split(/(\s+)/).map((w) => ({ text: w, added: !!w.trim() && !have.has(w.toLowerCase()) }));
}

/**
 * "Undo this line": the rewritten résumé with one row reverted — a changed line goes back to the
 * original wording (keeping the bullet), an added line is removed, a removed line comes back.
 */
export function undoRow(next: string, row: DiffRow): string {
  const lines = next.replace(/\r\n?/g, "\n").split("\n");
  const bulletOf = (l: string) => l.match(/^\s*[-*•]\s+/)?.[0] ?? "";
  const bare = (l: string) => l.replace(/^\s*[-*•]\s+/, "").trim();
  if (row.kind === "change") lines[row.bIndex] = `${bulletOf(lines[row.bIndex])}${bare(row.a)}`;
  else if (row.kind === "add") lines.splice(row.bIndex, 1);
  else if (row.kind === "del") lines.splice(row.bIndex, 0, `- ${bare(row.a)}`);
  return lines.join("\n");
}
