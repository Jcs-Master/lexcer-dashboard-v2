from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db, Template

templates_bp = Blueprint('templates', __name__)

@templates_bp.route('', methods=['GET'])
@jwt_required()
def list_templates():
    """Listar todas las plantillas del usuario autenticado"""
    user_id = get_jwt_identity()
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    template_type = request.args.get('type')
    status = request.args.get('status')
    
    query = Template.query.filter_by(user_id=user_id)
    
    if template_type:
        query = query.filter_by(template_type=template_type)
    if status:
        query = query.filter_by(status=status)
    
    pagination = query.order_by(Template.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'items': [t.to_dict() for t in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page,
        'per_page': per_page
    }), 200


@templates_bp.route('', methods=['POST'])
@jwt_required()
def create_template():
    """Crear nueva plantilla ACI"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data or not data.get('name') or not data.get('template_type') or not data.get('content'):
        return jsonify({
            'error': 'Datos incompletos. Se requiere name, template_type y content'
        }), 400
    
    template = Template(
        user_id=user_id,
        name=data['name'],
        description=data.get('description', ''),
        template_type=data['template_type'],
        content=data['content'],
        variables=data.get('variables'),
        version=data.get('version', '1.0'),
        status=data.get('status', 'active')
    )
    
    db.session.add(template)
    db.session.commit()
    
    return jsonify({
        'message': 'Plantilla creada exitosamente',
        'template': template.to_dict()
    }), 201


@templates_bp.route('/<int:template_id>', methods=['GET'])
@jwt_required()
def get_template(template_id):
    """Obtener una plantilla específica"""
    user_id = get_jwt_identity()
    template = Template.query.filter_by(id=template_id, user_id=user_id).first()
    
    if not template:
        return jsonify({'error': 'Plantilla no encontrada'}), 404
    
    return jsonify({'template': template.to_dict()}), 200


@templates_bp.route('/<int:template_id>', methods=['PUT'])
@jwt_required()
def update_template(template_id):
    """Actualizar plantilla"""
    user_id = get_jwt_identity()
    template = Template.query.filter_by(id=template_id, user_id=user_id).first()
    
    if not template:
        return jsonify({'error': 'Plantilla no encontrada'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No se proporcionaron datos'}), 400
    
    template.name = data.get('name', template.name)
    template.description = data.get('description', template.description)
    template.template_type = data.get('template_type', template.template_type)
    template.content = data.get('content', template.content)
    template.variables = data.get('variables', template.variables)
    template.version = data.get('version', template.version)
    template.status = data.get('status', template.status)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Plantilla actualizada',
        'template': template.to_dict()
    }), 200


@templates_bp.route('/<int:template_id>', methods=['DELETE'])
@jwt_required()
def delete_template(template_id):
    """Eliminar plantilla"""
    user_id = get_jwt_identity()
    template = Template.query.filter_by(id=template_id, user_id=user_id).first()
    
    if not template:
        return jsonify({'error': 'Plantilla no encontrada'}), 404
    
    db.session.delete(template)
    db.session.commit()
    
    return jsonify({'message': 'Plantilla eliminada exitosamente'}), 200


@templates_bp.route('/types', methods=['GET'])
@jwt_required()
def get_template_types():
    """Obtener tipos de plantillas disponibles"""
    types = [
        {'id': 'aci_bridge_domain', 'name': 'Bridge Domain'},
        {'id': 'aci_contract', 'name': 'Contract'},
        {'id': 'aci_epg', 'name': 'EPG (End Point Group)'},
        {'id': 'aci_vrf', 'name': 'VRF'},
        {'id': 'aci_tenant', 'name': 'Tenant'},
        {'id': 'aci_ap', 'name': 'Application Profile'},
        {'id': 'aci_filter', 'name': 'Filter'},
        {'id': 'aci_l3out', 'name': 'L3Out'},
        {'id': 'general_config', 'name': 'Configuración General'},
    ]
    return jsonify({'types': types}), 200