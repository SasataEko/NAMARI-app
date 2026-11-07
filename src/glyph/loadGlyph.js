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
  const paths = [...svg.querySelectorAll('path')];
  if (!paths.length) throw new Error(`${url} 不包含任何 path 元素。请将字形转换为轮廓路径。`);
  const shapes = paths.map((path, index) => {
    const d = path.getAttribute('d');
    if (!d?.trim()) throw new Error(`${url} 的第 ${index + 1} 个 path 缺少 d 路径数据。`);
    return { d, fill: path.getAttribute('fill') || '#183f3a' };
  });
  const [x, y, width, height] = viewBox.trim().split(/[ ,]+/).map(Number);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new Error(`${url} 的 viewBox 格式无效：${viewBox}`);
  }
  return { url, viewBox, shapes };
}
