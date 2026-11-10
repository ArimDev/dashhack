#!/usr/bin/env python3
"""Extract the supplied CzechInvest workbook's layout/assets for a small browser export.
Usage: python3 scripts/prepare-startup-matrix-template.py /path/to/template.xlsx
No author metadata, local paths or printer-device binary is published.
"""
import base64, hashlib, json, re, sys, zipfile
from pathlib import Path
import xml.etree.ElementTree as ET
source = Path(sys.argv[1])
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(source) as archive:
    strings = re.findall(r'<si>([\s\S]*?)</si>', archive.read('xl/sharedStrings.xml').decode())
    sheet = archive.read('xl/worksheets/sheet1.xml').decode()
    cells = {cell.get('r'): strings[int(cell.find('s:v', ns).text)] for cell in ET.fromstring(sheet).findall('.//s:c[@t="s"]', ns)}
    sheet = re.sub(r'(<pageSetup\b[^>]*?) r:id="[^"]+"', r'\1', sheet)
    sheet = sheet.replace('activeCell="G1" sqref="G1"', 'activeCell="A1" sqref="A1"')
    paths = ['xl/styles.xml', 'xl/theme/theme1.xml', 'xl/media/image1.jpeg', 'xl/drawings/drawing1.xml', 'xl/drawings/_rels/drawing1.xml.rels']
    files = {name: {'text': archive.read(name).decode()} if name.endswith(('.xml', '.rels')) else {'base64': base64.b64encode(archive.read(name)).decode()} for name in paths}
result = {'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'sheet': sheet, 'cells': cells, 'files': files}
target = Path(__file__).resolve().parents[1] / 'src/public/templates/startup-matrix.json'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
print(target)
