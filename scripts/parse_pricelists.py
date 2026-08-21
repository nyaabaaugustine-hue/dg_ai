"""Parse Pragya spare-parts price lists from Desktop/degoonypricelist into seed JSON.

Outputs one JSON file per source into prisma/seed-data/.
Only Excel/xlsx sources are parsed here (images need OCR -> Phase 5 import).

Note: run from repo root; python 3.14 with openpyxl + xlrd.
"""
import json
import os
import re
from collections import OrderedDict

import openpyxl

SRC = r"C:\Users\TGNE\Desktop\degoonypricelist"
OUT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prisma", "seed-data")

GRADE_MAP = {
    "bajaj original": "PINK",
    "tvs original": "PINK",
    "original": "PINK",
    "endurance": "ENDURANCE",
    "forta": "FORTA",
    "forte": "FORTA",
    "vorrac": "GENERIC",
    "flash": "GENERIC",
    "luminaz": "GENERIC",
    "lum": "GENERIC",
}

SECTION_CATEGORY = {
    "tyres": "Tyres",
    "bajaj goods": "Bajaj Goods",
    "tvs goods": "TVS Goods",
}


def norm(s):
    if s is None:
        return ""
    s = str(s).replace("\xa0", " ").strip()
    return re.sub(r"\s+", " ", s)


def parse_evergreen(path, source):
    wb = openpyxl.load_workbook(path, data_only=True)
    items = []
    seen = set()
    for ws in wb.worksheets:
        section = ""
        rows = list(ws.iter_rows(values_only=True))
        for r in rows:
            vals = list(r) + [None] * 5
            desc, brand, price, qty, amt = vals[:5]
            desc = norm(desc)
            brand = norm(brand)
            if desc.upper() in ("DESCRIPTION",) or not desc:
                continue
            if not desc.upper().startswith("EVER GREEN") and brand == "" and price is None:
                section = SECTION_CATEGORY.get(desc.lower().strip(), desc)
                continue
            if desc.upper() in ("EVER GREEN PARTS KUMASI",):
                continue
            try:
                p = float(price)
            except (TypeError, ValueError):
                continue
            if p <= 0:
                continue
            key = (desc.lower(), brand.lower())
            if key in seen:
                continue
            seen.add(key)
            items.append(
                {
                    "name": desc,
                    "brand": brand,
                    "grade": GRADE_MAP.get(brand.lower(), "GENERIC"),
                    "price": p,
                    "qty": int(qty) if isinstance(qty, (int, float)) and qty else None,
                    "category": section or "General",
                    "source": source,
                }
            )
    return items


def parse_bajaj_master(path, source):
    wb = openpyxl.load_workbook(path, data_only=True)
    items = []
    seen = set()
    for ws in wb.worksheets:
        section = "Bajaj Goods" if ws.title != "Tyres" else "Tyres"
        rows = list(ws.iter_rows(values_only=True))
        for r in rows:
            vals = list(r) + [None] * 5
            desc, brand, price, qty, amt = vals[:5]
            desc = norm(desc)
            brand = norm(brand)
            if not desc or desc.upper() in ("DESCRIPTION", "EVER GREEN PARTS KUMASI - BA", "EVER GREEN PARTS KUMASI - TY"):
                continue
            try:
                p = float(price)
            except (TypeError, ValueError):
                continue
            if p <= 0:
                continue
            key = (desc.lower(), brand.lower())
            if key in seen:
                continue
            seen.add(key)
            items.append(
                {
                    "name": desc,
                    "brand": brand,
                    "grade": GRADE_MAP.get(brand.lower(), "GENERIC"),
                    "price": p,
                    "qty": int(qty) if isinstance(qty, (int, float)) and qty else None,
                    "category": section,
                    "source": source,
                }
            )
    return items


def parse_tvs_official(path, source):
    wb = openpyxl.load_workbook(path, data_only=True)
    items = []
    ws = wb["TVS Official Price List"]
    rows = list(ws.iter_rows(values_only=True))
    hdr = [norm(h).lower() for h in rows[1]]
    idx = {c: i for i, c in enumerate(hdr)}
    for r in rows[2:]:
        vals = list(r) + [None] * 9
        code = norm(vals[idx.get("parts code", 1)])
        item = norm(vals[idx.get("item", 2)])
        try:
            retail = float(vals[idx.get("retail", 5)])
        except (TypeError, ValueError):
            continue
        vehicle = norm(vals[idx.get("2w/3w", 7)])
        if vehicle and "3W" not in vehicle.upper():
            continue
        if not item or retail <= 0:
            continue
        items.append(
            {
                "name": item,
                "part_number": code,
                "brand": "TVS",
                "grade": "PINK",
                "price": retail,
                "category": norm(vals[idx.get("category", 6)]) or "Parts",
                "source": source,
                "vehicle": "TVS 3-Wheeler",
            }
        )
    # TVS 3-Wheeler Parts sheet
    ws3 = wb["TVS 3-Wheeler Parts"]
    rows3 = list(ws3.iter_rows(values_only=True))
    for r in rows3[1:]:
        vals = list(r) + [None] * 5
        code, desc, dlr, retail, qty = vals[:5]
        desc = norm(desc)
        try:
            p = float(retail) if retail is not None else (float(dlr) if dlr is not None else 0)
        except (TypeError, ValueError):
            p = 0
        if not desc or p <= 0:
            continue
        items.append(
            {
                "name": desc,
                "part_number": norm(code),
                "brand": "TVS",
                "grade": "PINK",
                "price": p,
                "category": "TVS 3-Wheeler Parts",
                "source": source,
                "vehicle": "TVS 3-Wheeler",
            }
        )
    return items


def main():
    os.makedirs(OUT, exist_ok=True)
    all_items = []
    all_items += parse_evergreen(
        os.path.join(SRC, "Ever Green Parts Kumasi.xlsx"), "Ever Green Parts Kumasi"
    )
    all_items += parse_bajaj_master(
        os.path.join(SRC, "BAJAJ MASTER PRICE LIST.xlsx"), "BAJAJ MASTER PRICE LIST"
    )
    all_items += parse_tvs_official(
        os.path.join(SRC, "TVS MASTER PRICE LIST.xlsx"), "TVS MASTER PRICE LIST"
    )

    # Dedupe by (name, brand, source) keeping Ever Green as canonical.
    dedup = OrderedDict()
    for it in all_items:
        key = (it["name"].lower(), it["brand"].lower(), it["grade"], it["source"])
        if key not in dedup:
            dedup[key] = it

    items = list(dedup.values())
    grades = sorted({i["grade"] for i in items})
    sources = sorted({i["source"] for i in items})
    cats = sorted({i["category"] for i in items})

    with open(os.path.join(OUT, "price_items.json"), "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=1)

    stats = {
        "items": len(items),
        "by_grade": {g: sum(1 for i in items if i["grade"] == g) for g in grades},
        "by_source": {s: sum(1 for i in items if i["source"] == s) for s in sources},
        "by_category": {c: sum(1 for i in items if i["category"] == c) for c in cats},
    }
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
