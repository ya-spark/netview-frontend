# Gateway Architecture Documentation

## Overview

The gateway system is a distributed network of Python Flask applications that execute monitoring probes across different geographic locations.

## Gateway Types

### Core Gateways
- Managed by NetView platform
- Global distribution
- `tenantId` is NULL
- Available to all tenants

### Custom Gateways
- Deployed by tenants
- Private monitoring
- Associated with specific `tenantId`
- Full control over location and configuration

## Gateway Application

### Technology Stack
- **Language**: Python 3
- **Framework**: Flask
- **HTTP Client**: Requests library
- **DNS**: DNSPython
- **Browser Automation**: Selenium WebDriver
- **Local Storage**: SQLite (result caching)

### Core Components

**File**: `gateway/services/probe_executor.py`

#### ProbeExecutor Class

Executes different types of monitoring probes:

```python
class ProbeExecutor:
    def __init__(self, config):
        self.config = config
        self.total_executions = 0
        self.successful_executions = 0
        self.failed_executions = 0
        self.session = requests.Session()
    
    def execute_probe(self, probe: Dict[str, Any]) -> Dict[str, Any]:
        # Routes to appropriate probe type handler
        if probe_type == 'Uptime':
            return self._execute_uptime_probe(probe)
        elif probe_type == 'API':
            return self._execute_api_probe(probe)
        elif probe_type == 'Security':
            return self._execute_security_probe(probe)
        elif probe_type == 'Browser':
            return self._execute_browser_probe(probe)
```

### Probe Execution Types

#### 1. Uptime Probes
```python
def _execute_uptime_probe(self, probe):
    response = self.session.get(
        probe['url'],
        timeout=probe.get('expectedResponseTime', 5000) / 1000,
        verify=self.config.verify_ssl
    )
    
    return {
        'status': 'Up' if response.status_code == probe['expectedStatusCode'] else 'Down',
        'statusCode': response.status_code,
        'responseTime': response.elapsed.total_seconds() * 1000
    }
```

**Features**:
- HTTP/HTTPS protocol support
- Response code validation
- Response time measurement
- SSL verification (configurable)

#### 2. API Probes
```python
def _execute_api_probe(self, probe):
    response = self.session.request(
        method=probe.get('method', 'GET'),
        url=probe['url'],
        headers=probe.get('headers', {}),
        data=probe.get('body'),
        timeout=probe.get('expectedResponseTime', 5000) / 1000
    )
    
    return {
        'status': 'Up' if response.status_code == probe['expectedStatusCode'] else 'Down',
        'statusCode': response.status_code,
        'responseBody': response.text[:1000],  # First 1000 chars
        'responseTime': response.elapsed.total_seconds() * 1000
    }
```

**Features**:
- Multiple HTTP methods (GET, POST, PUT, DELETE, etc.)
- Custom headers
- Request body support
- Response body capture

#### 3. Security Probes
```python
def _execute_security_probe(self, probe):
    checks = {
        'ssl_valid': False,
        'ssl_expiry': None,
        'security_headers': {},
        'dns_records': []
    }
    
    # SSL certificate check
    # Security headers check (HSTS, CSP, etc.)
    # DNS configuration check
    
    return {
        'status': 'Up' if all_checks_pass else 'Warning',
        'responseBody': json.dumps(checks)
    }
```

**Features**:
- SSL certificate validation
- Certificate expiry check
- Security headers analysis (HSTS, X-Frame-Options, CSP)
- DNS record verification

#### 4. Browser Probes
```python
def _execute_browser_probe(self, probe):
    driver = webdriver.Chrome(options=chrome_options)
    
    driver.get(probe['url'])
    
    # Performance metrics
    navigation_timing = driver.execute_script(
        "return window.performance.timing"
    )
    
    # Screenshot capture
    screenshot = driver.get_screenshot_as_base64()
    
    return {
        'status': 'Up',
        'responseTime': page_load_time,
        'responseBody': json.dumps({
            'performance': metrics,
            'screenshot': screenshot
        })
    }
```

**Features**:
- Real browser execution
- JavaScript rendering
- Performance metrics (load time, DOM ready, etc.)
- Screenshot capture
- Console error detection

### Gateway Synchronization

#### Probe Sync

**Endpoint**: `GET /api/gateways/:id/probes`

