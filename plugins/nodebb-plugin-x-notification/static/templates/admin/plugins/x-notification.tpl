<form role="form" class="x-notification-settings">
  <div class="row">
    <div class="col-sm-2 col-xs-12 settings-header">[[x-notification:admin.settings]]</div>
    <div class="col-sm-10 col-xs-12">
      <p class="lead">[[x-notification:admin.description]]</p>
      
      <div class="form-group">
        <label for="clientKey">[[x-notification:admin.client-key]]</label>
        <input type="text" id="clientKey" name="clientKey" title="X API Client Key" class="form-control" placeholder="[[x-notification:admin.client-key-placeholder]]" value="{clientKey}">
        <p class="help-block">[[x-notification:admin.client-key-help]]</p>
      </div>
      
      <div class="form-group">
        <label for="clientSecret">[[x-notification:admin.client-secret]]</label>
        <input type="password" id="clientSecret" name="clientSecret" title="X API Client Secret" class="form-control" placeholder="[[x-notification:admin.client-secret-placeholder]]" value="{clientSecret}">
        <p class="help-block">[[x-notification:admin.client-secret-help]]</p>
      </div>
      
      <div class="form-group">
        <label for="callbackUrl">[[x-notification:admin.callback-url]]</label>
        <input type="text" id="callbackUrl" title="OAuth Callback URL" class="form-control" value="{callbackUrl}" readonly>
        <p class="help-block">[[x-notification:admin.callback-url-help]]</p>
      </div>
    </div>
  </div>
</form>

<button id="save" class="floating-button mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored">
  <i class="material-icons">save</i>
</button>