<!DOCTYPE html>
<html lang="{{{ if seoLang }}}{seoLang}{{{ else }}}{function.localeToHTML, userLang, defaultLang}{{{ end }}}" {{{if languageDirection}}}data-dir="{languageDirection}" style="direction: {languageDirection};"{{{end}}}>
<head>
	<title>{browserTitle}</title>
	{{{each metaTags}}}{function.buildMetaTag}{{{end}}}
	<link rel="stylesheet" type="text/css" href="{relative_path}/assets/client{{{if bootswatchSkin}}}-{bootswatchSkin}{{{end}}}{{{ if (languageDirection=="rtl") }}}-rtl{{{ end }}}.css?{config.cache-buster}" />
	{{{each linkTags}}}{function.buildLinkTag}{{{end}}}
	
	<!-- SEO: Hreflang links for multi-language support -->
	{{{ if hreflangs }}}
	{{{ each hreflangs }}}
	<link rel="alternate" hreflang="{./lang}" href="{./url}" />
	{{{ end }}}
	{{{ end }}}

	<script>
		var config = JSON.parse('{{configJSON}}');
		var app = {
			user: JSON.parse('{{userJSON}}')
		};
		
		// Auto-translate language detection
		(function() {
			var urlParams = new URLSearchParams(window.location.search);
			var locale = urlParams.get('locale') || urlParams.get('lang');
			if (locale) {
				var supportedLangs = ["en","zh-CN","hi","es","ar","fr","bn","ru","pt","ur","id","de","ja","fil","tr","ko","fa","sw","ha","it"];
				if (supportedLangs.includes(locale)) {
					document.documentElement.setAttribute('lang', locale);
				}
			}
		})();
		
		document.documentElement.style.setProperty('--panel-offset', `0px`);
	</script>

	{{{if useCustomHTML}}}
	{{customHTML}}
	{{{end}}}
	{{{if useCustomCSS}}}
	<style>{{customCSS}}</style>
	{{{end}}}
</head>

<body class="{bodyClass} skin-{{{if bootswatchSkin}}}{bootswatchSkin}{{{else}}}noskin{{{end}}}">
	<a class="visually-hidden-focusable position-absolute top-0 start-0 p-3 m-3 bg-body" style="z-index: 1021;" href="#content">[[global:skip-to-content]]</a>

	{{{ if config.theme.topMobilebar }}}
	<!-- IMPORT partials/mobile-header.tpl -->
	{{{ end }}}

	<div class="layout-container d-flex justify-content-between pb-4 pb-md-0">
		<!-- IMPORT partials/sidebar-left.tpl -->
		<!-- IMPORT partials/sidebar-communities.tpl -->
		<main id="panel" class="d-flex flex-column gap-3 flex-grow-1 mt-3" style="min-width: 0;">
			<!-- IMPORT partials/header/brand.tpl -->
			<div class="container-lg px-md-4 d-flex flex-column gap-3 h-100 mb-5 mb-lg-0" id="content">
			<!-- IMPORT partials/noscript/warning.tpl -->
			<!-- IMPORT partials/noscript/message.tpl -->
