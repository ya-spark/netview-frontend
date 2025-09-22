import os
import time
import threading
from flask import Flask, request, jsonify
from config import Config
from services.probe_executor import ProbeExecutor
from services.sync_service import SyncService
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
config = Config()

# Initialize services
probe_executor = ProbeExecutor(config)
sync_service = SyncService(config)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'gateway_id': config.gateway_id,
        'gateway_type': config.gateway_type,
        'version': '1.0.0'
    })

@app.route('/probes', methods=['GET'])
def get_probes():
    """Get assigned probes from backend"""
    try:
        probes = sync_service.fetch_probes()
        return jsonify({
            'probes': probes,
            'count': len(probes)
        })
    except Exception as e:
        logger.error(f"Error fetching probes: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/execute', methods=['POST'])
def execute_probe():
    """Manual probe execution endpoint"""
    try:
        probe_data = request.get_json()
        if not probe_data:
            return jsonify({'error': 'No probe data provided'}), 400

        result = probe_executor.execute_probe(probe_data)
        
        # Store result locally
        sync_service.store_result_locally(result)
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error executing probe: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/results', methods=['GET'])
def get_results():
    """Get stored results"""
    try:
        results = sync_service.get_local_results()
        return jsonify({
            'results': results,
            'count': len(results)
        })
    except Exception as e:
        logger.error(f"Error fetching results: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/sync', methods=['POST'])
def manual_sync():
    """Manual sync with backend"""
    try:
        sync_count = sync_service.sync_results()
        return jsonify({
            'message': f'Synced {sync_count} results',
            'synced_count': sync_count
        })
    except Exception as e:
        logger.error(f"Error during manual sync: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get gateway statistics"""
    try:
        stats = {
            'gateway_id': config.gateway_id,
            'gateway_type': config.gateway_type,
            'uptime': time.time() - config.start_time,
            'total_executions': probe_executor.total_executions,
            'successful_executions': probe_executor.successful_executions,
            'failed_executions': probe_executor.failed_executions,
            'pending_results': len(sync_service.get_local_results()),
            'last_sync': sync_service.last_sync_time,
            'last_heartbeat': sync_service.last_heartbeat_time
        }
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        return jsonify({'error': str(e)}), 500

def start_background_services():
    """Start background services"""
    def probe_scheduler():
        """Background probe execution scheduler"""
        while True:
            try:
                # Fetch probes and execute them
                probes = sync_service.fetch_probes()
                for probe in probes:
                    if probe.get('isActive', True):
                        result = probe_executor.execute_probe(probe)
                        sync_service.store_result_locally(result)
                        
                        # Add delay between probe executions
                        time.sleep(1)
                
                # Wait for next cycle
                time.sleep(config.probe_check_interval)
            except Exception as e:
                logger.error(f"Error in probe scheduler: {e}")
                time.sleep(30)  # Wait before retrying

    def sync_scheduler():
        """Background sync scheduler"""
        while True:
            try:
                # Send heartbeat
                sync_service.send_heartbeat()
                
                # Sync results
                sync_service.sync_results()
                
                # Wait for next sync
                time.sleep(config.sync_interval)
            except Exception as e:
                logger.error(f"Error in sync scheduler: {e}")
                time.sleep(30)  # Wait before retrying

    # Start background threads
    probe_thread = threading.Thread(target=probe_scheduler, daemon=True)
    sync_thread = threading.Thread(target=sync_scheduler, daemon=True)
    
    probe_thread.start()
    sync_thread.start()
    
    logger.info("Background services started")

if __name__ == '__main__':
    logger.info(f"Starting NetView Gateway - Type: {config.gateway_type}, ID: {config.gateway_id}")
    
    # Start background services
    start_background_services()
    
    # Start Flask app
    app.run(
        host=config.host,
        port=config.port,
        debug=config.debug
    )
