from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)
from app.models import db, User, AciGeneration
from app import jwt as jwt_manager

auth_bp = Blueprint('auth', __name__)

# Blacklist simple en memoria para tokens revocados
jwt_blocklist = set()

# Decorador para verificar admin
def admin_required(fn):
    from functools import wraps
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or not user.is_admin():
            return jsonify({'error': 'Se requieren privilegios de administrador'}), 403
        return fn(*args, **kwargs)
    return wrapper


@auth_bp.route('/register', methods=['POST'])
def register():
    """Registrar nuevo usuario"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Datos incompletos. Se requiere username, email y password'}), 400
    
    if len(data['password']) < 6:
        return jsonify({'error': 'La contraseña debe tener al menos 6 caracteres'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'El nombre de usuario ya existe'}), 409
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'El email ya está registrado'}), 409
    
    user = User(
        username=data['username'],
        email=data['email']
    )
    user.set_password(data['password'])
    
    # Si se envian permisos personalizados (solo admin puede hacer esto)
    if data.get('permissions'):
        user.permissions = data['permissions']
    if data.get('role') and data['role'] in ('admin', 'user'):
        user.role = data['role']
    
    db.session.add(user)
    db.session.commit()
    
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    
    return jsonify({
        'message': 'Usuario creado exitosamente',
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Iniciar sesión con JWT"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Usuario y contraseña son requeridos'}), 400
    
    user = User.query.filter_by(username=data['username']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Usuario o contraseña incorrectos'}), 401
    
    if not user.is_active:
        return jsonify({'error': 'Usuario desactivado'}), 403
    
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    
    return jsonify({
        'message': 'Sesión iniciada correctamente',
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refrescar token de acceso"""
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=str(user_id))
    return jsonify({'access_token': access_token}), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Cerrar sesión (revocar token)"""
    jti = get_jwt()['jti']
    jwt_blocklist.add(jti)
    return jsonify({'message': 'Sesión cerrada exitosamente'}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Obtener información del usuario autenticado"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    return jsonify({'user': user.to_dict()}), 200


# ============ CRUD USUARIOS (solo admin) ============

@auth_bp.route('/users', methods=['GET'])
@jwt_required()
@admin_required
def list_users():
    """Listar todos los usuarios (solo admin)"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    pagination = User.query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'items': [u.to_public_dict() for u in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page,
        'per_page': per_page
    }), 200


@auth_bp.route('/users', methods=['POST'])
@jwt_required()
@admin_required
def create_user():
    """Crear usuario desde panel admin"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Datos incompletos'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Usuario ya existe'}), 409
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email ya registrado'}), 409
    
    user = User(
        username=data['username'],
        email=data['email'],
        role=data.get('role', 'user'),
        is_active=data.get('is_active', True),
        permissions=data.get('permissions', {
            'dashboard': True,
            'templates': True,
            'commands': True,
            'settings': True,
            'users': False
        })
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        'message': 'Usuario creado',
        'user': user.to_public_dict()
    }), 201


@auth_bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_user(user_id):
    """Obtener un usuario especifico"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    return jsonify({'user': user.to_public_dict()}), 200


@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_user(user_id):
    """Actualizar usuario (role, permissions, is_active, email)"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No se proporcionaron datos'}), 400
    
    # No permitir editar el propio usuario para evitar bloqueo
    current_id = get_jwt_identity()
    if user_id == current_id and data.get('role') == 'user':
        return jsonify({'error': 'No puedes quitarte el rol de admin a ti mismo'}), 400
    
    user.email = data.get('email', user.email)
    user.role = data.get('role', user.role)
    user.is_active = data.get('is_active', user.is_active)
    
    if 'permissions' in data:
        user.permissions = data['permissions']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Usuario actualizado',
        'user': user.to_public_dict()
    }), 200


@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user(user_id):
    """Eliminar usuario"""
    current_id = get_jwt_identity()
    if user_id == current_id:
        return jsonify({'error': 'No puedes eliminarte a ti mismo'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': 'Usuario eliminado'}), 200


@auth_bp.route('/users/<int:user_id>/permissions', methods=['PUT'])
@jwt_required()
@admin_required
def update_user_permissions(user_id):
    """Actualizar solo los permisos de menu de un usuario"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    
    data = request.get_json()
    if not data or 'permissions' not in data:
        return jsonify({'error': 'Se requieren permisos'}), 400
    
    # Merge de permisos
    current_perms = user.permissions or {}
    current_perms.update(data['permissions'])
    user.permissions = current_perms
    
    db.session.commit()
    
    return jsonify({
        'message': 'Permisos actualizados',
        'user': user.to_public_dict()
    }), 200


@auth_bp.route('/aci-generations', methods=['GET'])
@jwt_required()
def list_aci_generations():
    """Listar historial de generaciones XML ACI"""
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    pagination = AciGeneration.query.filter_by(user_id=user_id)\
        .order_by(AciGeneration.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'items': [g.to_dict() for g in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page,
        'per_page': per_page
    }), 200


# Callback para verificar si un token esta en la blacklist
@jwt_manager.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    return jwt_payload['jti'] in jwt_blocklist
