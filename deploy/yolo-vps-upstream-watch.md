# yolo-vps snippet: upstream watch on host `vps`

Files only; nothing here has been deployed. `vps` runs reads only (GitHub API), no builds. Never run on `prod`.

```bash
ssh vps 'mkdir -p ~/.config/systemd/user ~/.config/yolo ~/.local/state/yolo-bun'
# Token file, mode 600, created by the operator (not in git): GITHUB_TOKEN=<fine-grained read-only token>
scp deploy/systemd/yolo-bun-upstream-watch.{service,timer} vps:~/.config/systemd/user/
ssh vps 'systemctl --user daemon-reload && systemctl --user enable --now yolo-bun-upstream-watch.timer'
ssh vps 'systemctl --user list-timers yolo-bun-upstream-watch.timer; systemctl --user start yolo-bun-upstream-watch.service; journalctl --user -u yolo-bun-upstream-watch -n 40'
```

Requirements: `~/src/yolo-bun` checkout on `main` (for `source-lock.json`), Bun on `~/.bun/bin`, `loginctl enable-linger $USER` so the timer runs without a session. Reports land in `~/.local/state/yolo-bun/upstream/` so they never dirty the checkout; copy into `docs/upstream/` and commit from a workstation if a dated record is wanted.
