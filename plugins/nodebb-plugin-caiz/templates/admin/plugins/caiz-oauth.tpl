<div class="acp-page-container">
  <div class="row">
    <div class="col-lg-9">
      <!-- Slack Settings -->
      <div class="panel panel-default">
        <div class="panel-heading">
          <i class="fab fa-slack"></i> Slack [[caiz:admin.oauth-settings]]
        </div>
        <div class="panel-body">
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
              <div class="input-group">
                <input type="text" class="form-control" id="slack-redirect-url" readonly />
                <span class="input-group-btn">
                  <button class="btn btn-default" type="button" onclick="copyToClipboard('slack-redirect-url')">
                    <i class="fa fa-copy"></i>
                  </button>
                </span>
              </div>
              <p class="help-block">[[caiz:admin.add-url-to-slack]]</p>
            </div>
            <button type="submit" class="btn btn-primary">[[caiz:admin.save]]</button>
            <button type="button" class="btn btn-default" id="test-slack">[[caiz:admin.test-connection]]</button>
          </form>
        </div>
      </div>
      
      <!-- Discord Settings -->
      <div class="panel panel-default">
        <div class="panel-heading">
          <i class="fab fa-discord"></i> Discord [[caiz:admin.oauth-settings]]
        </div>
        <div class="panel-body">
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
              <div class="input-group">
                <input type="text" class="form-control" id="discord-redirect-url" readonly />
                <span class="input-group-btn">
                  <button class="btn btn-default" type="button" onclick="copyToClipboard('discord-redirect-url')">
                    <i class="fa fa-copy"></i>
                  </button>
                </span>
              </div>
              <p class="help-block">[[caiz:admin.add-url-to-discord]]</p>
            </div>
            <button type="submit" class="btn btn-primary">[[caiz:admin.save]]</button>
            <button type="button" class="btn btn-default" id="test-discord">[[caiz:admin.test-connection]]</button>
          </form>
        </div>
      </div>
      
      <!-- X Settings -->
      <div class="panel panel-default">
        <div class="panel-heading">
          <i class="fab fa-x-twitter"></i> X (Twitter) [[caiz:admin.oauth-settings]]
        </div>
        <div class="panel-body">
          <form id="x-oauth-form">
            <div class="form-group">
              <label for="x-client-key">[[caiz:admin.client-key]]</label>
              <input type="text" id="x-client-key" name="x-client-key" class="form-control" />
            </div>
            <div class="form-group">
              <label for="x-client-secret">[[caiz:admin.client-secret]]</label>
              <input type="password" id="x-client-secret" name="x-client-secret" class="form-control" placeholder="[[caiz:admin.enter-to-change]]" />
              <p class="help-block">[[caiz:admin.only-enter-to-change]]</p>
            </div>
            <div class="form-group">
              <label>[[caiz:admin.redirect-url]]</label>
              <div class="input-group">
                <input type="text" class="form-control" id="x-redirect-url" readonly />
                <span class="input-group-btn">
                  <button class="btn btn-default" type="button" onclick="copyToClipboard('x-redirect-url')">
                    <i class="fa fa-copy"></i>
                  </button>
                </span>
              </div>
              <p class="help-block">[[caiz:admin.add-url-to-x]]</p>
            </div>
            <button type="submit" class="btn btn-primary">[[caiz:admin.save]]</button>
          </form>
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
          
          <h5>[[caiz:admin.x-app-setup]]</h5>
          <ol>
            <li><a href="https://developer.twitter.com/en/portal/dashboard" target="_blank">X Developer Portal</a> [[caiz:admin.access]]</li>
            <li>[[caiz:admin.create-app-x]]</li>
            <li>[[caiz:admin.enable-oauth2-x]]</li>
            <li>[[caiz:admin.set-redirect-url-x]]</li>
            <li>[[caiz:admin.save-keys-x]]</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
function copyToClipboard(elementId) {
    var copyText = document.getElementById(elementId);
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    document.execCommand("copy");
    
    require(['alerts'], function(alerts) {
        alerts.success('Copied to clipboard!');
    });
}

// Set redirect URLs with server-rendered values
$(document).ready(function() {
    $('#slack-redirect-url').val('{slackRedirectUrl}');
    $('#discord-redirect-url').val('{discordRedirectUrl}');
    $('#x-redirect-url').val('{xRedirectUrl}');
});
</script>