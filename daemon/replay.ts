// Vesper XB-8000 replay server. Listens on TCP :39150 — the same port the
// real Vesper serves NMEA 0183 on — and streams either the scripted scenario
// (default) or a recorded raw NMEA log (--file). Point a Signal K TCP-client
// data connection at <this-machine>:39150 and SK cannot tell it from the boat.
//
//   npm run replay                    scripted scenario, forever
//   npm run replay -- --file log.nmea recorded log, paced 1 s per RMC, looped
//   npm run replay -- --port 10110    alternate port
//   npm run replay -- --strict-timing no greeting burst: joiners wait out real
//                                     static cycles (up to 6 min per name),
//                                     like a real radio — the lossy join phase
//   npm run replay -- --own-mmsi N    MMSI own-ship VDO transmits. MUST match
//                                     the MMSI in Signal K's vessel settings,
//                                     or SK files own-ship as a separate vessel
//                                     and the scope grows a phantom Irene
//                                     trailing astern
//
// Bench: run on the Mac, point the Pi's SK connection at <mac-ip>:39150.
// Dockside rehearsal: identical, before ever touching the real radio at
// 192.168.15.1:39150. Recording a real session for later replay:
//   nc 192.168.15.1 39150 > vesper-$(date +%Y%m%d).nmea
import net from "node:net";
import { readFileSync } from "node:fs";
import { sentencesAt, greetingAt, MMSI } from "../lib/replay/scenario";

const args = process.argv.slice(2);
const argOf = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const PORT = Number(argOf("--port") ?? 39150);
const FILE = argOf("--file");
const STRICT = args.includes("--strict-timing");
const OWN_MMSI = Number(argOf("--own-mmsi") ?? MMSI.own);

// A recorded log replays in 1-second frames split on RMC sentences (each RMC
// marks a new GPS second on the wire), looping when it runs out.
function frameLog(lines: string[]): string[][] {
  const frames: string[][] = [];
  let cur: string[] = [];
  for (const line of lines) {
    if (/^\$..RMC/.test(line) && cur.length > 0) {
      frames.push(cur);
      cur = [];
    }
    cur.push(line);
  }
  if (cur.length > 0) frames.push(cur);
  return frames;
}

const logFrames = FILE
  ? frameLog(readFileSync(FILE, "utf8").split(/\r?\n/).filter((l) => l.startsWith("$") || l.startsWith("!")))
  : null;

const clients = new Set<net.Socket>();
const server = net.createServer((sock) => {
  clients.add(sock);
  console.log(`[replay] client connected (${clients.size} total) from ${sock.remoteAddress}`);
  // Greeting goes out half a beat after connect: Signal K's TCP provider can
  // open the socket a moment before its parse pipeline is consuming, and
  // bytes landing in that gap are silently dropped (observed against
  // signalk-server 2.30.0 — the periodic stream was unaffected).
  if (!STRICT && !logFrames) {
    const greet = greetingAt(t, OWN_MMSI).map((s) => s + "\r\n").join("");
    setTimeout(() => { if (!sock.destroyed) sock.write(greet); }, 500);
  }
  sock.on("close", () => {
    clients.delete(sock);
    console.log(`[replay] client disconnected (${clients.size} remain)`);
  });
  sock.on("error", () => sock.destroy());
});

let t = 0;
setInterval(() => {
  const sentences = logFrames ? logFrames[t % logFrames.length] : sentencesAt(t, OWN_MMSI);
  const chunk = sentences.map((s) => s + "\r\n").join("");
  for (const c of clients) c.write(chunk);
  t++;
}, 1000);

server.listen(PORT, () => {
  console.log(`[replay] Vesper XB-8000 impersonator on tcp :${PORT}`);
  console.log(`[replay] source: ${FILE ? `recorded log ${FILE} (${logFrames!.length} frames, looping)` : "scripted Bahía de Banderas scenario"}`);
  if (!FILE) console.log(`[replay] own-ship MMSI ${OWN_MMSI} — Signal K's vessel MMSI must match or the scope grows a phantom own-ship`);
  console.log(`[replay] point a Signal K TCP-client connection here and watch the scope.`);
});
