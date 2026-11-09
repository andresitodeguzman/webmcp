"""Generate the simple app mark as PNGs with the Python standard library.

The solid background and padded symbol also work within a maskable safe area.
No image service, runtime dependency, font, or external asset is needed.
"""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parent.parent / 'public' / 'icons'
ROOT.mkdir(parents=True, exist_ok=True)

def pixel(x, y):
    background = (33, 79, 60)
    ink = (246, 244, 237)
    # A shopping bag and two linked blocks: people and tools share one action.
    if .30 <= x <= .70 and .39 <= y <= .73:
        if not (.33 <= x <= .67 and .42 <= y <= .70):
            return ink
    radius = ((x - .50) ** 2 + (y - .38) ** 2) ** .5
    if y <= .40 and .115 <= radius <= .15:
        return ink
    if .40 <= y <= .64 and (.40 <= x <= .47 or .53 <= x <= .60):
        return ink
    if .45 <= x <= .55 and .51 <= y <= .55:
        return ink
    return background

def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)

def write(name, size):
    # Supersampling keeps the small icon's circular handle clean.
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            colors = [pixel((x+(sx+.5)/3)/size, (y+(sy+.5)/3)/size) for sy in range(3) for sx in range(3)]
            rows.extend(round(sum(color[c] for color in colors)/9) for c in range(3))
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b'')
    (ROOT / name).write_bytes(data)

for name, size in [('icon-192.png', 192), ('icon-512.png', 512), ('maskable-512.png', 512), ('apple-touch-icon.png', 180)]:
    write(name, size)
