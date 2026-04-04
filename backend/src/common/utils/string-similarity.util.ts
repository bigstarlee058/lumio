export function calculateStringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (str1 === str2) {
    return 1;
  }

  if (len1 === 0) {
    return len2 === 0 ? 1 : 0;
  }

  if (len2 === 0) {
    return 0;
  }

  if (str1.includes(str2) || str2.includes(str1)) {
    return 0.8;
  }

  const matrix: number[][] = [];

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }

  const maxLen = Math.max(len1, len2);
  const distance = matrix[len2][len1];
  return 1 - distance / maxLen;
}
