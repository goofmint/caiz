<div class="acp-page-container">
  <div class="row">
    <div class="col-lg-9">
      <div class="panel panel-default">
        <div class="panel-heading">
          <i class="fa fa-language"></i> [[caiz:admin.i18n.title]]
        </div>
        <div class="panel-body">
          <form id="caiz-i18n-form">
            <div class="form-group">
              <label for="gemini-api-key">[[caiz:admin.i18n.gemini-api-key]]</label>
              <input type="password" id="gemini-api-key" name="gemini-api-key" class="form-control" placeholder="[[caiz:admin.enter-to-change]]" />
              <p class="help-block" id="gemini-key-status"></p>
            </div>
            <button type="submit" class="btn btn-primary">[[caiz:admin.save]]</button>
          </form>
        </div>
      </div>

      <!-- Communities re-translate panel -->
      <div class="panel panel-default">
        <div class="panel-heading">
          <i class="fa fa-globe"></i> [[caiz:admin.i18n.retranslate-title]]
        </div>
        <div class="panel-body">
          <div class="mb-2 d-flex gap-2">
            <button class="btn btn-default" id="caiz-i18n-refresh">[[caiz:admin.i18n.refresh-list]]</button>
            <button class="btn btn-default" id="caiz-i18n-select-all">[[caiz:admin.i18n.select-all]]</button>
            <button class="btn btn-primary" id="caiz-i18n-retranslate">[[caiz:admin.i18n.retranslate-selected]]</button>
            <span id="caiz-i18n-loading" class="text-muted" style="display:none">[[caiz:admin.i18n.loading]]</span>
          </div>
          <div class="table-responsive">
            <table class="table table-striped" id="caiz-i18n-table">
              <thead>
                <tr>
                  <th style="width: 40px"><input type="checkbox" id="caiz-i18n-check-all"></th>
                  <th>[[caiz:admin.i18n.cid]]</th>
                  <th>[[caiz:admin.i18n.name]]</th>
                  <th>[[caiz:admin.i18n.handle]]</th>
                  <th>[[caiz:admin.i18n.status]]</th>
                </tr>
              </thead>
              <tbody id="caiz-i18n-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
