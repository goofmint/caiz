<a class="nav-link position-relative btn-ghost d-flex gap-2 justify-content-start align-items-center" href="#" data-bs-toggle="dropdown" id="api-tokens-menu" aria-haspopup="true" aria-expanded="false" role="button">
	<span class="position-relative">
		<i component="sidebar/api-tokens/icon" class="fa fa-fw fa-key"></i>
		<span component="sidebar/api-tokens/badge" class="visible-closed position-absolute top-0 start-100 translate-middle badge rounded-1 bg-primary d-none"></span>
	</span>
	<span class="nav-text small visible-open text-truncate text-start fw-semibold">[[caiz:api-tokens]]</span>
</a>
<ul class="dropdown-menu dropdown-menu-end p-1" aria-labelledby="api-tokens-menu">
	<li>
		<h6 class="dropdown-header">[[caiz:api-tokens-management]]</h6>
	</li>
	<li>
		<a component="sidebar/api-tokens/list" href="#" class="dropdown-item rounded-1 d-flex gap-3 align-items-center" data-ajaxify="false">
			<div class="flex-grow-1">[[caiz:view-api-tokens]]</div>
		</a>
	</li>
	<li>
		<a component="sidebar/api-tokens/create" href="#" class="dropdown-item rounded-1 d-flex gap-3 align-items-center" data-ajaxify="false">
			<div class="flex-grow-1">[[caiz:create-api-token]]</div>
		</a>
	</li>
	<li><hr class="dropdown-divider"></li>
	<li>
		<a component="sidebar/api-tokens/docs" href="#" class="dropdown-item rounded-1 d-flex gap-3 align-items-center" data-ajaxify="false">
			<div class="flex-grow-1">[[caiz:api-documentation]]</div>
			<i class="fa fa-fw fa-external-link text-muted"></i>
		</a>
	</li>
</ul>