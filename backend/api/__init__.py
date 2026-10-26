"""
API Routes Package

Contains all API endpoint blueprints
"""

try:
    from .auth_routes import auth_bp
    __all__ = ['auth_bp']
except ImportError:
    __all__ = []
