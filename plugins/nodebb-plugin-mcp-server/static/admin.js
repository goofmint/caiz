'use strict';

define('admin/plugins/mcp-server', ['settings', 'alerts'], function (Settings, alerts) {
    const ACP = {};
    
    ACP.init = function () {
        console.log('[mcp-server] Admin page initialized');
        
        // Initialize health check functionality
        setupHealthCheck();
        
        // Initial health check
        checkHealth();
        
        // Auto-refresh every 30 seconds
        setInterval(checkHealth, 30000);
    };
    
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
    
    function setupHealthCheck() {
        $('#check-health').on('click', function () {
            checkHealth();
        });
    }
    
    function checkHealth() {
        $.ajax({
            url: '/api/mcp/health',
            method: 'GET',
            success: function (data) {
                updateHealthDisplay(data);
            },
            error: function (xhr, status, error) {
                console.error('[mcp-server] Health check failed:', error);
                updateErrorDisplay(error);
            }
        });
    }
    
    function updateHealthDisplay(data) {
        // Update status
        const statusEl = $('#server-status');
        let statusBadge = '';
        
        if (data.status === 'healthy') {
            statusBadge = '<span class="badge bg-success">Healthy</span>';
        } else if (data.status === 'unhealthy') {
            statusBadge = '<span class="badge bg-warning">Unhealthy</span>';
        } else {
            statusBadge = '<span class="badge bg-danger">Error</span>';
        }
        
        statusEl.html(statusBadge);
        
        // Update version
        if (data.version) {
            $('#server-version').text(data.version);
        }
        
        // Update uptime
        if (data.uptime) {
            $('#server-uptime').text(formatUptime(data.uptime));
        }
        
        // Update last check
        $('#last-check').text(new Date().toLocaleString());
        
        // Update health checks
        if (data.checks) {
            const checksEl = $('#health-checks');
            checksEl.empty();
            
            Object.keys(data.checks).forEach(function (component) {
                const status = data.checks[component];
                const badge = status ? 
                    '<span class="badge bg-success">OK</span>' :
                    '<span class="badge bg-danger">Failed</span>';
                
                const row = $('<tr>');
                row.append($('<td>').text(component.charAt(0).toUpperCase() + component.slice(1)));
                row.append($('<td>').html(badge));
                checksEl.append(row);
            });
        }
        
        // Update capabilities
        if (data.capabilities) {
            const capEl = $('#capabilities');
            capEl.empty();
            
            Object.keys(data.capabilities).forEach(function (feature) {
                const enabled = data.capabilities[feature];
                const badge = enabled ? 
                    '<span class="badge bg-success">Enabled</span>' :
                    '<span class="badge bg-secondary">Not Implemented</span>';
                
                const row = $('<tr>');
                row.append($('<td>').text(feature.charAt(0).toUpperCase() + feature.slice(1)));
                row.append($('<td>').html(badge));
                capEl.append(row);
            });
        }
    }
    
    function updateErrorDisplay(error) {
        $('#server-status').html('<span class="badge bg-danger">Error</span>');
        $('#last-check').text('Failed: ' + error);
    }
    
    return ACP;
});