<div class="acp-page-container">
  <div class="row">
    <div class="col-lg-9">
      <div class="panel panel-default">
        <div class="panel-heading">
          <i class="fa fa-search"></i> [[caiz-elastic:admin.title]]
        </div>
        <div class="panel-body">
          <form id="caiz-elastic-form">
            <div class="form-group">
              <label for="elastic-node">[[caiz-elastic:admin.node]]</label>
              <input type="text" id="elastic-node" name="elastic-node" class="form-control" placeholder="http://elasticsearch:9200" />
            </div>
            <div class="form-group">
              <label for="elastic-index">[[caiz-elastic:admin.index]]</label>
              <input type="text" id="elastic-index" name="elastic-index" class="form-control" placeholder="caiz-search" />
            </div>
            <button type="submit" class="btn btn-primary">[[caiz-elastic:admin.save]]</button>
            <span id="caiz-elastic-status" class="help-block text-muted"></span>
          </form>
        </div>
      </div>
    </div>
  </div>
</div>

