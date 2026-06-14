from xml.dom import minidom
from xml.etree import ElementTree as ET
import pandas as pd

def prettify_xml(elem):
    rough_string = ET.tostring(elem, encoding='unicode')
    reparsed = minidom.parseString(rough_string)
    pretty = reparsed.toprettyxml(indent='    ')
    lines = [line for line in pretty.split('\n') if line.strip()]
    return '\n'.join(lines[1:])

def normalize_cols(cols):
    return [c.strip().upper() for c in cols]

def find_col(cols, candidates):
    for cand in candidates:
        if cand.upper() in cols:
            return cols.index(cand.upper())
    return None

def get_column_name(original_cols, cols, candidates):
    idx = find_col(cols, candidates)
    return original_cols[idx] if idx is not None else None

def parse_vlan(value):
    try:
        return int(value)
    except Exception:
        try:
            return int(str(value).split('.')[0])
        except Exception:
            raise ValueError(f'VLAN invalida: {value}')

def read_excel_file(file_storage, sheet_name=0):
    from io import BytesIO
    content = file_storage.read()
    return pd.read_excel(BytesIO(content), sheet_name=sheet_name, header=0)
