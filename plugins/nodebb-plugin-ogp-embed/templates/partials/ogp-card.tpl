<div class="card mb-3 ogp-embed-card border-start border-3" style="border-left-color: #4a9fd5 !important;" data-ogp-url="{url}">
    <div class="card-body p-3">
        <a href="#" class="btn btn-sm btn-outline-secondary ogp-refetch-btn" data-action="ogp-refetch" title="[[ogp-embed:ogp-refetch]]">
            <i class="fa fa-refresh"></i>
        </a>
        <div class="d-flex">
            <div class="flex-grow-1">
                <div class="d-flex align-items-center mb-2">
                    <!-- IF favicon -->
                    <img src="{favicon}" alt="" width="16" height="16" class="me-2"
                      style="width: 16px; height: 16px; padding: 0; border: none;">
                    <!-- ENDIF favicon -->
                    <small class="text-muted">{domain}</small>
                </div>
                
                <h6 class="mb-2">
                    <a href="{url}" target="_blank" rel="noopener noreferrer" class="text-decoration-none text-primary me-2">
                        {title}
                    </a>
                </h6>
                
                <!-- IF description -->
                <p class="card-text text-muted small mb-0">{description}</p>
                <!-- ENDIF description -->
            </div>
            
            <!-- IF image -->
            <div class="ms-3" style="flex-shrink: 0;">
                <img src="{image}" alt="{title}" loading="lazy" class="rounded"
                  style="width: 80px; height: 80px; object-fit: cover; padding: 0px; border: none">
            </div>
            <!-- ENDIF image -->
        </div>
    </div>
</div>
