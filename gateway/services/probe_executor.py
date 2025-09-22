import time
import requests
import socket
import ssl
import dns.resolver
import smtplib
import json
import logging
from typing import Dict, Any, Optional
from urllib.parse import urlparse
from datetime import datetime

# Optional imports for browser monitoring
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    BROWSER_SUPPORT = True
except ImportError:
    BROWSER_SUPPORT = False

logger = logging.getLogger(__name__)

class ProbeExecutor:
    """Executes different types of monitoring probes"""
    
    def __init__(self, config):
        self.config = config
        self.total_executions = 0
        self.successful_executions = 0
        self.failed_executions = 0
        
        # Setup requests session
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': config.user_agent})
        
        if not config.verify_ssl:
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    def execute_probe(self, probe: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a probe and return results"""
        self.total_executions += 1
        start_time = time.time()
        
        try:
            result = {
                'probeId': probe['id'],
                'gatewayId': self.config.gateway_id,
                'status': 'Unknown',
                'responseTime': 0,
                'statusCode': None,
                'errorMessage': None,
                'responseBody': None,
                'checkedAt': datetime.utcnow().isoformat() + 'Z'
            }
            
            probe_type = probe.get('type', 'Uptime')
            
            if probe_type == 'Uptime':
                result.update(self._execute_uptime_probe(probe))
            elif probe_type == 'API':
                result.update(self._execute_api_probe(probe))
            elif probe_type == 'Security':
                result.update(self._execute_security_probe(probe))
            elif probe_type == 'Browser':
                result.update(self._execute_browser_probe(probe))
            else:
                result.update({
                    'status': 'Down',
                    'errorMessage': f'Unsupported probe type: {probe_type}'
                })
            
            # Calculate response time
            result['responseTime'] = int((time.time() - start_time) * 1000)
            
            if result['status'] == 'Up':
                self.successful_executions += 1
            else:
                self.failed_executions += 1
            
            logger.info(f"Probe {probe['id']} executed: {result['status']} in {result['responseTime']}ms")
            return result
            
        except Exception as e:
            self.failed_executions += 1
            logger.error(f"Error executing probe {probe['id']}: {e}")
            
            return {
                'probeId': probe['id'],
                'gatewayId': self.config.gateway_id,
                'status': 'Down',
                'responseTime': int((time.time() - start_time) * 1000),
                'statusCode': None,
                'errorMessage': str(e),
                'responseBody': None,
                'checkedAt': datetime.utcnow().isoformat() + 'Z'
            }
    
    def _execute_uptime_probe(self, probe: Dict[str, Any]) -> Dict[str, Any]:
        """Execute uptime monitoring probe"""
        url = probe.get('url')
        protocol = probe.get('protocol', 'HTTPS')
        expected_status = probe.get('expectedStatusCode', 200)
        timeout = probe.get('expectedResponseTime', self.config.default_timeout) / 1000
        
        if protocol in ['HTTP', 'HTTPS']:
            return self._check_http(url, expected_status, timeout)
        elif protocol == 'TCP':
            return self._check_tcp(url, timeout)
        elif protocol == 'SMTP':
            return self._check_smtp(url, timeout)
        elif protocol == 'DNS':
            return self._check_dns(url, timeout)
        else:
            return {
                'status': 'Down',
                'errorMessage': f'Unsupported protocol: {protocol}'
            }
    
    def _execute_api_probe(self, probe: Dict[str, Any]) -> Dict[str, Any]:
        """Execute API monitoring probe"""
        url = probe.get('url')
        method = probe.get('method', 'GET')
        headers = probe.get('headers', {})
        body = probe.get('body')
        expected_status = probe.get('expectedStatusCode', 200)
        timeout = probe.get('expectedResponseTime', self.config.default_timeout) / 1000
        
        try:
            # Prepare request
            request_kwargs = {
                'timeout': timeout,
                'verify': self.config.verify_ssl
            }
            
            if headers:
                request_kwargs['headers'] = headers
            
            if body and method.upper() in ['POST', 'PUT', 'PATCH']:
                if isinstance(body, str):
                    try:
                        json.loads(body)  # Validate JSON
                        request_kwargs['json'] = json.loads(body)
                    except json.JSONDecodeError:
                        request_kwargs['data'] = body
                else:
                    request_kwargs['json'] = body
            
            # Make request
            response = self.session.request(method.upper(), url, **request_kwargs)
            
            # Check status
            status = 'Up' if response.status_code == expected_status else 'Down'
            error_message = None if status == 'Up' else f'Expected status {expected_status}, got {response.status_code}'
            
            return {
                'status': status,
                'statusCode': response.status_code,
                'errorMessage': error_message,
                'responseBody': response.text[:1000] if len(response.text) <= 1000 else response.text[:1000] + '...'
            }
            
        except requests.exceptions.Timeout:
            return {
                'status': 'Down',
                'errorMessage': f'Request timed out after {timeout}s'
            }
        except requests.exceptions.RequestException as e:
            return {
                'status': 'Down',
                'errorMessage': str(e)
            }
    
    def _execute_security_probe(self, probe: Dict[str, Any]) -> Dict[str, Any]:
        """Execute security monitoring probe"""
        url = probe.get('url')
        
        try:
            # Basic security checks
            security_issues = []
            
            # Check SSL certificate
            parsed_url = urlparse(url)
            if parsed_url.scheme == 'https':
                try:
                    context = ssl.create_default_context()
                    with socket.create_connection((parsed_url.hostname, 443), timeout=10) as sock:
                        with context.wrap_socket(sock, server_hostname=parsed_url.hostname) as ssock:
                            cert = ssock.getpeercert()
                            
                            # Check certificate expiry
                            not_after = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                            days_until_expiry = (not_after - datetime.now()).days
                            
                            if days_until_expiry < 30:
                                security_issues.append(f'SSL certificate expires in {days_until_expiry} days')
                except Exception as e:
                    security_issues.append(f'SSL certificate error: {str(e)}')
            
            # Check HTTP headers
            try:
                response = self.session.get(url, timeout=10, verify=self.config.verify_ssl)
                headers = response.headers
                
                # Check security headers
                security_headers = [
                    'Strict-Transport-Security',
                    'X-Content-Type-Options',
                    'X-Frame-Options',
                    'X-XSS-Protection',
                    'Content-Security-Policy'
                ]
                
                missing_headers = [header for header in security_headers if header not in headers]
                if missing_headers:
                    security_issues.append(f'Missing security headers: {", ".join(missing_headers)}')
                
                # Check for information disclosure
                server_header = headers.get('Server', '')
                if server_header and any(keyword in server_header.lower() for keyword in ['apache/', 'nginx/', 'iis/']):
                    security_issues.append(f'Server version disclosed: {server_header}')
                
            except Exception as e:
                security_issues.append(f'HTTP check failed: {str(e)}')
            
            # Determine status
            status = 'Up' if not security_issues else 'Warning'
            error_message = '; '.join(security_issues) if security_issues else None
            
            return {
                'status': status,
                'statusCode': 200 if not security_issues else 206,
                'errorMessage': error_message,
                'responseBody': json.dumps({'security_issues': security_issues})
            }
            
        except Exception as e:
            return {
                'status': 'Down',
                'errorMessage': f'Security check failed: {str(e)}'
            }
    
    def _execute_browser_probe(self, probe: Dict[str, Any]) -> Dict[str, Any]:
        """Execute browser monitoring probe"""
        if not BROWSER_SUPPORT:
            return {
                'status': 'Down',
                'errorMessage': 'Browser monitoring not supported (selenium not installed)'
            }
        
        url = probe.get('url')
        
        try:
            # Setup Chrome options
            chrome_options = Options()
            if self.config.headless_browser:
                chrome_options.add_argument('--headless')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--window-size=1920,1080')
            
            # Initialize driver
            driver_kwargs = {'options': chrome_options}
            if self.config.chrome_executable_path:
                driver_kwargs['executable_path'] = self.config.chrome_executable_path
            
            driver = webdriver.Chrome(**driver_kwargs)
            
            try:
                # Load page
                driver.get(url)
                
                # Wait for page to load
                WebDriverWait(driver, 10).until(
                    lambda d: d.execute_script('return document.readyState') == 'complete'
                )
                
                # Basic checks
                issues = []
                
                # Check for JavaScript errors
                logs = driver.get_log('browser')
                js_errors = [log for log in logs if log['level'] == 'SEVERE']
                if js_errors:
                    issues.append(f'{len(js_errors)} JavaScript errors found')
                
                # Check page title
                title = driver.title
                if not title or title.lower() in ['error', '404', '500']:
                    issues.append(f'Problematic page title: {title}')
                
                # Check for broken links (sample a few)
                links = driver.find_elements(By.TAG_NAME, 'a')[:5]  # Check first 5 links
                broken_links = []
                for link in links:
                    href = link.get_attribute('href')
                    if href and href.startswith('http'):
                        try:
                            response = requests.head(href, timeout=5, verify=self.config.verify_ssl)
                            if response.status_code >= 400:
                                broken_links.append(href)
                        except:
                            broken_links.append(href)
                
                if broken_links:
                    issues.append(f'{len(broken_links)} broken links found')
                
                # Performance metrics
                performance = driver.execute_script("""
                    const perfData = performance.getEntriesByType('navigation')[0];
                    return {
                        loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                        responseTime: perfData.responseEnd - perfData.responseStart
                    };
                """)
                
                status = 'Up' if not issues else 'Warning'
                error_message = '; '.join(issues) if issues else None
                
                return {
                    'status': status,
                    'statusCode': 200,
                    'errorMessage': error_message,
                    'responseBody': json.dumps({
                        'title': title,
                        'performance': performance,
                        'issues': issues
                    })
                }
                
            finally:
                driver.quit()
                
        except Exception as e:
            return {
                'status': 'Down',
                'errorMessage': f'Browser check failed: {str(e)}'
            }
    
    def _check_http(self, url: str, expected_status: int, timeout: float) -> Dict[str, Any]:
        """Check HTTP/HTTPS endpoint"""
        try:
            response = self.session.get(url, timeout=timeout, verify=self.config.verify_ssl)
            status = 'Up' if response.status_code == expected_status else 'Down'
            error_message = None if status == 'Up' else f'Expected status {expected_status}, got {response.status_code}'
            
            return {
                'status': status,
                'statusCode': response.status_code,
                'errorMessage': error_message,
                'responseBody': response.text[:500] if len(response.text) <= 500 else response.text[:500] + '...'
            }
        except requests.exceptions.Timeout:
            return {
                'status': 'Down',
                'errorMessage': f'Request timed out after {timeout}s'
            }
        except requests.exceptions.RequestException as e:
            return {
                'status': 'Down',
                'errorMessage': str(e)
            }
    
    def _check_tcp(self, url: str, timeout: float) -> Dict[str, Any]:
        """Check TCP connection"""
        try:
            parsed_url = urlparse(url)
            host = parsed_url.hostname
            port = parsed_url.port or 80
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((host, port))
            sock.close()
            
            if result == 0:
                return {'status': 'Up', 'statusCode': 200}
            else:
                return {
                    'status': 'Down',
                    'errorMessage': f'TCP connection failed to {host}:{port}'
                }
        except Exception as e:
            return {
                'status': 'Down',
                'errorMessage': f'TCP check failed: {str(e)}'
            }
    
    def _check_smtp(self, url: str, timeout: float) -> Dict[str, Any]:
        """Check SMTP server"""
        try:
            parsed_url = urlparse(url)
            host = parsed_url.hostname
            port = parsed_url.port or 25
            
            server = smtplib.SMTP(timeout=timeout)
            server.connect(host, port)
            server.quit()
            
            return {'status': 'Up', 'statusCode': 220}
        except Exception as e:
            return {
                'status': 'Down',
                'errorMessage': f'SMTP check failed: {str(e)}'
            }
    
    def _check_dns(self, url: str, timeout: float) -> Dict[str, Any]:
        """Check DNS resolution"""
        try:
            parsed_url = urlparse(url)
            host = parsed_url.hostname or url
            
            resolver = dns.resolver.Resolver()
            resolver.timeout = timeout
            resolver.lifetime = timeout
            
            answers = resolver.resolve(host, 'A')
            if answers:
                return {
                    'status': 'Up',
                    'statusCode': 200,
                    'responseBody': f'Resolved to: {", ".join([str(answer) for answer in answers])}'
                }
            else:
                return {
                    'status': 'Down',
                    'errorMessage': f'DNS resolution failed for {host}'
                }
        except Exception as e:
            return {
                'status': 'Down',
                'errorMessage': f'DNS check failed: {str(e)}'
            }
