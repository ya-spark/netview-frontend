import time
import json
import requests
import sqlite3
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class SyncService:
    """Handles synchronization with the backend and local storage"""
    
    def __init__(self, config):
        self.config = config
        self.db_path = os.path.join(config.local_storage_path, 'results.db')
        self.last_sync_time = None
        self.last_heartbeat_time = None
        
        # Initialize local database
        self._init_database()
    
    def _init_database(self):
        """Initialize local SQLite database for storing results"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS probe_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    probe_id TEXT NOT NULL,
                    gateway_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    response_time INTEGER,
                    status_code INTEGER,
                    error_message TEXT,
                    response_body TEXT,
                    checked_at TEXT NOT NULL,
                    synced BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_probe_results_synced 
                ON probe_results(synced)
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_probe_results_checked_at 
                ON probe_results(checked_at)
            ''')
            
            conn.commit()
            conn.close()
            
            logger.info(f"Local database initialized at {self.db_path}")
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    def store_result_locally(self, result: Dict[str, Any]):
        """Store probe result in local database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO probe_results 
                (probe_id, gateway_id, status, response_time, status_code, 
                 error_message, response_body, checked_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                result.get('probeId'),
                result.get('gatewayId'),
                result.get('status'),
                result.get('responseTime'),
                result.get('statusCode'),
                result.get('errorMessage'),
                result.get('responseBody'),
                result.get('checkedAt')
            ))
            
            conn.commit()
            conn.close()
            
            # Clean up old results if we exceed the limit
            self._cleanup_old_results()
            
        except Exception as e:
            logger.error(f"Failed to store result locally: {e}")
    
    def get_local_results(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get stored results from local database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            query = '''
                SELECT probe_id, gateway_id, status, response_time, status_code,
                       error_message, response_body, checked_at, synced
                FROM probe_results 
                ORDER BY checked_at DESC
            '''
            
            if limit:
                query += f' LIMIT {limit}'
            
            cursor.execute(query)
            rows = cursor.fetchall()
            conn.close()
            
            results = []
            for row in rows:
                results.append({
                    'probeId': row[0],
                    'gatewayId': row[1],
                    'status': row[2],
                    'responseTime': row[3],
                    'statusCode': row[4],
                    'errorMessage': row[5],
                    'responseBody': row[6],
                    'checkedAt': row[7],
                    'synced': bool(row[8])
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to get local results: {e}")
            return []
    
    def get_unsynced_results(self) -> List[Dict[str, Any]]:
        """Get results that haven't been synced yet"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, probe_id, gateway_id, status, response_time, status_code,
                       error_message, response_body, checked_at
                FROM probe_results 
                WHERE synced = FALSE
                ORDER BY checked_at ASC
            ''')
            
            rows = cursor.fetchall()
            conn.close()
            
            results = []
            for row in rows:
                results.append({
                    'id': row[0],
                    'probeId': row[1],
                    'gatewayId': row[2],
                    'status': row[3],
                    'responseTime': row[4],
                    'statusCode': row[5],
                    'errorMessage': row[6],
                    'responseBody': row[7],
                    'checkedAt': row[8]
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to get unsynced results: {e}")
            return []
    
    def mark_results_synced(self, result_ids: List[int]):
        """Mark results as synced"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            placeholders = ','.join(['?' for _ in result_ids])
            cursor.execute(f'''
                UPDATE probe_results 
                SET synced = TRUE 
                WHERE id IN ({placeholders})
            ''', result_ids)
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to mark results as synced: {e}")
    
    def _cleanup_old_results(self):
        """Remove old results to maintain storage limits"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Count total results
            cursor.execute('SELECT COUNT(*) FROM probe_results')
            total_count = cursor.fetchone()[0]
            
            if total_count > self.config.max_local_results:
                # Delete oldest synced results
                cursor.execute('''
                    DELETE FROM probe_results 
                    WHERE id IN (
                        SELECT id FROM probe_results 
                        WHERE synced = TRUE 
                        ORDER BY checked_at ASC 
                        LIMIT ?
                    )
                ''', (total_count - self.config.max_local_results,))
                
                conn.commit()
                deleted_count = cursor.rowcount
                logger.info(f"Cleaned up {deleted_count} old results")
            
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to cleanup old results: {e}")
    
    def fetch_probes(self) -> List[Dict[str, Any]]:
        """Fetch assigned probes from backend"""
        try:
            url = f"{self.config.backend_url}/api/gateway/probes"
            headers = self.config.get_backend_headers()
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            probes = response.json()
            logger.debug(f"Fetched {len(probes)} probes from backend")
            
            return probes
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch probes from backend: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error fetching probes: {e}")
            return []
    
    def sync_results(self) -> int:
        """Sync unsynced results with backend"""
        try:
            unsynced_results = self.get_unsynced_results()
            
            if not unsynced_results:
                logger.debug("No results to sync")
                return 0
            
            # Prepare results for API (remove local ID)
            api_results = []
            result_ids = []
            
            for result in unsynced_results:
                result_ids.append(result.pop('id'))
                api_results.append(result)
            
            # Send to backend
            url = f"{self.config.backend_url}/api/gateway/results"
            headers = self.config.get_backend_headers()
            
            payload = {
                'apiKey': self.config.api_key,
                'results': api_results
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            
            # Mark as synced
            self.mark_results_synced(result_ids)
            self.last_sync_time = time.time()
            
            logger.info(f"Successfully synced {len(api_results)} results")
            return len(api_results)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to sync results with backend: {e}")
            return 0
        except Exception as e:
            logger.error(f"Unexpected error syncing results: {e}")
            return 0
    
    def send_heartbeat(self):
        """Send heartbeat to backend to indicate gateway is online"""
        try:
            url = f"{self.config.backend_url}/api/gateway/heartbeat"
            headers = self.config.get_backend_headers()
            
            payload = {
                'gatewayId': self.config.gateway_id,
                'gatewayType': self.config.gateway_type,
                'gatewayName': self.config.gateway_name,
                'location': self.config.gateway_location,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'stats': {
                    'uptime': time.time() - self.config.start_time,
                    'lastSync': self.last_sync_time,
                    'pendingResults': len(self.get_unsynced_results())
                }
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=15)
            response.raise_for_status()
            
            self.last_heartbeat_time = time.time()
            logger.debug("Heartbeat sent successfully")
            
        except requests.exceptions.RequestException as e:
            logger.warning(f"Failed to send heartbeat: {e}")
        except Exception as e:
            logger.error(f"Unexpected error sending heartbeat: {e}")
    
    def get_sync_stats(self) -> Dict[str, Any]:
        """Get synchronization statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Total results
            cursor.execute('SELECT COUNT(*) FROM probe_results')
            total_results = cursor.fetchone()[0]
            
            # Synced results
            cursor.execute('SELECT COUNT(*) FROM probe_results WHERE synced = TRUE')
            synced_results = cursor.fetchone()[0]
            
            # Unsynced results
            cursor.execute('SELECT COUNT(*) FROM probe_results WHERE synced = FALSE')
            unsynced_results = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'total_results': total_results,
                'synced_results': synced_results,
                'unsynced_results': unsynced_results,
                'last_sync_time': self.last_sync_time,
                'last_heartbeat_time': self.last_heartbeat_time
            }
            
        except Exception as e:
            logger.error(f"Failed to get sync stats: {e}")
            return {}
