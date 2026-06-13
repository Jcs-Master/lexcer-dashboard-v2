from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    """Usuario del sistema"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    role = db.Column(db.String(20), default='user')  # admin, user
    permissions = db.Column(db.JSON, default=lambda: {
        'dashboard': True,
        'templates': True,
        'commands': True,
        'settings': True,
        'users': False
    })
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    templates = db.relationship('Template', backref='author', lazy=True, cascade='all, delete-orphan')
    command_logs = db.relationship('CommandLog', backref='author', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def is_admin(self):
        return self.role == 'admin'
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'is_active': self.is_active,
            'role': self.role,
            'permissions': self.permissions,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def to_public_dict(self):
        """Sin datos sensibles para listados"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'is_active': self.is_active,
            'role': self.role,
            'permissions': self.permissions,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Template(db.Model):
    """Plantilla de configuración Cisco ACI"""
    __tablename__ = 'templates'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    template_type = db.Column(db.String(50), nullable=False)  # e.g., 'aci_bridge_domain', 'aci_contract'
    content = db.Column(db.Text, nullable=False)  # Contenido Jinja2 o texto plano
    variables = db.Column(db.JSON)  # Variables requeridas para renderizar
    version = db.Column(db.String(20), default='1.0')
    status = db.Column(db.String(20), default='active')  # active, draft, archived
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'template_type': self.template_type,
            'content': self.content,
            'variables': self.variables,
            'version': self.version,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class CommandLog(db.Model):
    """Log de archivos de comandos procesados"""
    __tablename__ = 'command_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(10))  # txt, cfg
    file_size = db.Column(db.Integer)  # bytes
    content_preview = db.Column(db.Text)  # Primeras N líneas
    parsed_data = db.Column(db.JSON)  # Datos estructurados extraídos
    status = db.Column(db.String(20), default='processed')  # uploaded, processed, error
    device_info = db.Column(db.JSON)  # hostname, model, version detectados
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'filename': self.filename,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'content_preview': self.content_preview,
            'parsed_data': self.parsed_data,
            'status': self.status,
            'device_info': self.device_info,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class AciGeneration(db.Model):
    """Historial de generaciones XML ACI"""
    __tablename__ = 'aci_generations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    generation_type = db.Column(db.String(20), nullable=False)  # 'paths', 'interfaces'
    filename = db.Column(db.String(255), nullable=False)
    main_xml = db.Column(db.Text)
    rollback_xml = db.Column(db.Text)
    summary = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'generation_type': self.generation_type,
            'filename': self.filename,
            'summary': self.summary,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
