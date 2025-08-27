<!-- OAuth Device Authorization Page -->
<div class="device-auth-container">
    <div class="row justify-content-center">
        <div class="col-md-6">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">[[mcp-server:oauth.device.title]]</h3>
                </div>
                
                <div class="card-body">
                    <!-- IF error -->
                    <div class="alert alert-danger">
                        <!-- IF error == "error-invalid-code" -->[[mcp-server:oauth.device.error-invalid-code]]<!-- ENDIF -->
                        <!-- IF error == "error-not-found" -->[[mcp-server:oauth.device.error-not-found]]<!-- ENDIF -->
                        <!-- IF error == "error-expired-code" -->[[mcp-server:oauth.device.error-expired-code]]<!-- ENDIF -->
                        <!-- IF error == "error-already-processed" -->[[mcp-server:oauth.device.error-already-processed]]<!-- ENDIF -->
                        <!-- IF error == "error-server" -->[[mcp-server:oauth.device.error-server]]<!-- ENDIF -->
                        <!-- IF error == "missing-code" -->[[mcp-server:oauth.device.error-missing-code]]<!-- ENDIF -->
                        <!-- IF error == "invalid-code" -->[[mcp-server:oauth.device.error-invalid-code]]<!-- ENDIF -->
                        <!-- IF error == "not-found" -->[[mcp-server:oauth.device.error-not-found]]<!-- ENDIF -->
                        <!-- IF error == "expired" -->[[mcp-server:oauth.device.error-expired-code]]<!-- ENDIF -->
                        <!-- IF error == "already-processed" -->[[mcp-server:oauth.device.error-already-processed]]<!-- ENDIF -->
                        <!-- IF error == "invalid-action" -->[[mcp-server:oauth.device.error-invalid-action]]<!-- ENDIF -->
                        <!-- IF error == "server" -->[[mcp-server:oauth.device.error-server]]<!-- ENDIF -->
                    </div>
                    <!-- ENDIF -->

                    <!-- Success messages -->
                    <!-- IF {queryByName.success} -->
                    <div class="alert alert-success">
                        <!-- IF {queryByName.success} == "approved" -->[[mcp-server:oauth.device.success-approved]]<!-- ENDIF -->
                        <!-- IF {queryByName.success} == "denied" -->[[mcp-server:oauth.device.success-denied]]<!-- ENDIF -->
                    </div>
                    <!-- ENDIF -->
                    
                    <!-- IF !user_code -->
                    <!-- User code input form -->
                    <div class="user-code-input">
                        <p class="text-muted">[[mcp-server:oauth.device.description]]</p>
                        
                        <form method="post" action="/oauth/device">
                            <input type="hidden" name="_csrf" value="{csrf_token}">
                            <div class="form-group">
                                <label for="user_code">[[mcp-server:oauth.device.user-code-label]]</label>
                                <input type="text" class="form-control" id="user_code" name="user_code"
                                       placeholder="XXXX-XXXX"
                                       pattern="[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}"
                                       maxlength="9" inputmode="latin" autocomplete="one-time-code" required
                                       aria-describedby="user_code_help">
                                <small id="user_code_help" class="form-text text-muted">[[mcp-server:oauth.device.user-code-help]]</small>
                            </div>
                            
                            <button type="submit" class="btn btn-primary w-100">[[mcp-server:oauth.device.continue]]</button>
                        </form>
                    </div>
                    <!-- ENDIF -->
                    
                    <!-- IF user_code -->
                    <!-- Authorization confirmation -->
                    <div class="auth-request-details">
                        <h4>[[mcp-server:oauth.device.confirm-title]]</h4>
                        
                        <div class="device-info">
                            <div class="alert alert-info">
                                <h5>[[mcp-server:oauth.device.auth-details]]</h5>
                                <p><strong>[[mcp-server:oauth.device.user-code]]:</strong> <code>{user_code}</code></p>
                                <p><strong>[[mcp-server:oauth.device.client]]:</strong> {client_name}</p>
                                
                                <!-- IF scopes -->
                                <p><strong>[[mcp-server:oauth.device.scopes]]:</strong></p>
                                <ul class="scope-list">
                                    <!-- BEGIN scopes -->
                                    <li>{scopes.description}</li>
                                    <!-- END scopes -->
                                </ul>
                                <!-- ENDIF -->
                                
                                <!-- IF expires_at -->
                                <p><strong>[[mcp-server:oauth.device.expires]]:</strong> <span data-expires="{expires_ts}">{expires_at}</span></p>
                                <!-- ENDIF -->
                            </div>
                        </div>
                        
                        <div class="auth-warning">
                            <p class="text-warning">
                                <i class="fa fa-exclamation-triangle"></i>
                                [[mcp-server:oauth.device.warning]]
                            </p>
                        </div>
                        
                        <form method="post" action="/oauth/device">
                            <input type="hidden" name="_csrf" value="{csrf_token}">
                            <input type="hidden" name="user_code" value="{user_code}">
                            <input type="hidden" name="tx_id" value="{tx_id}">
                            
                            <div class="button-group mt-3">
                                <button type="submit" name="action" value="approve" 
                                        class="btn btn-success btn-lg mr-2">
                                    <i class="fa fa-check"></i>
                                    [[mcp-server:oauth.device.approve]]
                                </button>
                                <button type="submit" name="action" value="deny" 
                                        class="btn btn-danger btn-lg">
                                    <i class="fa fa-times"></i>
                                    [[mcp-server:oauth.device.deny]]
                                </button>
                            </div>
                        </form>
                    </div>
                    <!-- ENDIF -->
                </div>
                
                <div class="card-footer text-muted text-center">
                    <small>[[mcp-server:oauth.device.footer]]</small>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
.device-auth-container {
    padding: 2rem 0;
}

.user-code-input #user_code {
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-family: monospace;
    font-size: 1.2rem;
    text-align: center;
}

.auth-request-details code {
    font-size: 1.1rem;
    padding: 0.2rem 0.4rem;
}

.button-group {
    text-align: center;
}

.button-group .btn {
    min-width: 120px;
}

.scope-list {
    margin-bottom: 0;
}

.auth-warning {
    margin: 1rem 0;
}

@media (max-width: 768px) {
    .button-group .btn {
        display: block;
        width: 100%;
        margin: 0.5rem 0;
    }
    
    .button-group .btn:first-child {
        margin-bottom: 0.5rem;
    }
}
</style>

<script>
require(['oauth-device'], function(OAuthDevice) {
    OAuthDevice.init();
});
</script>