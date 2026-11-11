/** 加载 SVG，读取 viewBox 和有序轮廓；多笔画使用多个 path 元素。 */
export async function loadGlyph(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`素材读取失败：${url}（HTTP ${response.status}）`);
  const source = await response.text();
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw new Error(`SVG 解析失败：${url}`);
  const svg = doc.documentElement;
  const viewBox = svg.getAttribute('viewBox');
  if (!viewBox) throw new Error(`${url} 缺少 viewBox 属性。`);
  if (svg.querySelector('[transform]')) throw new Error(`${url} 含有 transform 属性；当前插值器不会展平变换，请先在 Illustrator 中扩展外观/变换后导出。`);
  if (svg.querySelector('mask, clipPath, filter, use, image')) throw new Error(`${url} 含有 mask、clipPath、filter、use 或 image 结构；当前 path 插值器无法可靠还原这些效果。`);
  const classFills = readClassFills(doc);
  const paths = [...svg.querySelectorAll('path')];
  if (!paths.length) throw new Error(`${url} 不包含任何 path 元素。请将字形转换为轮廓路径。`);
  const shapes = paths.map((path, index) => {
    const d = path.getAttribute('d');
    if (!d?.trim()) throw new Error(`${url} 的第 ${index + 1} 个 path 缺少 d 路径数据。`);
    return {
      d,
      fill: readPathFill(path, classFills) || '#231815',
      fillRule: path.getAttribute('fill-rule') || path.style.fillRule || '',
      clipRule: path.getAttribute('clip-rule') || path.style.clipRule || '',
      opacity: path.getAttribute('opacity') || path.style.opacity || '',
    };
  });
  const [x, y, width, height] = viewBox.trim().split(/[ ,]+/).map(Number);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new Error(`${url} 的 viewBox 格式无效：${viewBox}`);
  }
  return { url, viewBox, shapes };
}

// 读取 SVG <style> 中简单的 class 填充规则（例如 Illustrator 导出的 .cls-1）。
function readClassFills(doc) {
  const result = new Map();
  const css = [...doc.querySelectorAll('style')].map((node) => node.textContent || '').join('\n');
  for (const [, selectorText, declarations] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const fill = declarations.match(/(?:^|;)\s*fill\s*:\s*([^;]+)\s*;?/i)?.[1]?.trim();
    if (!fill) continue;
    for (const selector of selectorText.split(',')) {
      const className = selector.trim().match(/^\.([\w-]+)$/)?.[1];
      if (className) result.set(className, fill);
    }
  }
  return result;
}

function readPathFill(path, classFills) {
  const inlineFill = path.getAttribute('fill') || path.style.fill;
  if (inlineFill) return inlineFill;
  for (const className of path.classList) {
    if (classFills.has(className)) return classFills.get(className);
  }
  return path.parentElement?.closest('[fill]')?.getAttribute('fill') || '';
}
