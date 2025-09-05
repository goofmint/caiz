<!-- BEGIN accounts -->
<div class="x-account-item" data-account-id="{accounts.accountId}">
  <div class="row">
    <div class="col-xs-8">
      <strong>@{accounts.screenName}</strong>
      <!-- IF accounts.selected -->
      <span class="label label-success">Active</span>
      <!-- ENDIF accounts.selected -->
    </div>
    <div class="col-xs-4 text-right">
      <button class="btn btn-xs btn-danger btn-disconnect-x" data-account-id="{accounts.accountId}">
        <i class="fa fa-times"></i> Disconnect
      </button>
    </div>
  </div>
</div>
<!-- END accounts -->

<!-- IF !accounts.length -->
<p class="text-muted">[[caiz:x-not-connected]]</p>
<!-- ENDIF !accounts.length -->

<!-- IF accounts.length -->
<div class="form-group" style="margin-top: 15px;">
  <label>Active Account</label>
  <select class="form-control x-account-select">
    <option value="">Select account</option>
    <!-- BEGIN accounts -->
    <option value="{accounts.accountId}" <!-- IF accounts.selected -->selected<!-- ENDIF accounts.selected -->>
      @{accounts.screenName}
    </option>
    <!-- END accounts -->
  </select>
</div>
<!-- ENDIF accounts.length -->