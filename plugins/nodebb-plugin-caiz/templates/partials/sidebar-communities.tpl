{{{ if user.uid }}}
<nav component="sidebar-communities"
  class="open text-dark bg-light community-sidebar sidebar-left start-0 border-end vh-100 d-none d-lg-flex flex-column justify-content-between sticky-top">
  <ul id="category-nav" class="list-unstyled d-flex flex-column w-100 gap-2 mt-2 overflow-y-auto">
  </ul>

  <div class="sidebar-toggle-container align-self-start">
    <div class="community-toggle m-2 d-none d-lg-block">
      <a href="#" role="button" component="community/toggle"
        class="nav-link d-flex gap-2 align-items-center p-2 pointer w-100 text-nowrap"
        aria-label="[[themes/harmony:sidebar-toggle]]" data-bs-original-title="[[themes/harmony:sidebar-toggle]]">
        <i class="fa fa-fw fa-angles-right"></i>
        <i class="fa fa-fw fa-angles-left"></i>
        <span class="nav-text visible-open fw-semibold small lh-1">[[themes/harmony:collapse]]</span>
      </a>
    </div>
  </div>
</nav>
{{{ end }}}