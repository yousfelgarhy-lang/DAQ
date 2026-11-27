export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readingTimeMinutes: number;
  readingTimeLabel: string;
}

export function analyzeText(input: string): TextStats {
  const characters = input.length;
  const charactersNoSpaces = input.replace(/\s/g, '').length;
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      words: 0,
      characters,
      charactersNoSpaces: 0,
      sentences: 0,
      paragraphs: 0,
      readingTimeMinutes: 0,
      readingTimeLabel: '0 ثانية',
    };
  }

  const wordMatches = trimmed.match(/[\p{L}\p{N}\p{M}_'-]+/gu);
  const words = wordMatches ? wordMatches.length : 0;

  const sentenceParts = trimmed
    .split(/[.!?؟؛\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentences = sentenceParts.length;

  const paragraphParts = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const paragraphs = paragraphParts.length || 1;

  // Average reading speed ~200 words/minute
  const totalSeconds = Math.ceil((words / 200) * 60);
  const readingTimeMinutes = Math.round((words / 200) * 10) / 10;

  let readingTimeLabel = '0 ثانية';
  if (words > 0) {
    if (totalSeconds < 60) {
      readingTimeLabel = `${totalSeconds} ثانية`;
    } else {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      readingTimeLabel = secs > 0 ? `${mins} د و ${secs} ث` : `${mins} دقيقة`;
    }
  }

  return {
    words,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs,
    readingTimeMinutes,
    readingTimeLabel,
  };
}

export type TextTransformAction =
  | 'uppercase'
  | 'lowercase'
  | 'titlecase'
  | 'removeExtraSpaces'
  | 'removeEmptyLines'
  | 'removeDuplicateLines'
  | 'reverseText';

export function transformText(input: string, action: TextTransformAction): string {
  switch (action) {
    case 'uppercase':
      return input.toUpperCase();
    case 'lowercase':
      return input.toLowerCase();
    case 'titlecase':
      return input.replace(/\b([a-zA-Z])([a-zA-Z]*)/g, (_, first: string, rest: string) => {
        return first.toUpperCase() + rest.toLowerCase();
      });
    case 'removeExtraSpaces':
      return input
        .split('\n')
        .map((line) => line.replace(/[ \t]+/g, ' ').trim())
        .join('\n');
    case 'removeEmptyLines':
      return input
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0)
        .join('\n');
    case 'removeDuplicateLines': {
      const seen = new Set<string>();
      const result: string[] = [];
      for (const line of input.split(/\r?\n/)) {
        if (!seen.has(line)) {
          seen.add(line);
          result.push(line);
        }
      }
      return result.join('\n');
    }
    case 'reverseText':
      return Array.from(input).reverse().join('');
    default:
      return input;
  }
}

export type DiffTokenType = 'equal' | 'added' | 'removed';

export interface DiffToken {
  type: DiffTokenType;
  value: string;
}

export interface TextComparisonResult {
  tokens: DiffToken[];
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  isIdentical: boolean;
}

function tokenizeWords(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return trimmed.split(/\s+/);
}

export function compareTexts(originalText: string, modifiedText: string): TextComparisonResult {
  const a = tokenizeWords(originalText);
  const b = tokenizeWords(modifiedText);

  const m = a.length;
  const n = b.length;

  // Build LCS DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const tokens: DiffToken[] = [];
  let i = 0;
  let j = 0;
  let addedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;

  while (i < m && j < n) {
    if (a[i] === b[j]) {
      tokens.push({ type: 'equal', value: a[i] });
      unchangedCount++;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      tokens.push({ type: 'removed', value: a[i] });
      removedCount++;
      i++;
    } else {
      tokens.push({ type: 'added', value: b[j] });
      addedCount++;
      j++;
    }
  }

  while (i < m) {
    tokens.push({ type: 'removed', value: a[i] });
    removedCount++;
    i++;
  }

  while (j < n) {
    tokens.push({ type: 'added', value: b[j] });
    addedCount++;
    j++;
  }

  return {
    tokens,
    addedCount,
    removedCount,
    unchangedCount,
    isIdentical: addedCount === 0 && removedCount === 0,
  };
}
