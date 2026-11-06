# Pi access via the SD card (no network path needed)

Aboard, the Mac is on Starlink and the Pi is on the Vesper XB-8000's WiFi, so
there is no SSH path. The boot partition of the Pi's microSD (mounts on the Mac
as `/Volumes/bootfs`, FAT) is the channel.

## The card hook (installed Nov 6, 2026)
`/usr/local/sbin/trident-diag` runs on every boot (`trident-diag.service`,
after network-online). It writes `trident-diag.txt` (network/services report)
to the boot partition, then — if `trident-run.sh` exists on the card — runs it
as root and writes its output to `trident-run.txt`.

So any check or fix is: put a script on the card as `trident-run.sh`, boot,
read `trident-run.txt` on the Mac.

## trident-run.sh (current, every step idempotent)
- set the clock from the Vesper's GPS RMC (no internet/NTP aboard)
- add fixed 192.168.15.200 to the `vesper` NM profile (alongside DHCP)
- WiFi power-save off (persistent NM conf + immediate)
- Caddyfile: `/_next/static/*` + `/fonts/*` immutable; everything else no-cache
- install `trident-out.tar.gz` from the card into `~/trident/out` if present
  (old build kept as `out.prev`) — this is how app builds reach the Pi
- point Signal K's TCP provider at the Vesper (192.168.15.1:39150)
- report Signal K self position + AIS contacts

## Deploying a build to the Pi
Build `npm run build:static`, `tar czf trident-out.tar.gz -C out .`, copy to
the card as `trident-out.tar.gz`, boot. (The Pi has no internet: no git pull.)

## One-time-only path (if the hook were ever lost)
Pi OS Trixie on this card uses Imager-style first-boot args. To run a script in
the minimal boot mode, append to the single line of `cmdline.txt`:
` systemd.run=/boot/firmware/<script>.sh systemd.run_success_action=reboot systemd.unit=kernel-command-line.target`
(`systemd.unit=` is REQUIRED — without it the script never runs). NetworkManager
is NOT running in that mode: write files, strip the args back out, reboot.
Keep `cmdline.txt.bak` (clean original) on the card. macOS sed needs `sed -i ''`.
The Vesper WiFi profile (SSID VesperXB-YF87180) is installed as
`/etc/NetworkManager/system-connections/vesper.nmconnection` — PSK not in this repo.
