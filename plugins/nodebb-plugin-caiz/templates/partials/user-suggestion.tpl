<a class="dropdown-item d-flex align-items-center" href="#" data-username="{username}">
  {{{ if picture }}}
  <img src="{picture}" 
       alt="{username}" 
       class="avatar-sm me-2" 
       style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;"
       onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
  <div class="avatar-sm me-2 d-flex align-items-center justify-content-center bg-primary text-white" 
       style="width: 24px; height: 24px; border-radius: 50%; font-size: 10px; display: none;">
    {firstLetter}
  </div>
  {{{ else }}}
  <div class="avatar-sm me-2 d-flex align-items-center justify-content-center bg-primary text-white" 
       style="width: 24px; height: 24px; border-radius: 50%; font-size: 10px;">
    {firstLetter}
  </div>
  {{{ end }}}
  <div>
    <div class="fw-medium">{displayname}</div>
    <small class="text-muted">@{username}</small>
  </div>
</a>