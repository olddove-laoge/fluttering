import fs from 'fs';
import path from 'path';

export function getBackgroundImages(): string[] {
  const bgDir = path.join(process.cwd(), 'public', 'bg');

  try {
    if (!fs.existsSync(bgDir)) {
      // 如果 bg 目录不存在，返回默认背景图
      return ['/images/bg.png'];
    }

    const files = fs.readdirSync(bgDir);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

    const images = files
      .filter((file) => imageExtensions.includes(path.extname(file).toLowerCase()))
      .sort() // 按文件名排序
      .map((file) => `/bg/${file}`);

    // 如果没有图片，返回默认背景
    return images.length > 0 ? images : ['/images/bg.png'];
  } catch {
    return ['/images/bg.png'];
  }
}
