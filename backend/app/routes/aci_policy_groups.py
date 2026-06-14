from io import BytesIO
from xml.etree import ElementTree as ET
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app.models import db, AciGeneration
from app.utils.aci_xml import prettify_xml, normalize_cols, get_column_name, read_excel_file
import pandas as pd

aci_policy_groups_bp = Blueprint('aci_policy_groups', __name__, url_prefix='/api/aci-policy-groups')
ALLOWED = {'xls', 'xlsx'}

def allowed(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED

def build_policy_group_xml(df, delete_mode=False):
    cols_orig = list(df.columns)
    cols = normalize_cols(cols_orig)

    name_c = get_column_name(cols_orig, cols, ['NAME'])
    type_c = get_column_name(cols_orig, cols, ['TYPE'])
    desc_c = get_column_name(cols_orig, cols, ['DESCRIPTION', 'DESCR'])
    speed_c = get_column_name(cols_orig, cols, ['SPEED_POLICY', 'SPEED POLICY', 'SPEED'])
    cdp_c = get_column_name(cols_orig, cols, ['CDP_POLICY', 'CDP POLICY', 'CDP'])
    lldp_c = get_column_name(cols_orig, cols, ['LLDP_POLICY', 'LLDP POLICY', 'LLDP'])
    stp_c = get_column_name(cols_orig, cols, ['STP_POLICY', 'STP POLICY', 'STP'])
    aaep_c = get_column_name(cols_orig, cols, ['AAEP'])
    lacp_c = get_column_name(cols_orig, cols, ['LACP_POLICY', 'LACP POLICY', 'LACP'])

    missing = [c for c, v in [('NAME', name_c), ('TYPE', type_c)] if v is None]
    if missing:
        raise ValueError(f'Faltan columnas obligatorias: {missing}')

    summary = {'rows': len(df), 'processed': 0, 'skipped': 0,
               'link': 0, 'pc': 0, 'vpc': 0, 'warnings': []}
    
    status_val = 'deleted' if delete_mode else 'created,modified'
    
    pol_uni = ET.Element('polUni', status=status_val)
    infra_infra = ET.SubElement(pol_uni, 'infraInfra', status=status_val)
    infra_funcp = ET.SubElement(infra_infra, 'infraFuncP', status=status_val)

    for idx, row in df.iterrows():
        name = str(row[name_c]).strip() if name_c and pd.notna(row[name_c]) else None
        type_val = str(row[type_c]).strip().upper() if type_c and pd.notna(row[type_c]) else None
        descr = str(row[desc_c]).strip() if desc_c and pd.notna(row[desc_c]) else ''
        speed = str(row[speed_c]).strip() if speed_c and pd.notna(row[speed_c]) else ''
        cdp = str(row[cdp_c]).strip() if cdp_c and pd.notna(row[cdp_c]) else ''
        lldp = str(row[lldp_c]).strip() if lldp_c and pd.notna(row[lldp_c]) else ''
        stp = str(row[stp_c]).strip() if stp_c and pd.notna(row[stp_c]) else ''
        aaep = str(row[aaep_c]).strip() if aaep_c and pd.notna(row[aaep_c]) else ''
        lacp = str(row[lacp_c]).strip() if lacp_c and pd.notna(row[lacp_c]) else ''

        if not name:
            summary['skipped'] += 1
            if len(summary['warnings']) < 10:
                summary['warnings'].append(f'Fila {idx+2}: NAME vacio')
            continue

        if not type_val or type_val not in ('LINK', 'PC', 'VPC'):
            summary['skipped'] += 1
            if len(summary['warnings']) < 10:
                summary['warnings'].append(f'Fila {idx+2}: TYPE invalido ({type_val}), debe ser LINK, PC o VPC')
            continue

        summary['processed'] += 1

        if type_val == 'LINK':
            summary['link'] += 1
            grp = ET.SubElement(infra_funcp, 'infraAccPortGrp', 
                               name=name, descr=descr, status=status_val)
        else:
            # PC o VPC
            lag_t = 'link' if type_val == 'PC' else 'node'
            if type_val == 'PC':
                summary['pc'] += 1
            else:
                summary['vpc'] += 1
            grp = ET.SubElement(infra_funcp, 'infraAccBndlGrp',
                               name=name, lagT=lag_t, descr=descr, status=status_val)

        # Relaciones comunes a todos los tipos
        if speed:
            ET.SubElement(grp, 'infraRsHIfPol', 
                         tnFabricHIfPolName=speed, status=status_val)
        if cdp:
            ET.SubElement(grp, 'infraRsCdpIfPol',
                         tnCdpIfPolName=cdp, status=status_val)
        if lldp:
            ET.SubElement(grp, 'infraRsLldpIfPol',
                         tnLldpIfPolName=lldp, status=status_val)
        if stp:
            ET.SubElement(grp, 'infraRsStpIfPol',
                         tnStpIfPolName=stp, status=status_val)
        if aaep:
            ET.SubElement(grp, 'infraRsAttEntP',
                         tDn=f'uni/infra/attentp-{aaep}', status=status_val)
        if lacp and type_val in ('PC', 'VPC'):
            ET.SubElement(grp, 'infraRsLacpPol',
                         tnLacpLagPolName=lacp, status=status_val)

    xml = prettify_xml(pol_uni)
    return xml, summary


@aci_policy_groups_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate():
    if 'file' not in request.files:
        return jsonify({'error': 'Archivo no encontrado'}), 400
    
    f = request.files['file']
    if f.filename == '' or not allowed(f.filename):
        return jsonify({'error': 'Formato invalido. Use .xls o .xlsx'}), 400

    try:
        f.stream.seek(0)
        excel_bytes = f.read()
        df = read_excel_file(BytesIO(excel_bytes), 'Hoja1')
        create_xml, create_sum = build_policy_group_xml(df, delete_mode=False)
        df2 = read_excel_file(BytesIO(excel_bytes), 'Hoja1')
        delete_xml, delete_sum = build_policy_group_xml(df2, delete_mode=True)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Error: {e}'}), 500

    user_id = get_jwt_identity()
    gen = AciGeneration(
        user_id=user_id, generation_type='policy-groups', filename=secure_filename(f.filename),
        excel_data=excel_bytes,
        main_xml=create_xml, rollback_xml=delete_xml, summary=create_sum
    )
    db.session.add(gen)
    db.session.commit()

    return jsonify({
        'create_xml': create_xml, 'delete_xml': delete_xml,
        'filename': f.filename,
        'summary': {
            'rows': create_sum['rows'], 'processed': create_sum['processed'],
            'skipped': create_sum['skipped'], 'link': create_sum['link'],
            'pc': create_sum['pc'], 'vpc': create_sum['vpc'],
            'warnings': create_sum['warnings'],
        }
    }), 200


@aci_policy_groups_bp.route('/template', methods=['GET'])
def download_template():
    """Descargar plantilla Excel (.xlsx) con datos de ejemplo"""
    df = pd.DataFrame([
        ['VIOCHP913-E-15-IPG', 'LINK', 'VIOCHP913', '10G_Auto_On', 'CDP_Disabled', 'LLDP_TxOff_RxOff', 'BPDU_FilterOn_GuardOn', 'BCP_AAEP', ''],
        ['PTSMSRVCHP01-VPC-A-IPG', 'VPC', 'PTSMSRVCHP01', '10G_Auto_On', 'CDP_Disabled', 'LLDP_TxOff_RxOff', 'BPDU_FilterOn_GuardOn', 'BCP_AAEP', 'LACP_Active'],
        ['PCTXSDXP01-PC-A-IPG', 'PC', 'PCTXSDXP01', '10G_Auto_On', 'CDP_Disabled', 'LLDP_TxOff_RxOff', 'BPDU_FilterOn_GuardOn', 'BCP_AAEP', 'LACP_Active'],
    ], columns=['NAME', 'TYPE', 'DESCRIPTION', 'SPEED_POLICY', 'CDP_POLICY', 'LLDP_POLICY', 'STP_POLICY', 'AAEP', 'LACP_POLICY'])
    
    buffer = BytesIO()
    df.to_excel(buffer, index=False, engine='openpyxl')
    buffer.seek(0)
    
    return send_file(
        buffer,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        download_name='plantilla_policy_groups.xlsx',
        as_attachment=True
    )
