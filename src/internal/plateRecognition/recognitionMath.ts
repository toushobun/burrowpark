export const plateTokens = [
  "blank",
  "'",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "云",
  "京",
  "冀",
  "吉",
  "学",
  "宁",
  "川",
  "挂",
  "新",
  "晋",
  "桂",
  "民",
  "沪",
  "津",
  "浙",
  "渝",
  "港",
  "湘",
  "琼",
  "甘",
  "皖",
  "粤",
  "航",
  "苏",
  "蒙",
  "藏",
  "警",
  "豫",
  "贵",
  "赣",
  "辽",
  "鄂",
  "闽",
  "陕",
  "青",
  "鲁",
  "黑",
  "领",
  "使",
  "澳",
] as const;

const province =
  /^[云京冀吉宁川晋桂沪津浙渝湘琼甘皖粤苏蒙藏豫贵赣辽鄂闽陕青鲁黑]/u;

/** 根据 CTC blank 和连续重复索引解码，不在删除 blank 后再合并重复字。 */
export function decodePlate(
  logits: ArrayLike<number>,
  timesteps: number,
  classes: number,
  minConfidence = 0.65,
): string | null {
  if (
    timesteps < 1 ||
    classes < plateTokens.length ||
    logits.length < timesteps * classes
  )
    return null;
  let previous = -1;
  let text = "";
  let confidenceSum = 0;
  let count = 0;
  for (let t = 0; t < timesteps; t += 1) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let c = 0; c < classes; c += 1) {
      const score = logits[t * classes + c];
      if (score > bestScore) {
        bestScore = score;
        bestIndex = c;
      }
    }
    if (
      bestIndex !== 0 &&
      bestIndex !== previous &&
      bestIndex < plateTokens.length
    ) {
      text += plateTokens[bestIndex];
      confidenceSum += bestScore;
      count += 1;
    }
    previous = bestIndex;
  }
  if (count === 0 || confidenceSum / count < minConfidence) return null;
  if (
    !province.test(text) ||
    !/^[A-Z]$/.test(text[1] ?? "") ||
    !/^[A-Z0-9]{5,6}$/.test(text.slice(2))
  )
    return null;
  return text;
}

/** 使用单应性透视变换将四角车牌展平，识别输入保持宽高比并在右侧补零。 */
export function createPlateProjection(points: readonly number[]) {
  if (points.length !== 8 || points.some((value) => !Number.isFinite(value)))
    return null;
  const [x0, y0, x1, y1, x2, y2, x3, y3] = points;
  const width = Math.max(
    Math.hypot(x1 - x0, y1 - y0),
    Math.hypot(x2 - x3, y2 - y3),
  );
  const height = Math.max(
    Math.hypot(x3 - x0, y3 - y0),
    Math.hypot(x2 - x1, y2 - y1),
  );
  if (width < 2 || height < 2) return null;

  // 与官方 get_rotate_crop_image 一致：高牌逆时针旋转 90 度。
  const rotated = height / width >= 1.5;
  const ratio = rotated ? height / width : width / height;
  const resizedWidth = Math.min(160, Math.max(48, Math.ceil(48 * ratio)));

  // 从单位方形到检测四边形的反向采样映射，等价于透视矫正后取像素。
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  let g = 0;
  let h = 0;
  if (Math.abs(dx3) + Math.abs(dy3) > 1e-8) {
    const determinant = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(determinant) < 1e-8) return null;
    g = (dx3 * dy2 - dx2 * dy3) / determinant;
    h = (dx1 * dy3 - dx3 * dy1) / determinant;
  }
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  const sample = (u: number, v: number): [number, number] => {
    const tx = rotated ? 1 - v : u;
    const ty = rotated ? u : v;
    const divisor = g * tx + h * ty + 1;
    return [(a * tx + b * ty + x0) / divisor, (d * tx + e * ty + y0) / divisor];
  };

  if (sample(0.5, 0.5).some((value) => !Number.isFinite(value))) return null;
  return { resizedWidth, sample };
}

export type PlateDetection = {
  score: number;
  corners: readonly number[];
};

/** 将 YOLOv5 多任务头的四角点映射回原照片，过滤低置信度并去重。 */
export function selectDetections(
  output: ArrayLike<number>,
  count: number,
  stride: number,
  scale: number,
  offsetX: number,
  offsetY: number,
): PlateDetection[] {
  const candidates: PlateDetection[] = [];
  if (stride !== 15 || scale <= 0) return [];
  for (let i = 0; i < count; i += 1) {
    const at = i * stride;
    const objectness = output[at + 4];
    const score = objectness * Math.max(output[at + 13], output[at + 14]);
    if (!Number.isFinite(score) || score < 0.5) continue;
    const corners = Array.from({ length: 8 }, (_, point) => {
      const value = output[at + 5 + point];
      return (value - (point % 2 === 0 ? offsetX : offsetY)) / scale;
    });
    if (corners.some((v) => !Number.isFinite(v))) continue;
    candidates.push({ score, corners });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.filter((candidate, index) => {
    // 同一张车牌的重叠候选只保留置信度最高的一项。
    const center = [
      (candidate.corners[0] +
        candidate.corners[2] +
        candidate.corners[4] +
        candidate.corners[6]) /
        4,
      (candidate.corners[1] +
        candidate.corners[3] +
        candidate.corners[5] +
        candidate.corners[7]) /
        4,
    ];
    return !candidates.slice(0, index).some((existing) => {
      const other = [
        (existing.corners[0] +
          existing.corners[2] +
          existing.corners[4] +
          existing.corners[6]) /
          4,
        (existing.corners[1] +
          existing.corners[3] +
          existing.corners[5] +
          existing.corners[7]) /
          4,
      ];
      return Math.hypot(center[0] - other[0], center[1] - other[1]) < 20;
    });
  });
}
