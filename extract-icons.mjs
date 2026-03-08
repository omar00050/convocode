import fs from 'fs';
import path from 'path';

const iconsDir = './node_modules/lucide-react/dist/esm/icons/';
const iconNames = [
  // Arrows & navigation
  'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up-right', 'arrow-down-left',
  'chevron-up', 'chevron-down', 'chevron-left', 'chevron-right', 'chevrons-up', 'chevrons-down',
  'move', 'rotate-cw', 'rotate-ccw', 'undo-2', 'redo-2', 'refresh-cw', 'corner-up-right',
  // UI Controls
  'search', 'settings', 'menu', 'x', 'check', 'plus', 'minus', 'filter', 'sliders',
  'grid-3x3', 'list', 'eye', 'eye-off', 'lock', 'unlock', 'bell', 'bell-off',
  'zoom-in', 'zoom-out', 'maximize', 'minimize', 'more-horizontal', 'more-vertical',
  // Media
  'play', 'pause', 'stop-circle', 'skip-forward', 'skip-back', 'volume-2', 'volume-x',
  'mic', 'mic-off', 'camera', 'video', 'image', 'film', 'music', 'headphones', 'radio',
  // Communication
  'mail', 'phone', 'message-circle', 'message-square', 'send', 'inbox', 'at-sign',
  'link', 'link-2', 'share-2', 'reply', 'rss',
  // Files & Docs
  'file', 'folder', 'folder-open', 'download', 'upload', 'save', 'copy', 'clipboard',
  'pen-tool', 'trash-2', 'archive', 'book', 'bookmark', 'file-text', 'paperclip', 'scissors',
  // Social
  'heart', 'thumbs-up', 'thumbs-down', 'star', 'flag', 'smile', 'frown', 'award',
  'trophy', 'gift', 'zap', 'trending-up', 'trending-down',
  // Weather
  'sun', 'moon', 'cloud', 'cloud-rain', 'cloud-snow', 'wind', 'snowflake',
  'thermometer', 'droplets', 'umbrella', 'sunrise', 'sunset',
  // Commerce
  'shopping-cart', 'shopping-bag', 'credit-card', 'tag', 'percent', 'dollar-sign',
  'receipt', 'wallet', 'package', 'truck',
  // Devices
  'monitor', 'smartphone', 'tablet', 'laptop', 'cpu', 'server', 'wifi', 'bluetooth',
  'battery', 'usb', 'hard-drive',
  // Shapes
  'circle', 'square', 'triangle', 'hexagon', 'octagon', 'layers', 'box', 'layout',
  // People
  'user', 'users', 'user-plus', 'user-minus', 'user-check', 'person-standing',
  // Misc
  'map', 'map-pin', 'globe', 'house', 'building-2', 'key', 'shield', 'alert-triangle',
  'info', 'help-circle', 'loader-2', 'external-link', 'qr-code', 'bar-chart-2',
  'pie-chart', 'code-2', 'terminal', 'bug', 'wrench', 'settings-2'
];

function extractPath(content) {
  const paths = [];
  // Match path elements with d attribute
  const pathRegex = /\["path",\s*\{\s*d:\s*"([^"]+)"/g;
  let match;
  while ((match = pathRegex.exec(content)) !== null) {
    paths.push(match[1]);
  }

  // Match circle elements and convert to path
  const circleRegex = /\["circle",\s*\{\s*cx:\s*"([^"]+)",\s*cy:\s*"([^"]+)",\s*r:\s*"([^"]+)"/g;
  while ((match = circleRegex.exec(content)) !== null) {
    const cx = parseFloat(match[1]);
    const cy = parseFloat(match[2]);
    const r = parseFloat(match[3]);
    // Convert circle to path
    const pathStr = `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`;
    paths.push(pathStr);
  }

  // Match line elements and convert to path
  const lineRegex = /\["line",\s*\{\s*x1:\s*"([^"]+)",\s*x2:\s*"([^"]+)",\s*y1:\s*"([^"]+)",\s*y2:\s*"([^"]+)"/g;
  while ((match = lineRegex.exec(content)) !== null) {
    const x1 = parseFloat(match[1]);
    const x2 = parseFloat(match[2]);
    const y1 = parseFloat(match[3]);
    const y2 = parseFloat(match[4]);
    paths.push(`M ${x1},${y1} L ${x2},${y2}`);
  }

  // Match polyline and convert to path
  const polylineRegex = /\["polyline",\s*\{\s*points:\s*"([^"]+)"/g;
  while ((match = polylineRegex.exec(content)) !== null) {
    paths.push(`M ${match[1].replace(/ /g, ' L ')}`);
  }

  return paths.join(' ');
}

const results = [];
for (const name of iconNames) {
  const filePath = path.join(iconsDir, name + '.js');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const pathData = extractPath(content);
    if (pathData) {
      results.push({ name, path: pathData });
    } else {
      console.error('No path for:', name);
    }
  } catch (e) {
    console.error('Missing:', name);
  }
}

console.log(JSON.stringify(results, null, 2));
