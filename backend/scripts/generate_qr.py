#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

import qrcode
from pathlib import Path
from sqlmodel import Session, select

from app.database import engine
from app.models import WastePoint

APP_BASE_URL = os.getenv("APP_URL", "http://localhost:5173")
OUTPUT_DIR = Path(__file__).parent / "qr-codes"


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    with Session(engine) as session:
        points = session.exec(select(WastePoint)).all()
        for p in points:
            # Frontend resident route is /r?b=<waste_point_id> (see App.jsx).
            url = f"{APP_BASE_URL}/r?b={p.id}"
            img = qrcode.make(url)
            out_path = OUTPUT_DIR / f"bin_{p.id}.png"
            img.save(str(out_path))
            print(f"✓ bin_{p.id}.png  →  {url}")
    print(f"\nGenerated {len(points)} QR codes in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
