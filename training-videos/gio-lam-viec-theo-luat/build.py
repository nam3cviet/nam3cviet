#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import html
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from slides_data import SLIDES, VIDEO_GROUPS

BASE = os.path.dirname(os.path.abspath(__file__))
HTML_DIR = os.path.join(BASE, "html")
PNG_DIR = os.path.join(BASE, "png")
AUDIO_DIR = os.path.join(BASE, "audio")
CLIPS_DIR = os.path.join(BASE, "clips")
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

SLIDE_TEMPLATE = """<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<style>
  @font-face {{ font-family: 'DejaVu Sans'; src: local('DejaVu Sans'); }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  html, body {{ width: 1920px; height: 1080px; overflow: hidden; }}
  html {{ background: #0b1d3a; }}
  .bg {{
    position: fixed;
    inset: 0;
    background: linear-gradient(135deg, #0b1d3a 0%, #123a63 55%, #0b1d3a 100%);
    z-index: -1;
  }}
  body {{
    font-family: 'DejaVu Sans', sans-serif;
    color: #f5f7fa;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 110px 140px;
    position: relative;
    overflow: hidden;
  }}
  .bar {{
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 18px;
    background: #f2b705;
  }}
  .kicker {{
    color: #f2b705;
    font-size: 34px;
    font-weight: bold;
    letter-spacing: 4px;
    margin-bottom: 28px;
  }}
  .title {{
    font-size: 76px;
    font-weight: bold;
    line-height: 1.15;
    margin-bottom: 56px;
    max-width: 1550px;
  }}
  ul {{
    list-style: none;
  }}
  li {{
    font-size: 42px;
    line-height: 1.5;
    margin-bottom: 30px;
    padding-left: 56px;
    position: relative;
    max-width: 1550px;
  }}
  li::before {{
    content: "\\2022";
    color: #f2b705;
    font-size: 46px;
    position: absolute;
    left: 0; top: -6px;
  }}
  .footer {{
    position: absolute;
    bottom: 56px;
    right: 140px;
    font-size: 28px;
    color: #9fb3d1;
    letter-spacing: 1px;
  }}
</style>
</head>
<body>
  <div class="bg"></div>
  <div class="bar"></div>
  <div class="kicker">{kicker}</div>
  <div class="title">{title}</div>
  <ul>
    {bullets_html}
  </ul>
  <div class="footer">Giờ Làm Việc Theo Luật · Video đào tạo · {page} / {total}</div>
</body>
</html>
"""


def esc(s):
    return html.escape(s, quote=False)


def render_slide_html(slide, page, total):
    bullets_html = "\n    ".join(f"<li>{esc(b)}</li>" for b in slide["bullets"])
    return SLIDE_TEMPLATE.format(
        kicker=esc(slide["kicker"]),
        title=esc(slide["title"]),
        bullets_html=bullets_html,
        page=page,
        total=total,
    )


def run(cmd):
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=True)


def make_png(html_path, png_path):
    run([
        CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
        "--hide-scrollbars", "--force-color-profile=srgb",
        "--window-size=1920,1080",
        f"--screenshot={png_path}",
        f"file://{html_path}",
    ])


def make_audio(text, wav_path):
    run(["espeak-ng", "-v", "vi", "-s", "150", "-p", "45", "-w", wav_path, text])


def ffprobe_duration(path):
    import json
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json",
         "-show_entries", "format=duration", path],
        check=True, capture_output=True, text=True,
    ).stdout
    return float(json.loads(out)["format"]["duration"])


def make_clip(png_path, wav_path, mp4_path):
    dur = ffprobe_duration(wav_path)
    total_dur = dur + 0.6
    run([
        "ffmpeg", "-y",
        "-loop", "1", "-i", png_path,
        "-i", wav_path,
        "-filter_complex",
        f"[0:v]scale=1920:1080,fps=30,"
        f"fade=t=in:st=0:d=0.4,fade=t=out:st={total_dur - 0.4:.2f}:d=0.4[v]",
        "-map", "[v]", "-map", "1:a",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k",
        "-t", f"{total_dur:.2f}",
        "-shortest",
        mp4_path,
    ])


def concat_clips(clip_paths, out_path):
    list_path = out_path + ".txt"
    with open(list_path, "w") as f:
        for c in clip_paths:
            f.write(f"file '{c}'\n")
    run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_path,
        "-c", "copy", out_path,
    ])


def main():
    total = len(SLIDES)
    clip_by_id = {}
    for i, slide in enumerate(SLIDES, start=1):
        sid = slide["id"]
        html_path = os.path.join(HTML_DIR, f"slide_{sid}.html")
        png_path = os.path.join(PNG_DIR, f"slide_{sid}.png")
        wav_path = os.path.join(AUDIO_DIR, f"slide_{sid}.wav")
        clip_path = os.path.join(CLIPS_DIR, f"slide_{sid}.mp4")

        with open(html_path, "w", encoding="utf-8") as f:
            f.write(render_slide_html(slide, i, total))

        make_png(html_path, png_path)
        make_audio(slide["narration"], wav_path)
        make_clip(png_path, wav_path, clip_path)
        clip_by_id[sid] = clip_path
        print(f"Done slide {sid}")

    for group in VIDEO_GROUPS:
        clips = [clip_by_id[sid] for sid in group["slide_ids"]]
        out_path = os.path.join(BASE, group["file"])
        concat_clips(clips, out_path)
        print(f"Built {out_path}")


if __name__ == "__main__":
    main()
