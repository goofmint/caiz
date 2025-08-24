<!DOCTYPE html>
<html>
<head>
    <title>[[mcp-server:oauth.title]] - NodeBB MCP Server</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="{relative_path}/assets/client.css">
</head>
<body>
    <div class="container" style="margin-top: 50px;">
        <div class="row">
            <div class="col-md-6 col-md-offset-3">
                <div class="panel panel-default">
                    <div class="panel-heading">
                        <h3 class="panel-title">
                            <i class="fa fa-server"></i>
                            [[mcp-server:oauth.title]]
                        </h3>
                    </div>
                    <div class="panel-body">
                        <div class="alert alert-info">
                            <p>[[mcp-server:oauth.client_request]] <strong>{clientName}</strong></p>
                        </div>
                        
                        <h4>[[mcp-server:oauth.requested_permissions]]</h4>
                        <ul class="list-group" style="margin-bottom: 20px;">
                            <!-- BEGIN scopes -->
                            <li class="list-group-item">
                                <i class="fa fa-check text-success"></i>
                                [[mcp-server:scope.{scopes.scope}]]
                            </li>
                            <!-- END scopes -->
                        </ul>
                        
                        <div class="alert alert-warning">
                            <small>[[mcp-server:oauth.security_notice]]</small>
                        </div>
                        
                        <form method="POST" action="/oauth/authorize">
                            <!-- 隠しフィールド（元のパラメータ） -->
                            <input type="hidden" name="response_type" value="{response_type}">
                            <input type="hidden" name="client_id" value="{client_id}">
                            <input type="hidden" name="redirect_uri" value="{redirect_uri}">
                            <input type="hidden" name="scope" value="{scope}">
                            <input type="hidden" name="code_challenge" value="{code_challenge}">
                            <input type="hidden" name="code_challenge_method" value="{code_challenge_method}">
                            <input type="hidden" name="state" value="{state}">
                            <input type="hidden" name="resource" value="{resource}">
                            
                            <div class="form-group text-center">
                                <button type="submit" name="action" value="approve" class="btn btn-primary btn-lg">
                                    <i class="fa fa-check"></i>
                                    [[mcp-server:oauth.approve]]
                                </button>
                                <button type="submit" name="action" value="deny" class="btn btn-default btn-lg" style="margin-left: 10px;">
                                    <i class="fa fa-times"></i>
                                    [[mcp-server:oauth.deny]]
                                </button>
                            </div>
                        </form>
                        
                        <hr>
                        <div class="text-center">
                            <small class="text-muted">
                                [[mcp-server:oauth.logged_in_as]] <strong>{user.username}</strong>
                                | <a href="/logout">[[mcp-server:oauth.logout]]</a>
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>