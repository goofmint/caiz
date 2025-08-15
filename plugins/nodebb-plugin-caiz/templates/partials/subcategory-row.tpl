<tr data-cid="{cid}" draggable="true" class="category-row">
  <td>
    <i class="fa fa-grip-vertical text-muted category-drag-handle" style="cursor: move;"></i>
  </td>
  <td>
    <div class="d-flex align-items-center gap-2">
      {{{ if icon }}}
      <i class="fa {icon}" style="color: {color}; background-color: {bgColor};"></i>
      {{{ end }}}
      <strong>{name}</strong>
    </div>
  </td>
  <td>
    <small class="text-muted">{{{ if description }}}{description}{{{ else }}}-{{{ end }}}</small>
  </td>
  <td class="text-center">
    <span class="badge bg-secondary">{topiccount}</span>
  </td>
  <td class="text-center">
    <span class="badge bg-info">{postcount}</span>
  </td>
  <td class="text-end">
    <div class="btn-group btn-group-sm">
      <button type="button" class="btn btn-outline-primary" onclick="editCategory({cid})" title="Edit">
        <i class="fa fa-edit"></i>
      </button>
      <button type="button" class="btn btn-outline-danger" onclick="deleteCategory({cid}, '{name}')" title="Delete">
        <i class="fa fa-trash"></i>
      </button>
    </div>
  </td>
</tr>