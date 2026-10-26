export const flag = (k: string): string | undefined => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

export async function run(cmd: string[], must = false): Promise<{ code: number; stdout: string; stderr: string }> {
  const p = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  if (must && code !== 0) throw new Error(`${cmd[0]} exited ${code}: ${stderr.slice(-600)}`);
  return { code, stdout, stderr };
}
