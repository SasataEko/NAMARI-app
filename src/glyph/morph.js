import { interpolateAll } from 'flubber';

/** 按素材中的 path 顺序建立多轮廓插值器。 */
export function createMorph(from, to) {
  if (from.length !== to.length) {
    throw new Error(`pathの数が異なります（通常字形 ${from.length}、変形後 ${to.length}）。同じ数・順序の輪郭を用意してください。`);
  }
  try {
    const interpolation = interpolateAll(from, to, { maxSegmentLength: 3 });
    // 预先在中点采样，避免素材在拖动滑块时才暴露插值错误。
    const midpoint = interpolation.map((interpolateShape) => interpolateShape(0.5));
    if (midpoint.some((shape) => typeof shape !== 'string' || !shape.includes('M'))) {
      throw new Error('変形途中のSVGパスを生成できませんでした。');
    }
    interpolation.from = [...from];
    interpolation.to = [...to];
    return interpolation;
  } catch (cause) {
    throw new Error(`パスを補間できません：${cause.message || cause}。閉じた輪郭・パスデータ・穴の構造を確認してください。`);
  }
}

/** 将 0～1 的连续进度直接写入现有 SVG path，供滑块和统计预览复用。 */
export function setMorphIntensity(paths, interpolation, intensity) {
  const amount = Math.max(0, Math.min(1, Number(intensity) || 0));
  const shapes = amount === 0
    ? interpolation.from
    : amount === 1
      ? interpolation.to
      : interpolation.map((interpolateShape) => interpolateShape(amount));
  shapes.forEach((shape, index) => paths[index]?.setAttribute('d', shape));
}

/** 在同一 SVG 画布内连续更新 d 属性。 */
export function animateMorph(paths, from, to, duration = 1000, onDone = () => {}) {
  const interpolation = createMorph(from, to);
  const start = performance.now();
  let frame;
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    setMorphIntensity(paths, interpolation, ease(progress));
    if (progress < 1) frame = requestAnimationFrame(tick);
    else onDone();
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
