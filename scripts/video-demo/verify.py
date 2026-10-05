"""Check export metadata, full decode, subtitle intervals and closing QR.

This does not replace visual review or listening to the finished narration.
"""
import hashlib
import json
import re
import subprocess
from pathlib import Path

import cv2
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'work/video-demo-vi'
VIDEO = OUT / 'pipicachu-demo-vi.mp4'


def command(args):
    return subprocess.run(args, check=True, capture_output=True).stdout


def seconds(value):
    h, m, s = value.replace(',', '.').split(':')
    return int(h) * 3600 + int(m) * 60 + float(s)


def verify():
    probe = json.loads(command(['ffprobe', '-v', 'error', '-show_streams',
                                '-show_format', '-of', 'json', str(VIDEO)]))
    video, audio = probe['streams']
    assert (video['width'], video['height'], video['r_frame_rate']) == (1920, 1080, '30/1')
    assert video['codec_name'] == 'h264' and audio['codec_name'] == 'aac'
    assert audio['sample_rate'] == '48000' and audio['channels'] == 2
    assert 170 <= float(probe['format']['duration']) <= 230
    decode = subprocess.run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(VIDEO),
                             '-f', 'null', '-'], capture_output=True)
    assert decode.returncode == 0 and not decode.stderr, decode.stderr
    text = (OUT / 'pipicachu-demo-vi.srt').read_text(encoding='utf-8')
    blocks = text.strip().split('\n\n')
    previous_end = 0
    for block in blocks:
        lines = block.splitlines()
        start, end = [seconds(v) for v in lines[1].split(' --> ')]
        assert previous_end <= start < end <= float(probe['format']['duration'])
        assert 1 <= len(lines[2:]) <= 2
        previous_end = end
    assert 'pi pi ca chu' not in text
    capture = cv2.VideoCapture(str(VIDEO))
    # Include every chapter and each signing popup, at full size for manual QA.
    times = [5, 18, 30, 45, 56, 61, 67, 71, 79, 85, 92, 108, 116,
             123, 127, 135, 143, 151, 169]
    sheet = Image.new('RGB', (1280, 200 * ((len(times) + 3) // 4)), 'white')
    draw = ImageDraw.Draw(sheet)
    for i, t in enumerate(times):
        capture.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, frame = capture.read()
        assert ok
        cv2.imwrite(str(OUT / f'qa-{t}.png'), frame)
        im = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        x, y = i % 4 * 320, i // 4 * 200
        sheet.paste(im.resize((320, 180)), (x, y + 20))
        draw.text((x + 8, y + 3), f'{t}s', fill='black')
    sheet.save(OUT / 'qa-contact.jpg')
    capture.release()
    qr = cv2.imread(str(OUT / 'closing.png'))
    decoded, _, _ = cv2.QRCodeDetector().detectAndDecode(qr)
    assert decoded == 'https://pipicachu.vercel.app', decoded
    volume = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(VIDEO),
                             '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json',
                             '-f', 'null', '-'], capture_output=True, check=True)
    log = volume.stderr.decode('utf-8', 'replace')
    loudness = json.loads(re.search(r'\{\s*"input_i"[\s\S]*?\}', log)[0])
    assert float(loudness['input_tp']) < 0, loudness
    report = {'duration': probe['format']['duration'], 'codec': 'H.264/AAC',
              'resolution': '1920x1080', 'fps': 30, 'subtitles': len(blocks),
              'fullDecode': 'pass', 'subtitleIntervals': 'pass', 'qr': decoded,
              'loudness': loudness,
              'sha256': hashlib.sha256(VIDEO.read_bytes()).hexdigest(),
              'reviewScope': 'Automated export checks + representative frames; not full listening.'}
    (OUT / 'qa-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    verify()
