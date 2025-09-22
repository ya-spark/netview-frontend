import os
import time
import uuid
from typing import Optional

class Config:
    """Gateway configuration management"""
    
    def __init__(self):
        self.start_time = time.time()
        
        # Gateway identification
        self.gateway_id = os.getenv('GATEWAY_ID', str(uuid.uuid4()))
        self.gateway_type = os.getenv('GATEWAY_TYPE', 'Custom')  # Core or Custom
        self.gateway_name = os.getenv('GATEWAY_NAME', f'{self.gateway_type} Gateway')
        self.gateway_location = os.getenv('GATEWAY_LOCATION', 'Unknown')
        
        # Backend configuration
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000')
        self.api_key = os.getenv('GATEWAY_API_KEY')
        
        if not self.api_key:
            raise ValueError("GATEWAY_API_KEY environment variable is required")
        
        # Server configuration
        self.host = os.getenv('GATEWAY_HOST', '0.0.0.0')
        self.port = int(os.getenv('GATEWAY_PORT', '8001'))
        self.debug = os.getenv('GATEWAY_DEBUG', 'false').lower() == 'true'
        
        # Timing configuration
        self.sync_interval = int(os.getenv('SYNC_INTERVAL', '10'))  # seconds
        self.probe_check_interval = int(os.getenv('PROBE_CHECK_INTERVAL', '60'))  # seconds
        self.heartbeat_interval = int(os.getenv('HEARTBEAT_INTERVAL', '30'))  # seconds
        
        # Probe execution configuration
        self.default_timeout = int(os.getenv('DEFAULT_TIMEOUT', '30'))  # seconds
        self.max_concurrent_probes = int(os.getenv('MAX_CONCURRENT_PROBES', '10'))
        self.user_agent = os.getenv('USER_AGENT', 'NetView-Gateway/1.0')
        
        # Storage configuration
        self.local_storage_path = os.getenv('LOCAL_STORAGE_PATH', './data')
        self.max_local_results = int(os.getenv('MAX_LOCAL_RESULTS', '1000'))
        
        # Browser monitoring configuration (for Browser probes)
        self.chrome_executable_path = os.getenv('CHROME_EXECUTABLE_PATH')
        self.headless_browser = os.getenv('HEADLESS_BROWSER', 'true').lower() == 'true'
        
        # SSL/TLS configuration
        self.verify_ssl = os.getenv('VERIFY_SSL', 'true').lower() == 'true'
        self.ssl_cert_path = os.getenv('SSL_CERT_PATH')
        self.ssl_key_path = os.getenv('SSL_KEY_PATH')
        
        # Logging configuration
        self.log_level = os.getenv('LOG_LEVEL', 'INFO')
        self.log_file = os.getenv('LOG_FILE')
        
        # Create local storage directory
        os.makedirs(self.local_storage_path, exist_ok=True)
    
    def get_backend_headers(self) -> dict:
        """Get headers for backend API requests"""
        return {
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json',
            'User-Agent': self.user_agent
        }
    
    def is_core_gateway(self) -> bool:
        """Check if this is a core gateway"""
        return self.gateway_type.lower() == 'core'
    
    def is_custom_gateway(self) -> bool:
        """Check if this is a custom gateway"""
        return self.gateway_type.lower() == 'custom'
    
    def get_probe_types(self) -> list:
        """Get supported probe types based on gateway configuration"""
        base_types = ['Uptime', 'API', 'Security']
        
        # Browser monitoring requires additional dependencies
        if self.chrome_executable_path or os.getenv('BROWSER_SUPPORT', 'false').lower() == 'true':
            base_types.append('Browser')
        
        return base_types
    
    def __str__(self) -> str:
        """String representation of configuration"""
        return f"Gateway Config: {self.gateway_type} - {self.gateway_id}"
