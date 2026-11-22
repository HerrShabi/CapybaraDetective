// Which cases you've solved (kept in this browser): case 2 unlocks after case 1.
const KEY = 'detective.solved';

export function solvedCases() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function markSolved(n) {
  const solved = solvedCases();
  if (solved.includes(n)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...solved, n]));
  } catch {}
}

export const isUnlocked = (n) => n === 1 || solvedCases().includes(n - 1);
