<!DOCTYPE html>
<html>
<head>
    <title>{title}</title>
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
                            認証の確認
                        </h3>
                    </div>
                    <div class="panel-body">
                        <div class="alert alert-info">
                            <p>以下のアプリケーションが権限を要求しています: <strong>{clientName}</strong></p>
                        </div>
                        
                        <h4>要求されている権限:</h4>
                        <ul class="list-group" style="margin-bottom: 20px;">
                            <!-- BEGIN scopes -->
                            <li class="list-group-item">
                                <i class="fa fa-check text-success"></i>
                                {scopes.description}
                            </li>
                            <!-- END scopes -->
                        </ul>
                        
                        <div class="alert alert-warning">
                            <small>承認すると、このアプリケーションはあなたのアカウントに代わって指定された操作を実行できるようになります。</small>
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
                                    承認
                                </button>
                                <button type="submit" name="action" value="deny" class="btn btn-default btn-lg" style="margin-left: 10px;">
                                    <i class="fa fa-times"></i>
                                    拒否
                                </button>
                            </div>
                        </form>
                        
                        <hr>
                        <div class="text-center">
                            <small class="text-muted">
                                ログイン中: <strong>{user.username}</strong>
                                | <a href="/logout">ログアウト</a>
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>