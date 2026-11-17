#!/usr/bin/env python3
"""Школьное оформление DOCX после pandoc: Times New Roman, рамки у таблиц, поля 2 см.
Usage: python3 tools/style-docx.py methodology/metodika-3-klass.docx"""
import sys
import docx
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt


def borders(tbl):
    pr = tbl._tbl.tblPr
    b = OxmlElement('w:tblBorders')
    for side in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        e = OxmlElement('w:' + side)
        e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), '4'); e.set(qn('w:color'), '808080')
        b.append(e)
    pr.append(b)


d = docx.Document(sys.argv[1])
for s in d.styles:
    if s.type == 1 and getattr(s, 'font', None) is not None:   # paragraph styles
        s.font.name = 'Times New Roman'
        rpr = s.element.get_or_add_rPr()
        fonts = rpr.find(qn('w:rFonts'))
        if fonts is None:
            fonts = OxmlElement('w:rFonts'); rpr.append(fonts)
        for a in ('w:ascii', 'w:hAnsi', 'w:cs', 'w:eastAsia'):
            fonts.set(qn(a), 'Times New Roman')
d.styles['Normal'].font.size = Pt(12)
for name in ('Body Text', 'First Paragraph', 'Compact'):
    if name in [s.name for s in d.styles]:
        d.styles[name].font.size = Pt(12)
for sec in d.sections:
    sec.left_margin = sec.right_margin = Cm(2)
    sec.top_margin = sec.bottom_margin = Cm(2)
for t in d.tables:
    borders(t)
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(10.5)
d.save(sys.argv[1])
print('styled', len(d.tables), 'tables')
