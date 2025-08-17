<div class="acp-page-container">
  <div class="row">
    <div class="col-lg-9">
      <div class="panel panel-default">
        <div class="panel-heading">[[caiz:admin.oauth-settings]]</div>
        <div class="panel-body">
          <ul class="nav nav-tabs" role="tablist">
            <li role="presentation" class="active">
              <a href="#slack-settings" data-toggle="tab">Slack</a>
            </li>
            <li role="presentation">
              <a href="#discord-settings" data-toggle="tab">Discord</a>
            </li>
          </ul>
          
          <div class="tab-content">
            <!-- Slack Settings Tab -->
            <div role="tabpanel" class="tab-pane active" id="slack-settings">
              <form id="slack-oauth-form">
                <div class="form-group">
                  <label for="slack-client-id">[[caiz:admin.client-id]]</label>
                  <input type="text" id="slack-client-id" name="slack-client-id" class="form-control" />
                </div>
                <div class="form-group">
                  <label for="slack-client-secret">[[caiz:admin.client-secret]]</label>
                  <input type="password" id="slack-client-secret" name="slack-client-secret" class="form-control" placeholder="[[caiz:admin.enter-to-change]]" />
                  <p class="help-block">[[caiz:admin.only-enter-to-change]]</p>
                </div>
                <div class="form-group">
                  <label for="slack-signing-secret">[[caiz:admin.signing-secret]]</label>
                  <input type="password" id="slack-signing-secret" name="slack-signing-secret" class="form-control" placeholder="[[caiz:admin.enter-to-change]]" />
                </div>
                <div class="form-group">
                  <label>[[caiz:admin.redirect-url]]</label>
                  <input type="text" class="form-control" readonly value="{config.url}/api/v3/plugins/caiz/oauth/slack/callback" />
                  <p class="help-block">[[caiz:admin.add-url-to-slack]]</p>
                </div>
                <button type="submit" class="btn btn-primary">[[caiz:admin.save]]</button>
                <button type="button" class="btn btn-default" id="test-slack">[[caiz:admin.test-connection]]</button>
              </form>
            </div>
            
            <!-- Discord Settings Tab -->
            <div role="tabpanel" class="tab-pane" id="discord-settings">
              <form id="discord-oauth-form">
                <div class="form-group">
                  <label for="discord-client-id">[[caiz:admin.client-id]]</label>
                  <input type="text" id="discord-client-id" name="discord-client-id" class="form-control" />
                </div>
                <div class="form-group">
                  <label for="discord-client-secret">[[caiz:admin.client-secret]]</label>
                  <input type="password" id="discord-client-secret" name="discord-client-secret" class="form-control" placeholder="[[caiz:admin.enter-to-change]]" />
                  <p class="help-block">[[caiz:admin.only-enter-to-change]]</p>
                </div>
                <div class="form-group">
                  <label for="discord-bot-token">[[caiz:admin.bot-token]]</label>
                  <input type="password" id="discord-bot-token" name="discord-bot-token" class="form-control" placeholder="[[caiz:admin.enter-to-change]]" />
                </div>
                <div class="form-group">
                  <label>[[caiz:admin.redirect-url]]</label>
                  <input type="text" class="form-control" readonly value="{config.url}/api/v3/plugins/caiz/oauth/discord/callback" />
                  <p class="help-block">[[caiz:admin.add-url-to-discord]]</p>
                </div>
                <button type="submit" class="btn btn-primary">[[caiz:admin.save]]</button>
                <button type="button" class="btn btn-default" id="test-discord">[[caiz:admin.test-connection]]</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="col-lg-3">
      <div class="panel panel-default">
        <div class="panel-heading">[[caiz:admin.setup-guide]]</div>
        <div class="panel-body">
          <h5>[[caiz:admin.slack-app-setup]]</h5>
          <ol>
            <li><a href="https://api.slack.com/apps" target="_blank">Slack API</a> [[caiz:admin.access]]</li>
            <li>[[caiz:admin.click-create-app]]</li>
            <li>[[caiz:admin.add-oauth-scopes]]</li>
            <li>[[caiz:admin.set-redirect-url]]</li>
          </ol>
          
          <h5>[[caiz:admin.discord-bot-setup]]</h5>
          <ol>
            <li><a href="https://discord.com/developers/applications" target="_blank">Discord Developer Portal</a> [[caiz:admin.access]]</li>
            <li>[[caiz:admin.click-new-application]]</li>
            <li>[[caiz:admin.get-bot-token]]</li>
            <li>[[caiz:admin.set-oauth2-redirect]]</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</div>