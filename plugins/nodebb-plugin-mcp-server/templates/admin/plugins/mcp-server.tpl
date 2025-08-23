<div class="acp-page-container">
    <div component="settings/main/header" class="row border-bottom py-2 m-0 sticky-top acp-page-main-header align-items-center">
        <div class="col-12 col-md-8 px-0 mb-1 mb-md-0">
            <h4 class="fw-bold tracking-tight mb-0">[[mcp-server:admin.title]]</h4>
        </div>
        <div class="col-12 col-md-4 px-0 text-end">
            <button id="check-health" class="btn btn-primary btn-sm">[[mcp-server:admin.check-health]]</button>
        </div>
    </div>

    <div class="row m-0">
        <div id="spy-container" class="col-12 col-md-8 px-0 mb-3" tabindex="0">
            <!-- Server Status -->
            <div class="card mb-3">
                <div class="card-header">
                    <h5 class="card-title mb-0">[[mcp-server:admin.status]]</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <dl>
                                <dt>[[mcp-server:admin.status-label]]</dt>
                                <dd id="server-status">
                                    <span class="badge bg-secondary">[[mcp-server:admin.unknown]]</span>
                                </dd>
                                
                                <dt>[[mcp-server:admin.version]]</dt>
                                <dd id="server-version">{version}</dd>
                                
                                <dt>[[mcp-server:admin.endpoint]]</dt>
                                <dd><code>/api/mcp/health</code></dd>
                            </dl>
                        </div>
                        <div class="col-md-6">
                            <dl>
                                <dt>[[mcp-server:admin.uptime]]</dt>
                                <dd id="server-uptime">-</dd>
                                
                                <dt>[[mcp-server:admin.last-check]]</dt>
                                <dd id="last-check">[[mcp-server:admin.never]]</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Health Checks -->
            <div class="card mb-3">
                <div class="card-header">
                    <h5 class="card-title mb-0">[[mcp-server:admin.health]]</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>[[mcp-server:admin.component]]</th>
                                    <th>[[mcp-server:admin.status-label]]</th>
                                </tr>
                            </thead>
                            <tbody id="health-checks">
                                <tr>
                                    <td colspan="2" class="text-center text-muted">
                                        [[mcp-server:admin.no-data]]
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
                    <h5 class="card-title mb-0">[[mcp-server:admin.capabilities]]</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>[[mcp-server:admin.feature]]</th>
                                    <th>[[mcp-server:admin.status-label]]</th>
                                </tr>
                            </thead>
                            <tbody id="capabilities">
                                <tr>
                                    <td>[[mcp-server:admin.tools]]</td>
                                    <td><span class="badge bg-secondary">[[mcp-server:admin.not-implemented]]</span></td>
                                </tr>
                                <tr>
                                    <td>[[mcp-server:admin.prompts]]</td>
                                    <td><span class="badge bg-secondary">[[mcp-server:admin.not-implemented]]</span></td>
                                </tr>
                                <tr>
                                    <td>[[mcp-server:admin.resources]]</td>
                                    <td><span class="badge bg-secondary">[[mcp-server:admin.not-implemented]]</span></td>
                                </tr>
                                <tr>
                                    <td>[[mcp-server:admin.authentication]]</td>
                                    <td><span class="badge bg-secondary">[[mcp-server:admin.not-implemented]]</span></td>
                                </tr>
                                <tr>
                                    <td>[[mcp-server:admin.sse]]</td>
                                    <td><span class="badge bg-secondary">[[mcp-server:admin.not-implemented]]</span></td>
                                </tr>
                                <tr>
                                    <td>[[mcp-server:admin.json-rpc]]</td>
                                    <td><span class="badge bg-secondary">[[mcp-server:admin.not-implemented]]</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Configuration -->
            <div class="card">
                <div class="card-header">
                    <h5 class="card-title mb-0">[[mcp-server:admin.configuration]]</h5>
                </div>
                <div class="card-body">
                    <p class="text-muted">
                        [[mcp-server:admin.configuration-note]]
                    </p>
                </div>
            </div>
        </div>

        <!-- Sidebar -->
        <div class="col-12 col-md-4 px-0">
            <div class="sticky-top" style="top: 5rem;">
                <div class="card">
                    <div class="card-header">
                        <h5 class="card-title mb-0">[[mcp-server:admin.information]]</h5>
                    </div>
                    <div class="card-body">
                        <p>
                            [[mcp-server:admin.description]]
                        </p>
                        <p>
                            [[mcp-server:admin.current-features]]
                        </p>
                        <hr>
                        <dl>
                            <dt>[[mcp-server:admin.documentation]]</dt>
                            <dd><a href="https://github.com/goofmint/caiz/tree/main/docs/mcp-server" target="_blank" rel="noopener noreferrer">[[mcp-server:admin.github-documentation]]</a></dd>
                            
                            <dt>[[mcp-server:admin.api-endpoints]]</dt>
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