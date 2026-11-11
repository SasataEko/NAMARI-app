import { interpolateAll } from 'flubber';

/** 按素材中的 path 顺序建立多轮廓插值器。 */
export function createMorph(from, to) {
  if (from.length !== to.length) {
    throw new Error(`两份素材的 path 数量不同（普通字形 ${from.length} 个，自定义字形 ${to.length} 个）。请按相同顺序提供相同数量的轮廓。`);
  }
  try {
    const interpolation = interpolateAll(from, to, { maxSegmentLength: 3 });
    // 预先在中点采样，避免素材在拖动滑块时才暴露插值错误。
    const midpoint = interpolation.map((interpolateShape) => interpolateShape(0.5));
    if (midpoint.some((shape) => typeof shape !== 'string' || !shape.includes('M'))) {
      throw new Error('中间态没有生成有效的 SVG 路径数据');
    }
    interpolation.from = [...from];
    interpolation.to = [...to];
    return interpolation;
  } catch (cause) {
    throw new Error(`路径无法插值：${cause.message || cause}。请检查轮廓是否闭合、路径数据是否有效，以及轮廓/孔洞结构是否兼容。`);
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