Periodically fetches assigned probes:
```python
def sync_probes():
    response = requests.get(
        f"{backend_url}/api/gateways/{gateway_id}/probes",
        headers={'Authorization': f'Bearer {api_key}'}
    )
    probes = response.json()
    
    # Update local SQLite cache
    update_local_probes(probes)
```

**Frequency**: Every 1-5 minutes (configurable)

#### Result Submission

**Endpoint**: `POST /api/gateways/:id/results`

Submits probe execution results:
```python
def submit_results(results):
    response = requests.post(
        f"{backend_url}/api/gateways/{gateway_id}/results",
        headers={'Authorization': f'Bearer {api_key}'},
        json=results
    )
```

**Result format**:
```python
{
    'probeId': 'uuid',
    'gatewayId': 'uuid',
    'status': 'Up' | 'Down' | 'Warning',
    'responseTime': int,  # milliseconds
    'statusCode': int,
    'errorMessage': str,
    'responseBody': str,
    'checkedAt': 'ISO timestamp'
}
```

#### Heartbeat

**Endpoint**: `PUT /api/gateways/:id/heartbeat`

Regular heartbeat to indicate online status:
```python
def send_heartbeat():
    requests.put(
        f"{backend_url}/api/gateways/{gateway_id}/heartbeat",
        headers={'Authorization': f'Bearer {api_key}'}
    )
```

**Frequency**: Every 30 seconds

### Local Caching (SQLite)

Gateways use SQLite for:
- **Probe storage**: Cache active probes
- **Result buffering**: Queue results if backend unreachable
- **Configuration**: Store gateway settings

**Schema**:
```sql
CREATE TABLE probes (
    id TEXT PRIMARY KEY,
    config TEXT,  -- JSON
    last_synced INTEGER
);

CREATE TABLE results (
    id TEXT PRIMARY KEY,
    probe_id TEXT,
    result TEXT,  -- JSON
    submitted INTEGER DEFAULT 0,
    created_at INTEGER
);
```

### Gateway Configuration

**Environment variables**:
```bash
GATEWAY_ID=uuid
GATEWAY_API_KEY=nv_xxx
BACKEND_URL=https://api.netview.com
VERIFY_SSL=true
USER_AGENT=NetView Gateway/1.0
SYNC_INTERVAL=300  # seconds
HEARTBEAT_INTERVAL=30  # seconds
```

### Error Handling

**Probe execution errors**:
```python
try:
    result = execute_probe(probe)
except requests.Timeout:
    result = {
        'status': 'Down',
        'errorMessage': 'Request timeout'
    }
except requests.ConnectionError:
    result = {
        'status': 'Down', 
        'errorMessage': 'Connection failed'
    }
except Exception as e:
    result = {
        'status': 'Down',
        'errorMessage': str(e)
    }
```

**Backend sync errors**:
- Retry with exponential backoff
- Queue results in SQLite
- Continue local execution
- Alert on prolonged disconnection

### Deployment

#### Core Gateway Deployment
1. Provision server in target region
2. Install Python dependencies
3. Configure gateway credentials
4. Register gateway in backend
5. Start gateway service
6. Monitor heartbeat

#### Custom Gateway Deployment
1. User creates gateway via UI
2. Backend generates API key
3. User deploys gateway code
4. Configure with API key
5. Gateway auto-registers
6. Assign probes to gateway

### Monitoring & Health

**Gateway health indicators**:
- `isOnline`: Based on heartbeat (< 60s)
- `lastHeartbeat`: Timestamp of last heartbeat
- Success/failure rate of probes
- Average response time

**Metrics tracked**:
```python
{
    'total_executions': int,
    'successful_executions': int,
    'failed_executions': int,
    'uptime': float,  # percentage
    'avg_response_time': float
}
```

### Security

**Gateway authentication**:
- API key in Authorization header
- Key validated on every request
- Scoped permissions (gateways:write)

**SSL/TLS**:
- HTTPS for all backend communication
- Certificate verification (configurable)

**Isolation**:
- Each gateway runs independently
- No cross-gateway communication
- Tenant data isolation

### Best Practices

1. **Geographic distribution**: Deploy gateways in multiple regions
2. **Redundancy**: Multiple gateways per region
3. **Load balancing**: Distribute probes across gateways
4. **Resource limits**: Set max concurrent executions
5. **Logging**: Comprehensive execution logs
6. **Monitoring**: Track gateway health metrics
7. **Updates**: Regular security patches and updates
