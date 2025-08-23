<div class="acp-page-container">
    <div component="settings/main/header" class="row border-bottom py-2 m-0 sticky-top acp-page-main-header align-items-center">
        <div class="col-12 col-md-8 px-0 mb-1 mb-md-0">
            <h4 class="fw-bold tracking-tight mb-0">MCP Server</h4>
        </div>
        <div class="col-12 col-md-4 px-0 text-end">
            <button id="check-health" class="btn btn-primary btn-sm">Check Health</button>
        </div>
    </div>

    <div class="row m-0">
        <div id="spy-container" class="col-12 col-md-8 px-0 mb-3" tabindex="0">
            <!-- Server Status -->
            <div class="card mb-3">
                <div class="card-header">
                    <h5 class="card-title mb-0">Server Status</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <dl>
                                <dt>Status</dt>
                                <dd id="server-status">
                                    <span class="badge bg-secondary">Unknown</span>
                                </dd>
                                
                                <dt>Version</dt>
                                <dd id="server-version">{version}</dd>
                                
                                <dt>Endpoint</dt>
                                <dd><code>/api/mcp/health</code></dd>
                            </dl>
                        </div>
                        <div class="col-md-6">
                            <dl>
                                <dt>Uptime</dt>
                                <dd id="server-uptime">-</dd>
                                
                                <dt>Last Check</dt>
                                <dd id="last-check">Never</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Health Checks -->
            <div class="card mb-3">
                <div class="card-header">
                    <h5 class="card-title mb-0">Health Checks</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Component</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="health-checks">
                                <tr>
                                    <td colspan="2" class="text-center text-muted">
                                        No health check data available
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Capabilities -->
            <div class="card mb-3">
                <div class="card-header">
                    <h5 class="card-title mb-0">Server Capabilities</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Feature</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="capabilities">
                                <tr>
                                    <td>Tools</td>
                                    <td><span class="badge bg-secondary">Not Implemented</span></td>
                                </tr>
                                <tr>
                                    <td>Prompts</td>
                                    <td><span class="badge bg-secondary">Not Implemented</span></td>
                                </tr>
                                <tr>
                                    <td>Resources</td>
                                    <td><span class="badge bg-secondary">Not Implemented</span></td>
                                </tr>
                                <tr>
                                    <td>Authentication</td>
                                    <td><span class="badge bg-secondary">Not Implemented</span></td>
                                </tr>
                                <tr>
                                    <td>SSE</td>
                                    <td><span class="badge bg-secondary">Not Implemented</span></td>
                                </tr>
                                <tr>
                                    <td>JSON-RPC</td>
                                    <td><span class="badge bg-secondary">Not Implemented</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Configuration -->
            <div class="card">
                <div class="card-header">
                    <h5 class="card-title mb-0">Configuration</h5>
                </div>
                <div class="card-body">
                    <p class="text-muted">
                        MCP Server configuration will be available in future versions.
                    </p>
                </div>
            </div>
        </div>

        <!-- Sidebar -->
        <div class="col-12 col-md-4 px-0">
            <div class="sticky-top" style="top: 5rem;">
                <div class="card">
                    <div class="card-header">
                        <h5 class="card-title mb-0">Information</h5>
                    </div>
                    <div class="card-body">
                        <p>
                            The MCP (Model Context Protocol) Server provides an interface for AI models to interact with NodeBB.
                        </p>
                        <p>
                            Current implementation includes basic health checking functionality. Additional features will be added in future versions.
                        </p>
                        <hr>
                        <dl>
                            <dt>Documentation</dt>
                            <dd><a href="https://github.com/goofmint/caiz/docs/mcp-server" target="_blank">GitHub Documentation</a></dd>
                            
                            <dt>API Endpoints</dt>
                            <dd>
                                <ul class="list-unstyled mb-0">
                                    <li><code>/api/mcp/health</code></li>
                                    <li><code>/api/mcp/metadata</code></li>
                                    <li><code>/api/mcp/capabilities</code></li>
                                </ul>
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
(function() {
    'use strict';
    
    function formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return days + ' days';
        if (hours > 0) return hours + ' hours';
        if (minutes > 0) return minutes + ' minutes';
        return seconds + ' seconds';
    }
    
    function checkHealth() {
        fetch('/api/mcp/health')
            .then(response => response.json())
            .then(data => {
                // Update status
                const statusEl = document.getElementById('server-status');
                const statusBadge = data.status === 'healthy' ? 
                    '<span class="badge bg-success">Healthy</span>' :
                    data.status === 'unhealthy' ?
                    '<span class="badge bg-warning">Unhealthy</span>' :
                    '<span class="badge bg-danger">Error</span>';
                statusEl.innerHTML = statusBadge;
                
                // Update version
                if (data.version) {
                    document.getElementById('server-version').textContent = data.version;
                }
                
                // Update uptime
                if (data.uptime) {
                    document.getElementById('server-uptime').textContent = formatUptime(data.uptime);
                }
                
                // Update last check
                document.getElementById('last-check').textContent = new Date().toLocaleString();
                
                // Update health checks
                if (data.checks) {
                    const checksEl = document.getElementById('health-checks');
                    checksEl.innerHTML = '';
                    
                    for (const [component, status] of Object.entries(data.checks)) {
                        const row = document.createElement('tr');
                        const badge = status ? 
                            '<span class="badge bg-success">OK</span>' :
                            '<span class="badge bg-danger">Failed</span>';
                        row.innerHTML = `
                            <td>${component.charAt(0).toUpperCase() + component.slice(1)}</td>
                            <td>${badge}</td>
                        `;
                        checksEl.appendChild(row);
                    }
                }
                
                // Update capabilities
                if (data.capabilities) {
                    const capEl = document.getElementById('capabilities');
                    capEl.innerHTML = '';
                    
                    for (const [feature, enabled] of Object.entries(data.capabilities)) {
                        const row = document.createElement('tr');
                        const badge = enabled ? 
                            '<span class="badge bg-success">Enabled</span>' :
                            '<span class="badge bg-secondary">Not Implemented</span>';
                        row.innerHTML = `
                            <td>${feature.charAt(0).toUpperCase() + feature.slice(1)}</td>
                            <td>${badge}</td>
                        `;
                        capEl.appendChild(row);
                    }
                }
            })
            .catch(err => {
                console.error('[mcp-server] Health check failed:', err);
                document.getElementById('server-status').innerHTML = 
                    '<span class="badge bg-danger">Error</span>';
                document.getElementById('last-check').textContent = 'Failed: ' + err.message;
            });
    }
    
    // Check health on page load
    document.addEventListener('DOMContentLoaded', function() {
        checkHealth();
        
        // Setup button click handler
        document.getElementById('check-health').addEventListener('click', checkHealth);
        
        // Auto-refresh every 30 seconds
        setInterval(checkHealth, 30000);
    });
})();
</script>