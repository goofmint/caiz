<tr data-uid="{uid}" class="member-row">
  <td>
    <div class="d-flex align-items-center gap-2">
      {{{ if picture }}}
      <img src="{picture}" alt="{username}" class="rounded-circle" style="width: 32px; height: 32px;">
      {{{ else }}}
      <div class="rounded-circle bg-secondary d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; color: white; font-size: 14px;">{firstLetter}</div>
      {{{ end }}}
      <div>
        <strong>{username}</strong>
        <br>
        <small class="text-muted">@{userslug}</small>
      </div>
    </div>
  </td>
  <td>
    <span class="badge {roleClass}">{roleDisplayName}</span>
  </td>
  <td>
    <small class="text-muted">{joindate}</small>
  </td>
  <td>
    <small class="text-muted">{lastonline}</small>
  </td>
  <td class="text-end">
    {{{ if canManage }}}
    <div class="btn-group btn-group-sm">
      <select class="form-select form-select-sm member-role-select" data-uid="{uid}" style="width: auto;">
        <option value="">{changeRoleText}</option>
        {{{ each roleOptions }}}
        <option value="{./value}">{./text}</option>
        {{{ end }}}
      </select>
      <button type="button" class="btn btn-outline-danger btn-sm member-remove-btn" data-uid="{uid}" data-username="{username}" title="{removeText}">
        <i class="fa fa-trash"></i>
      </button>
    </div>
    {{{ else }}}
    -
    {{{ end }}}
  </td>
</tr>