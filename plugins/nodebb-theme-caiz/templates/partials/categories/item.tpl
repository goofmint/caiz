<div component="categories/category" data-cid="{./cid}" class="w-100 p-3 h-100 d-flex flex-column category-{./cid} {./unread-class}">
	<meta itemprop="name" content="{./name}">

	<div class="d-flex flex-grow-1 gap-2 gap-lg-3">
		<div class="flex-shrink-0">
		{buildCategoryIcon(@value, "40px", "rounded-1")}
		</div>
		<div class="flex-grow-1 d-flex flex-wrap gap-1 me-0 me-lg-2">
			<h2 class="title text-break fs-4 fw-semibold m-0 tracking-tight w-100">
				<!-- IMPORT partials/categories/link.tpl -->
			</h2>
			{{{ if ./description }}}
			<div class="description text-muted text-sm w-100">
				{./description}
			</div>
			{{{ end }}}
			{{{ if !./link }}}
			<div class="d-flex gap-1 d-block d-lg-none w-100">
				<span class="badge text-body border stats text-xs text-muted">
					<i class="fa fa-fw fa-list"></i>
					<span class="fw-normal">{humanReadableNumber(./totalTopicCount, 0)}</span>
				</span>
				<span class="badge text-body border stats text-xs text-muted">
					<i class="fa-regular fa-fw fa-message"></i>
					<span class="fw-normal">{humanReadableNumber(./totalPostCount, 0)}</span>
				</span>
				{{{ if ./teaser }}}
				<a href="{config.relative_path}{./teaser.url}" class="border badge bg-transparent text-muted fw-normal timeago {{{ if (!./teaser.timestampISO || config.theme.mobileTopicTeasers) }}}hidden{{{ end }}}" title="{./teaser.timestampISO}"></a>
				{{{ end }}}
			</div>
			{{{ end }}}
			{{{ if !config.hideSubCategories }}}
			{{{ if ./children.length }}}
			<ul class="list-unstyled category-children row row-cols-1 row-cols-md-2 g-2 my-1 w-100">
				{{{ each ./children }}}
				{{{ if !./isSection }}}
				<li data-cid="{./cid}" class="category-children-item small">
					<div class="d-flex gap-1">
						<i class="fa fa-fw fa-caret-right text-primary" style="line-height: var(--bs-body-line-height);"></i>
						<a href="{{{ if ./link }}}{./link}{{{ else }}}{config.relative_path}/category/{./slug}{{{ end }}}" class="text-reset fw-semibold">{./name}</a>
					</div>
				</li>
				{{{ end }}}
				{{{ end }}}
			</ul>
			{{{ end }}}
			{{{ end }}}
		</div>
	</div>
	{{{ if !./link }}}
	<div class="mt-auto pt-2">
		<div class="d-flex justify-content-between align-items-center text-muted small">
			<div class="d-flex gap-3">
				<span>
					<i class="fa fa-fw fa-list"></i>
					{humanReadableNumber(./totalTopicCount, 0)} [[global:topics]]
				</span>
				<span>
					<i class="fa-regular fa-fw fa-message"></i>
					{humanReadableNumber(./totalPostCount, 0)} [[global:posts]]
				</span>
			</div>
			{{{ if !config.hideCategoryLastPost }}}
			{{{ if ./teaser }}}
			<span class="timeago text-xs" title="{./teaser.timestampISO}"></span>
			{{{ end }}}
			{{{ end }}}
		</div>
	</div>
	{{{ end }}}
</div>
