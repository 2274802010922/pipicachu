"""Visual PDF from inspected slide renders; PPTX remains the editable source."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader
import pdfplumber
import sys

repo = Path(sys.argv[1]).resolve()
revision = sys.argv[2] if len(sys.argv) > 2 else "r1"
base = repo / "work/pitch-4min"
for language in ("vi", "en"):
    output = base / "output" / f"pipicachu-pitch4-{language}-{revision}.pdf"
    if output.exists():
        raise RuntimeError(f"Refusing to overwrite final output: {output}")
    c = canvas.Canvas(str(output), pagesize=(960, 540))
    c.setTitle(f"pipicachu - 4 minute pitch - {language.upper()}")
    c.setAuthor("2274802010922")
    for number in range(1, 5):
        source = base / f"render-{revision}" / language / f"slide-{number:02d}.png"
        c.drawImage(ImageReader(str(source)), 0, 0, width=960, height=540)
        c.showPage()
    c.save()
    assert len(PdfReader(output).pages) == 4
    previews = base / f"pdf-check-{revision}" / language
    previews.mkdir(parents=True, exist_ok=True)
    with pdfplumber.open(output) as document:
        for number, page in enumerate(document.pages, 1):
            assert (float(page.width), float(page.height)) == (960.0, 540.0)
            page.to_image(resolution=96).save(str(previews / f"slide-{number:02d}.png"))
    print(f"Exported and rendered: {output}")
