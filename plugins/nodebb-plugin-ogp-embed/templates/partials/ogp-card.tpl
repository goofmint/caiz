<div class="ogp-card" data-url="{url}">
    <!-- IF image -->
    <div class="ogp-card-image">
        <img src="{image}" alt="{title}" loading="lazy" onerror="this.parentElement.style.display='none'">
    </div>
    <!-- ENDIF image -->
    <div class="ogp-card-content">
        <div class="ogp-card-title">
            <a href="{url}" target="_blank" rel="noopener noreferrer">
                {title}
            </a>
        </div>
        <!-- IF description -->
        <div class="ogp-card-description">
            {description}
        </div>
        <!-- ENDIF description -->
        <div class="ogp-card-domain">
            <!-- IF favicon -->
            <img src="{favicon}" alt="" class="ogp-card-favicon" onerror="this.style.display='none'">
            <!-- ENDIF favicon -->
            <span>{domain}</span>
        </div>
    </div>
</div>