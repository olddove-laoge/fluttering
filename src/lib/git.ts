import { execSync } from 'child_process';
import path from 'path';

const blogRoot = path.join(process.cwd(), '..');

export interface GitStatus {
  hasChanges: boolean;
  modified: string[];
  untracked: string[];
  lastCommit?: string;
}

export function getGitStatus(): GitStatus {
  try {
    // 获取修改的文件
    const modifiedOutput = execSync('git diff --name-only', {
      cwd: blogRoot,
      encoding: 'utf8'
    }).trim();

    // 获取未跟踪的文件
    const untrackedOutput = execSync('git ls-files --others --exclude-standard', {
      cwd: blogRoot,
      encoding: 'utf8'
    }).trim();

    // 获取最后一次提交
    const lastCommit = execSync('git log -1 --format="%h %s"', {
      cwd: blogRoot,
      encoding: 'utf8'
    }).trim();

    const modified = modifiedOutput ? modifiedOutput.split('\n') : [];
    const untracked = untrackedOutput ? untrackedOutput.split('\n') : [];

    return {
      hasChanges: modified.length > 0 || untracked.length > 0,
      modified,
      untracked,
      lastCommit,
    };
  } catch (error) {
    return {
      hasChanges: false,
      modified: [],
      untracked: [],
    };
  }
}

export function commitAndPush(message: string): { success: boolean; output: string } {
  try {
    // 添加所有更改
    execSync('git add .', { cwd: blogRoot });

    // 提交
    execSync(`git commit -m "${message}"`, { cwd: blogRoot });

    // 推送
    const pushOutput = execSync('git push', {
      cwd: blogRoot,
      encoding: 'utf8'
    });

    return {
      success: true,
      output: pushOutput,
    };
  } catch (error: any) {
    return {
      success: false,
      output: error.message,
    };
  }
}
