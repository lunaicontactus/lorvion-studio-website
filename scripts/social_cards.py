"""Link-preview cards (1200x630) for the five works, from their own key art.

PHASE J. Nothing is drawn: the key art is shown whole (scaled, never
stretched or cropped) on a blurred, darkened copy of itself, which fills the
card's other shape. The studio's own card is public/assets/images/og-image.jpg.

    python3 scripts/social_cards.py
"""
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'public/assets/images/artwork'
OUT = ROOT / 'public/assets/images/social'
W, H = 1200, 630

WORKS = {
    'lunai': 'lunai-keyart-full.webp',
    'liminal': 'liminal-keyart-full.webp',
    'wormup': 'wormup-keyart-full.webp',
    'lumiora': 'lumiora-keyart-full.webp',
    'rubato': 'rubato-opera-full.webp',
}


def card(src: Path) -> Image.Image:
    art = Image.open(src).convert('RGB')
    # Behind: the same picture covering the card, blurred and dimmed.
    s = max(W / art.width, H / art.height)
    back = art.resize((round(art.width * s), round(art.height * s)), Image.LANCZOS)
    left, top = (back.width - W) // 2, (back.height - H) // 2
    back = back.crop((left, top, left + W, top + H)).filter(ImageFilter.GaussianBlur(28))
    back = ImageEnhance.Brightness(back).enhance(0.55)
    # In front: the whole picture, as tall (or as wide) as the card allows.
    f = min(W / art.width, H / art.height)
    front = art.resize((round(art.width * f), round(art.height * f)), Image.LANCZOS)
    back.paste(front, ((W - front.width) // 2, (H - front.height) // 2))
    return back


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for work, name in WORKS.items():
        out = OUT / f'{work}.jpg'
        card(ART / name).save(out, 'JPEG', quality=82, optimize=True, progressive=True)
        print(out.relative_to(ROOT), out.stat().st_size)


if __name__ == '__main__':
    main()
