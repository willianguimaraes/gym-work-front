"""Gera os ícones do app (PWA) sem dependências: fundo escuro e um halter azul.

Uso: python scripts/generate-icons.py  (grava em public/icons/)
"""
import pathlib
import struct
import zlib

BACKGROUND = (13, 15, 19)  # #0d0f13, mesma cor do theme-color
BLUE = (59, 130, 246)  # #3b82f6, cor primária
OUT = pathlib.Path(__file__).resolve().parent.parent / "public" / "icons"


def png(path, size, pixels):
    raw = b"".join(b"\x00" + bytes(c for px in pixels[y * size:(y + 1) * size] for c in px) for y in range(size))

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    data = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    path.write_bytes(data)


def rounded(x, y, x0, y0, x1, y1, r):
    """Ponto dentro de um retângulo de cantos arredondados."""
    if not (x0 <= x <= x1 and y0 <= y <= y1):
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def icon(size, scale, corner):
    """Halter centralizado; ``scale`` é a fração do ícone ocupada (menor nos maskable)."""
    s = size * scale
    off = (size - s) / 2
    shapes = [  # (x0, y0, x1, y1, raio) em fração da área útil
        (0.10, 0.47, 0.90, 0.53, 0.02),  # barra
        (0.20, 0.30, 0.30, 0.70, 0.03),  # anilha grande esquerda
        (0.70, 0.30, 0.80, 0.70, 0.03),  # anilha grande direita
        (0.12, 0.37, 0.19, 0.63, 0.025),  # anilha pequena esquerda
        (0.81, 0.37, 0.88, 0.63, 0.025),  # anilha pequena direita
    ]
    pixels = []
    for y in range(size):
        for x in range(size):
            px, py = x + 0.5, y + 0.5
            if corner and not rounded(px, py, 0, 0, size, size, size * corner):
                pixels.append(BACKGROUND)
                continue
            u, v = (px - off) / s, (py - off) / s
            hit = any(rounded(u, v, x0, y0, x1, y1, r) for x0, y0, x1, y1, r in shapes)
            pixels.append(BLUE if hit else BACKGROUND)
    return pixels


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, size, scale in [("icon-192.png", 192, 0.86), ("icon-512.png", 512, 0.86),
                              ("maskable-512.png", 512, 0.62), ("apple-touch-icon.png", 180, 0.78)]:
        png(OUT / name, size, icon(size, scale, 0))
        print("gerado", name)
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#0d0f13"/>
  <g fill="#3b82f6" transform="translate(7 7) scale(0.86)">
    <rect x="10" y="47" width="80" height="6" rx="2"/>
    <rect x="20" y="30" width="10" height="40" rx="3"/>
    <rect x="70" y="30" width="10" height="40" rx="3"/>
    <rect x="12" y="37" width="7" height="26" rx="2.5"/>
    <rect x="81" y="37" width="7" height="26" rx="2.5"/>
  </g>
</svg>
"""
    (OUT / "favicon.svg").write_text(svg, encoding="utf-8")
    print("gerado favicon.svg")


if __name__ == "__main__":
    main()
