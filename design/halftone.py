"""Генерирует растровые (halftone) стикеры для сайта: предмет из точек на серой подложке
с белой «вырезанной» обводкой. Картинки рисуются программно, поэтому ни у кого не заимствованы.

    python design/halftone.py            # нужен Pillow: pip install pillow

Результат: web/public/art/*.webp. Свою фотографию можно превратить в такой же стикер:

    python design/halftone.py photo.jpg  # фон фото должен быть прозрачным (PNG) или белым
"""

import math
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps

OUT = Path(__file__).resolve().parents[1] / "web" / "public" / "art"
SIZE = 900  # сторона холста в пикселях (картинка показывается примерно вдвое меньше)
CELL = 9  # шаг сетки точек
INK = (38, 38, 38, 255)
PAPER = (236, 236, 234, 255)
WHITE = (255, 255, 255, 255)


def halftone(tone: Image.Image, mask: Image.Image) -> Image.Image:
    """tone — оттенки серого (255 = белый), mask — где предмет. Возвращает RGBA-стикер."""
    w, h = tone.size
    scale = 3  # рисуем крупнее и уменьшаем, чтобы края точек были гладкими
    big = Image.new("RGBA", (w * scale, h * scale), (0, 0, 0, 0))

    # Подложка и обводка: маска, расширенная на разную ширину, с чуть рваным краем.
    paper = mask.filter(ImageFilter.MaxFilter(21)).filter(ImageFilter.GaussianBlur(3))
    outline = paper.filter(ImageFilter.MaxFilter(17)).filter(ImageFilter.GaussianBlur(2))
    for layer, color in ((outline, WHITE), (paper, PAPER)):
        solid = layer.point(lambda v: 255 if v > 110 else 0).resize(big.size, Image.LANCZOS)
        big.paste(Image.new("RGBA", big.size, color), (0, 0), solid)

    # Точки по сетке, повёрнутой на 45°, как в типографском растре.
    draw = ImageDraw.Draw(big)
    angle = math.radians(45)
    cos, sin = math.cos(angle), math.sin(angle)
    reach = int(max(w, h) * 1.5)
    for gy in range(-reach, reach, CELL):
        for gx in range(-reach, reach, CELL):
            x = w / 2 + gx * cos - gy * sin
            y = h / 2 + gx * sin + gy * cos
            if not (0 <= x < w and 0 <= y < h) or mask.getpixel((int(x), int(y))) < 128:
                continue
            darkness = 1 - tone.getpixel((int(x), int(y))) / 255
            r = CELL * 0.62 * math.sqrt(darkness)
            if r < 0.6:
                continue
            cx, cy, rr = x * scale, y * scale, r * scale
            draw.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=INK)

    return big.resize((w, h), Image.LANCZOS)


def canvas() -> tuple[Image.Image, Image.Image]:
    return Image.new("L", (SIZE, SIZE), 255), Image.new("L", (SIZE, SIZE), 0)


