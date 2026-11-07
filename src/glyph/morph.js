import { interpolateAll } from 'flubber';

/** 按素材中的 path 顺序建立多轮廓插值器。 */
export function createMorph(from, to) {
  if (from.length !== to.length) {
    throw new Error(`两份素材的 path 数量不同（普通字形 ${from.length} 个，自定义字形 ${to.length} 个）。请按相同顺序提供相同数量的轮廓。`);
  }
  try {
    return interpolateAll(from, to, { maxSegmentLength: 3 });
  } catch (cause) {
    throw new Error(`路径无法插值：${cause.message || cause}。请检查轮廓是否闭合、路径数据是否有效，以及轮廓/孔洞结构是否兼容。`);
  }
}

/** 在同一 SVG 画布内连续更新 d 属性。 */
export function animateMorph(paths, from, to, duration = 1000, onDone = () => {}) {
  const interpolation = createMorph(from, to);
  const start = performance.now();
  let frame;
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const shapes = interpolation.map((interpolateShape) => interpolateShape(ease(progress)));
    shapes.forEach((shape, index) => paths[index].setAttribute('d', shape));
    if (progress < 1) frame = requestAnimationFrame(tick);
    else onDone();
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
