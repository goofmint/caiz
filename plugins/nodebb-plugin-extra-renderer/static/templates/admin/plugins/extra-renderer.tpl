<form role="form" class="extra-renderer-settings">
  <div class="row">
    <div class="col-sm-2 col-xs-12 settings-header">PlantUML Settings</div>
    <div class="col-sm-10 col-xs-12">
      <div class="form-group">
        <label for="krokiEndpoint">Kroki Endpoint URL</label>
        <input type="text" id="krokiEndpoint" name="krokiEndpoint" title="Kroki Endpoint" class="form-control" placeholder="https://kroki.io/plantuml/svg">
        <p class="help-block">
          Specify the Kroki service endpoint for PlantUML rendering. 
          Default: https://kroki.io/plantuml/svg
        </p>
      </div>
    </div>
  </div>
</form>

<button id="save" class="floating-button mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored">
  <i class="material-icons">save</i>
</button>