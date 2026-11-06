#!/bin/bash
# Runs on every boot via the card hook. Every step is safe to repeat.
B=/boot/firmware; [ -f "$B/cmdline.txt" ] || B=/boot
echo "== run $(date -u)"
echo "== clock from Vesper GPS"
L=$(timeout 8 bash -c 'cat < /dev/tcp/192.168.15.1/39150' 2>/dev/null | grep -a -m1 -E '^\$G[PN]RMC,[0-9.]+,A,')
if [ -n "$L" ]; then
  t=$(echo "$L" | cut -d, -f2); d=$(echo "$L" | cut -d, -f10)
  date -u -s "20${d:4:2}-${d:2:2}-${d:0:2} ${t:0:2}:${t:2:2}:${t:4:2}" && hwclock -w 2>/dev/null
fi
echo "clock now: $(date -u)"
echo "== fixed address 192.168.15.200 (in addition to DHCP)"
if ! nmcli -g ipv4.addresses connection show vesper | grep -q 192.168.15.200; then
  nmcli connection modify vesper +ipv4.addresses 192.168.15.200/24 && nmcli connection up vesper && echo "added .200"
fi
ip -4 addr show wlan0 | grep inet
echo "== wifi power save"
mkdir -p /etc/NetworkManager/conf.d
if [ ! -f /etc/NetworkManager/conf.d/trident-powersave.conf ]; then
  printf '[connection]\nwifi.powersave = 2\n' > /etc/NetworkManager/conf.d/trident-powersave.conf
  echo "wrote NM powersave=off (persistent)"
fi
iw dev wlan0 set power_save off 2>&1
echo "power_save now: $(iw dev wlan0 get power_save 2>&1)"
echo "== caddy cache headers"
C=/etc/caddy/Caddyfile
if ! grep -q "no-cache" "$C"; then
  [ -f "$C.pre-cache" ] || cp -p "$C" "$C.pre-cache"
  cat > "$C" <<'EOC'
:80 {
	root * /home/garry/trident/out
	# Hashed build files never change under the same name: cache forever.
	@static path /_next/static/* /fonts/*
	header @static Cache-Control "public, max-age=31536000, immutable"
	# Pages, route payloads, manifest, icons: always re-check, so a new build
	# shows up on the next open instead of mixing old pages with new code.
	@pages not path /_next/static/* /fonts/*
	header @pages Cache-Control "no-cache"
	try_files {path} {path}.html {path}/index.html /index.html
	file_server
}
EOC
  if caddy validate --config "$C" --adapter caddyfile >/dev/null 2>&1; then systemctl reload caddy && echo "caddy reloaded (static immutable, pages no-cache)"; else cp -p "$C.pre-cache" "$C"; systemctl reload caddy; echo "caddy change FAILED, restored"; fi
fi
curl -sI http://localhost/ | grep -i -E "^HTTP|cache-control"
curl -sI http://localhost/_next/static/chunks/$(ls /home/garry/trident/out/_next/static/chunks | grep webpack | head -1) | grep -i -E "^HTTP|cache-control"
echo "== app install"
if [ -f "$B/trident-out.tar.gz" ]; then
  cd /home/garry/trident || exit
  rm -rf out.prev; mv out out.prev; mkdir out
  tar xzf "$B/trident-out.tar.gz" -C out && chown -R garry:garry out && rm -f "$B/trident-out.tar.gz" && echo "installed new out/ (old kept as out.prev)"
fi
echo "anchor page present: $([ -f /home/garry/trident/out/anchor.html ] && echo yes || echo no)"
echo "watchdog present: $(grep -c trd-boot-err /home/garry/trident/out/index.html)"
echo "== signalk -> vesper"
S=/home/garry/.signalk/settings.json
[ -f "$S.pre-vesper" ] || cp -p "$S" "$S.pre-vesper"
node -e '
const fs=require("fs"),f=process.argv[1],s=JSON.parse(fs.readFileSync(f,"utf8"));let ch=0;
for(const p of (s.pipedProviders||[])){for(const e of (p.pipeElements||[])){const o=e.options&&e.options.subOptions;
 if(o&&o.type==="tcp"&&!(o.host==="192.168.15.1"&&String(o.port)==="39150")){o.host="192.168.15.1";o.port="39150";ch++}}
 if(p.enabled===false){p.enabled=true;ch++}
 console.log(p.id,"enabled="+(p.enabled!==false),JSON.stringify((p.pipeElements||[]).map(e=>{const o=e.options&&e.options.subOptions||{};return {type:o.type,host:o.host,port:o.port}})))}
if(ch){fs.writeFileSync(f,JSON.stringify(s,null,2));console.log("changed",ch,"-> restarting signalk")}else console.log("already on vesper")
process.exit(ch?10:0)' "$S"
[ $? -eq 10 ] && systemctl restart signalk
sleep 30
echo "== signalk self"
curl -s http://localhost:3000/signalk/v1/api/vessels/self | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const v=JSON.parse(d),n=v.navigation||{};console.log("mmsi:",v.mmsi,"| pos:",JSON.stringify(n.position&&n.position.value),"| sog:",n.speedOverGround&&n.speedOverGround.value)}catch(e){console.log("parse fail",d.slice(0,200))}})'
echo "== ais targets"
curl -s http://localhost:3000/signalk/v1/api/vessels | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const v=JSON.parse(d);const k=Object.keys(v).filter(x=>!x.startsWith("self"));console.log(k.length,"contacts");for(const x of k.slice(0,15))console.log(" ",x,v[x].name||"")}catch(e){console.log("parse fail")}})'
echo "== signalk log"; journalctl -u signalk -b --no-pager -n 15
echo "== end"
