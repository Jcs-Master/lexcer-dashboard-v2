import os
import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app.models import db, CommandLog

commands_bp = Blueprint('commands', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'uploads')
ALLOWED_EXTENSIONS = {'txt', 'cfg'}

# Crear carpeta de uploads si no existe
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def parse_cisco_config(content):
    """Extraer información relevante de configuraciones Cisco"""
    result = {
        'hostname': None,
        'version': None,
        'model': None,
        'interfaces': [],
        'vlans': [],
        'vlans_detail': [],
        'ip_addresses': [],
        'routing_protocols': [],
        'interfaces_up': 0,
        'interfaces_down': 0,
    }
    
    lines = content.splitlines()
    
    for line in lines:
        line_stripped = line.strip()
        lower = line_stripped.lower()
        
        # Hostname
        if lower.startswith('hostname '):
            result['hostname'] = line_stripped.split(None, 1)[1]
        
        # Version
        elif 'version ' in lower and result['version'] is None:
            match = re.search(r'version\s+(\S+)', line_stripped, re.IGNORECASE)
            if match:
                result['version'] = match.group(1)
        
        # Modelo (banner o líneas específicas)
        elif 'cisco' in lower and result['model'] is None:
            match = re.search(r'(Cisco\s+[\w\-]+)', line_stripped, re.IGNORECASE)
            if match:
                result['model'] = match.group(1)
        
        # Interfaces
        elif lower.startswith('interface '):
            intf = line_stripped.split(None, 1)[1]
            result['interfaces'].append(intf)
        
        # Interface status (show ip interface brief style)
        elif re.match(r'^\S+\s+\d+\.\d+\.\d+\.\d+', line_stripped):
            parts = line_stripped.split()
            if len(parts) >= 5:
                status = parts[-2].lower() if len(parts) >= 6 else parts[-1].lower()
                proto = parts[-1].lower() if len(parts) >= 6 else ''
                if 'up' in status:
                    result['interfaces_up'] += 1
                elif 'down' in status or 'administratively' in status:
                    result['interfaces_down'] += 1
        
        # VLANs
        elif lower.startswith('vlan '):
            vlan_part = line_stripped.split(None, 1)[1]
            for v in vlan_part.split(','):
                v = v.strip()
                if v.isdigit():
                    result['vlans'].append(int(v))
        
        # VLAN detail (show vlan brief style)
        elif re.match(r'^\d+\s+\S+', line_stripped):
            parts = line_stripped.split()
            if parts[0].isdigit():
                vlan_id = int(parts[0])
                vlan_name = parts[1] if len(parts) > 1 else ''
                result['vlans_detail'].append({'id': vlan_id, 'name': vlan_name})
        
        # IP Addresses
        ip_match = re.findall(r'\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b', line_stripped)
        for ip in ip_match:
            if ip not in result['ip_addresses']:
                result['ip_addresses'].append(ip)
        
        # Routing protocols
        if 'router ospf' in lower:
            result['routing_protocols'].append('OSPF')
        elif 'router eigrp' in lower:
            result['routing_protocols'].append('EIGRP')
        elif 'router bgp' in lower:
            result['routing_protocols'].append('BGP')
        elif 'ip route ' in lower:
            if 'Static' not in result['routing_protocols']:
                result['routing_protocols'].append('Static')
    
    # Remover duplicados manteniendo orden
    seen = set()
    uniq = []
    for r in result['routing_protocols']:
        if r not in seen:
            seen.add(r)
            uniq.append(r)
    result['routing_protocols'] = uniq
    
    return result


@commands_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    """Subir y procesar archivo de comandos Cisco"""
    user_id = get_jwt_identity()
    
    if 'file' not in request.files:
        return jsonify({'error': 'No se envió ningún archivo'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'Nombre de archivo vacío'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Tipo de archivo no permitido. Solo .txt y .cfg'}), 400
    
    filename = secure_filename(file.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)
    
    # Leer contenido
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception as e:
        return jsonify({'error': f'Error leyendo archivo: {str(e)}'}), 500
    
    file_size = os.path.getsize(file_path)
    file_ext = filename.rsplit('.', 1)[1].lower()
    
    # Preview: primeras 50 líneas o 2000 caracteres
    lines = content.splitlines()
    preview_lines = lines[:50]
    preview = '\\n'.join(preview_lines)
    if len(preview) > 2000:
        preview = preview[:2000] + '...'
    
    # Parsear configuración
    try:
        parsed_data = parse_cisco_config(content)
        status = 'processed'
        error_message = None
        device_info = {
            'hostname': parsed_data.get('hostname'),
            'model': parsed_data.get('model'),
            'version': parsed_data.get('version')
        }
    except Exception as e:
        parsed_data = None
        status = 'error'
        error_message = str(e)
        device_info = None
    
    # Guardar log en BD
    command_log = CommandLog(
        user_id=user_id,
        filename=filename,
        file_type=file_ext,
        file_size=file_size,
        content_preview=preview,
        parsed_data=parsed_data,
        status=status,
        device_info=device_info,
        error_message=error_message
    )
    
    db.session.add(command_log)
    db.session.commit()
    
    return jsonify({
        'message': 'Archivo procesado exitosamente',
        'log': command_log.to_dict()
    }), 201


@commands_bp.route('/logs', methods=['GET'])
@jwt_required()
def list_logs():
    """Listar logs de comandos procesados"""
    user_id = get_jwt_identity()
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    status_filter = request.args.get('status')
    
    query = CommandLog.query.filter_by(user_id=user_id)
    
    if status_filter:
        query = query.filter_by(status=status_filter)
    
    pagination = query.order_by(CommandLog.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'items': [log.to_dict() for log in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page,
        'per_page': per_page
    }), 200


@commands_bp.route('/logs/<int:log_id>', methods=['GET'])
@jwt_required()
def get_log(log_id):
    """Obtener detalle de un log específico"""
    user_id = get_jwt_identity()
    log = CommandLog.query.filter_by(id=log_id, user_id=user_id).first()
    
    if not log:
        return jsonify({'error': 'Log no encontrado'}), 404
    
    return jsonify({'log': log.to_dict()}), 200


@commands_bp.route('/logs/<int:log_id>', methods=['DELETE'])
@jwt_required()
def delete_log(log_id):
    """Eliminar un log"""
    user_id = get_jwt_identity()
    log = CommandLog.query.filter_by(id=log_id, user_id=user_id).first()
    
    if not log:
        return jsonify({'error': 'Log no encontrado'}), 404
    
    db.session.delete(log)
    db.session.commit()
    
    return jsonify({'message': 'Log eliminado exitosamente'}), 200


@commands_bp.route('/parse-preview', methods=['POST'])
@jwt_required()
def parse_preview():
    """Endpoint para parsear texto sin guardar en BD (preview en tiempo real)"""
    data = request.get_json()
    
    if not data or not data.get('content'):
        return jsonify({'error': 'Se requiere el contenido a parsear'}), 400
    
    try:
        parsed = parse_cisco_config(data['content'])
        return jsonify({
            'parsed_data': parsed,
            'lines_processed': len(data['content'].splitlines())
        }), 200
    except Exception as e:
        return jsonify({'error': f'Error en parseo: {str(e)}'}), 500