def radial(size: int, cx: float, cy: float, radius: float, inner: int, outer: int) -> Image.Image:
    """Радиальный градиент: inner в точке (cx, cy), outer на расстоянии radius."""
    img = Image.new("L", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = min(math.hypot(x - cx, y - cy) / radius, 1)
            px[x, y] = int(inner + (outer - inner) * t)
    return img


def globe() -> Image.Image:
    tone, mask = canvas()
    c, r = SIZE / 2, SIZE * 0.4
    box = (c - r, c - r, c + r, c + r)
    ImageDraw.Draw(mask).ellipse(box, fill=255)
    tone.paste(radial(SIZE, c - r * 0.4, c - r * 0.45, r * 1.7, 225, 40), (0, 0), mask)
    d = ImageDraw.Draw(tone)
    for k in range(-2, 3):  # параллели
        y = c + k * r * 0.38
        half = math.sqrt(max(r * r - (y - c) ** 2, 0))
        d.line((c - half, y, c + half, y), fill=25, width=7)
    for k in (0.25, 0.6, 0.9):  # меридианы
        d.ellipse((c - r * k, c - r, c + r * k, c + r), outline=25, width=7)
    d.line((c, c - r, c, c + r), fill=25, width=7)
    return halftone(tone.filter(ImageFilter.GaussianBlur(1)), mask)


def book() -> Image.Image:
    tone, mask = canvas()
    s = SIZE

    def page(sign: int) -> list[tuple[float, float]]:
        """Страница раскрытой книги: верх и низ прогибаются к корешку."""
        top, bottom = [], []
        for i in range(31):
            t = i / 30  # 0 — корешок, 1 — внешний край
            x = s / 2 + sign * (s * 0.015 + t * s * 0.43)
            sag = math.sin(t * math.pi * 0.9) * s * 0.07
            top.append((x, s * 0.36 - sag + t * s * 0.02))
            bottom.append((x, s * 0.78 - sag * 0.6 + t * s * 0.02))
        return top + bottom[::-1]

    dm, dt = ImageDraw.Draw(mask), ImageDraw.Draw(tone)
    # Обложка видна узкой полосой под страницами.
    for sign in (-1, 1):
        shifted = [(x + sign * s * 0.012, y + s * 0.035) for x, y in page(sign)]
        dm.polygon(shifted, fill=255)
        dt.polygon(shifted, fill=40)

    for sign in (-1, 1):
        poly = page(sign)
        sheet = Image.new("L", (s, s), 0)
        ImageDraw.Draw(sheet).polygon(poly, fill=255)
        dm.polygon(poly, fill=255)
        # Страница светлая, у корешка темнеет; строчки идут по изгибу страницы.
        layer = Image.new("L", (s, s), 255)
        ld = ImageDraw.Draw(layer)
        for x in range(s):
            t = abs(x - s / 2) / (s * 0.45)
            ld.line((x, 0, x, s), fill=int(150 + min(t * 3, 1) * 100))
        for row in range(11):
            pts = []
            for i in range(26):
                t = 0.08 + i / 25 * 0.82
                x = s / 2 + sign * (s * 0.015 + t * s * 0.43)
                sag = math.sin(t * math.pi * 0.9) * s * 0.07
                y = s * 0.43 + row * s * 0.03 - sag * (0.95 - row * 0.03) + t * s * 0.02
                pts.append((x, y))
            ld.line(pts, fill=110, width=5)
        tone.paste(layer, (0, 0), sheet)
    return halftone(tone.filter(ImageFilter.GaussianBlur(1.5)), mask)


def magnifier() -> Image.Image:
    tone, mask = canvas()
    s = SIZE
    cx, cy, r = s * 0.42, s * 0.40, s * 0.27
    dm, dt = ImageDraw.Draw(mask), ImageDraw.Draw(tone)
    # Ручка — повёрнутый прямоугольник.
    a = math.radians(45)
    hx, hy = cx + (r + s * 0.02) * math.cos(a), cy + (r + s * 0.02) * math.sin(a)
    length, width = s * 0.36, s * 0.10
    dx, dy = math.cos(a), math.sin(a)
    px, py = -dy * width / 2, dx * width / 2
    handle = [
        (hx + px, hy + py),
        (hx + dx * length + px, hy + dy * length + py),
        (hx + dx * length - px, hy + dy * length - py),
        (hx - px, hy - py),
    ]
    dm.polygon(handle, fill=255)
    dt.polygon(handle, fill=30)
    dm.ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    dt.ellipse((cx - r, cy - r, cx + r, cy + r), fill=40)
    lens = Image.new("L", (s, s), 0)
    inner = r * 0.8
    ImageDraw.Draw(lens).ellipse((cx - inner, cy - inner, cx + inner, cy + inner), fill=255)
    tone.paste(radial(s, cx - inner * 0.35, cy - inner * 0.4, inner * 1.6, 250, 150), (0, 0), lens)
    return halftone(tone.filter(ImageFilter.GaussianBlur(1.5)), mask)


def letter(char: str = "Қ") -> Image.Image:
    tone, mask = canvas()
    fonts = ["C:/Windows/Fonts/arialbd.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
    font = next(ImageFont.truetype(f, int(SIZE * 0.78)) for f in fonts if Path(f).exists())
    d = ImageDraw.Draw(mask)
    bbox = d.textbbox((0, 0), char, font=font)
    pos = ((SIZE - (bbox[2] - bbox[0])) / 2 - bbox[0], (SIZE - (bbox[3] - bbox[1])) / 2 - bbox[1])
    d.text(pos, char, font=font, fill=255)
    grad = Image.linear_gradient("L").rotate(35, expand=False).resize((SIZE, SIZE))
    tone.paste(grad.point(lambda v: 30 + v * 150 // 255), (0, 0), mask)
    return halftone(tone, mask)


def kazakhstan() -> Image.Image:
    """Карта Казахстана по контуру Natural Earth (общественное достояние)."""
    import json

    geo = json.loads((Path(__file__).parent / "data" / "kazakhstan.geojson").read_text("utf-8"))
    polygons = geo["geometry"]["coordinates"]
    lons = [x for poly in polygons for x, _ in poly[0]]
    lats = [y for poly in polygons for _, y in poly[0]]
    # Равнопромежуточная проекция со сжатием по долготе для средней широты страны.
    k = math.cos(math.radians((min(lats) + max(lats)) / 2))
    w_deg, h_deg = (max(lons) - min(lons)) * k, max(lats) - min(lats)
    width = int(SIZE * 1.5)
    pad = width * 0.05
    scale = (width - 2 * pad) / w_deg
    height = int(h_deg * scale + 2 * pad)

    def project(lon: float, lat: float) -> tuple[float, float]:
        return pad + (lon - min(lons)) * k * scale, pad + (max(lats) - lat) * scale

    mask = Image.new("L", (width, height), 0)
    dm = ImageDraw.Draw(mask)
    for poly in polygons:
        dm.polygon([project(x, y) for x, y in poly[0]], fill=255)
        for hole in poly[1:]:
            dm.polygon([project(x, y) for x, y in hole], fill=0)

    # Светлее на северо-западе, темнее на юго-востоке: так карта выглядит объёмной.
    tone = Image.linear_gradient("L").rotate(-35, expand=False).resize((width, height))
    tone = tone.point(lambda v: 205 - v * 120 // 255)
    dt = ImageDraw.Draw(tone)
    for lon, lat, r in ((71.43, 51.13, 26), (76.89, 43.24, 20)):  # Астана, Алматы
        x, y = project(lon, lat)
        dt.ellipse((x - r * 1.9, y - r * 1.9, x + r * 1.9, y + r * 1.9), fill=235)
        dt.ellipse((x - r, y - r, x + r, y + r), fill=10)
    return halftone(tone.filter(ImageFilter.GaussianBlur(1.5)), mask)


def from_photo(path: Path) -> Image.Image:
    img = Image.open(path).convert("RGBA")
    img.thumbnail((SIZE, SIZE))
    sheet = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
    sheet.paste(img, ((SIZE - img.width) // 2, (SIZE - img.height) // 2), img)
    alpha = sheet.getchannel("A")
    gray = ImageOps.autocontrast(sheet.convert("L"))
    if alpha.getextrema()[0] == 255:  # без прозрачности: предметом считаем всё, что не белое
        alpha = ImageChops.invert(gray).point(lambda v: 255 if v > 12 else 0)
        alpha = alpha.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))
    return halftone(gray, alpha)


def save(img: Image.Image, name: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    bbox = img.getchannel("A").getbbox()
    img = img.crop(bbox) if bbox else img
    img.save(OUT / f"{name}.webp", quality=88, method=6)
    print(f"{OUT / name}.webp {img.size[0]}x{img.size[1]}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            save(from_photo(Path(arg)), Path(arg).stem + "-halftone")
    else:
        save(globe(), "globe")
        save(book(), "book")
        save(magnifier(), "magnifier")
        save(letter(), "letter-q")
        save(kazakhstan(), "kazakhstan")
