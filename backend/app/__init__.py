from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager

from config import config
from app.models import db

migrate = Migrate()
jwt = JWTManager()

def create_app(config_name='development'):
    """Application factory"""
    app = Flask(__name__)
    
    # Cargar configuración
    app.config.from_object(config[config_name])
    
    # Inicializar extensiones
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # CORS para frontend React
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                    "http://localhost:3000",
                    "http://127.0.0.1:3000"
                ]
            }
        },
        allow_headers=["Authorization", "Content-Type"],
        supports_credentials=True
    )
    
    # Registrar blueprints
    from app.routes.auth import auth_bp
    from app.routes.templates import templates_bp
    from app.routes.commands import commands_bp
    from app.routes.aci_paths import aci_paths_bp
    from app.routes.aci_interfaces import aci_interfaces_bp
    from app.routes.aci_policy_groups import aci_policy_groups_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(templates_bp, url_prefix='/api/templates')
    app.register_blueprint(commands_bp, url_prefix='/api/commands')
    app.register_blueprint(aci_paths_bp)
    app.register_blueprint(aci_interfaces_bp)
    app.register_blueprint(aci_policy_groups_bp)
    
    # Health check
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'ok',
            'service': 'LexCer Dashboard API',
            'version': '2.0.0'
        }), 200
    
    # Manejadores de errores globales
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Solicitud inválida'}), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({'error': 'No autorizado'}), 401
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Recurso no encontrado'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500
    
    # Crear tablas si no existen (útil para desarrollo rápido)
    with app.app_context():
        db.create_all()
    
    return app