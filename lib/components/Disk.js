import { common } from 'node-karin'
import systemInformation from 'systeminformation';
import { dirPath } from '#template'
import { execSync } from 'child_process';
import os from 'os';
import { Config } from '#template'

const platform = os.platform();

/**
 * 转换字节大小为更易读的格式（KB, MB, GB 等）
 * @param {number} bytes - 字节数
 * @return {string} 转换后的大小
 */
function formatSizeUnits(bytes) {
  if (bytes >= 1073741824) {
    return (bytes / 1073741824).toFixed(2) + ' GB';
  } else if (bytes >= 1048576) {
    return (bytes / 1048576).toFixed(2) + ' MB';
  } else if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else if (bytes > 1) {
    return bytes.toFixed(2) + ' B';
  } else if (bytes === 1) {
    return bytes + ' byte';
  } else {
    return '0 bytes';
  }
}

/**
 * 获取磁盘使用情况
 * @return {Promise<Object>} 包含磁盘使用情况的对象
 */
export async function getDiskUsageCircle() {
  try {
    let fsSize
    if (Config.Config.wmic && platform === 'win32') {
      // 获取磁盘分区信息
      const result = execSync('wmic logicaldisk get size,freespace,caption').toString().trim();
      // 解析命令输出
      const lines = result.split('\n').slice(1); // 跳过表头
      fsSize = lines.map(line => {
        const [caption, freeSpace, size] = line.trim().split(/\s+/);
        return {
          fs: caption,
          size: parseInt(size, 10),
          used: parseInt(size, 10) - parseInt(freeSpace, 10),
          free: parseInt(freeSpace, 10),
        };
      });
    } else {
      fsSize = (await systemInformation.get({ fsSize: 'fs,use,used,size' })).fsSize;
    }
    const disk = fsSize.find(d => os.platform() === 'win32' ? common.absPath(dirPath).startsWith(d.fs) : d.fs.startsWith('/'));

    if (!disk) {
      throw new Error('无法找到含有插件根目录的磁盘');
    }

    return {
      text: `${formatSizeUnits(disk.used)} / ${formatSizeUnits(disk.size)}`,
      progress: disk.use / 100
    };
  } catch (error) {
    console.error('获取磁盘信息时出错:', error);
    return {
      text: "0 B / 0 B",
      progress: 0
    };
  }
}
