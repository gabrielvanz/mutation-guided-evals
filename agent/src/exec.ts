import { spawn, spawnSync } from "node:child_process";

export interface ExecResult {
  code: number | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  ms: number;
}

export function run(
  cmd: string,
  args: string[],
  opts: { cwd: string; timeoutMs: number; env?: NodeJS.ProcessEnv; maxBytes?: number },
): Promise<ExecResult> {
  const maxBytes = opts.maxBytes ?? 4_000_000;
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: { ...process.env, CI: "1", FORCE_COLOR: "0", NO_COLOR: "1", ...opts.env },
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const cap = (cur: string, chunk: Buffer): string => (cur.length >= maxBytes ? cur : cur + chunk.toString("utf8"));
    child.stdout.on("data", (c: Buffer) => (stdout = cap(stdout, c)));
    child.stderr.on("data", (c: Buffer) => (stderr = cap(stderr, c)));
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (process.platform === "win32") {
          // Windows não tem grupos de processo POSIX: encerra a árvore inteira via taskkill.
          if (child.pid) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
        } else if (child.pid) process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }, opts.timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, timedOut, stdout, stderr, ms: Date.now() - t0 });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: null, timedOut, stdout, stderr: stderr + String(err), ms: Date.now() - t0 });
    });
  });
}
