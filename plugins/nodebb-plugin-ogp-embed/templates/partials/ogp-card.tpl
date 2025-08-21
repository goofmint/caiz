<div class="card mb-3 ogp-embed-card border-start border-3" style="border-left-color: #4a9fd5 !important;">
    <div class="card-body p-3">
        <div class="d-flex">
            <div class="flex-grow-1">
                <!-- Domain info at top -->
                <div class="d-flex align-items-center mb-2">
                    <!-- IF favicon -->
                    <img src="{favicon}" alt="" width="16" height="16" class="me-2" onerror="this.style.display='none'"
                      style="width: 16px; height: 16px; padding: 0; border: none;"
                    >
                    <!-- ENDIF favicon -->
                    <small class="text-muted">{domain}</small>
                </div>
                
                <!-- Title -->
                <h6 class="mb-2">
                    <a href="{url}" target="_blank" rel="noopener noreferrer" class="text-decoration-none text-primary">
                        {title}
                    </a>
                </h6>
                
                <!-- Description -->
                <!-- IF description -->
                <p class="card-text text-muted small mb-0">{description}</p>
                <!-- ENDIF description -->
            </div>
            
            <!-- Image on the right if available -->
            <!-- IF image -->
            <div class="ms-3" style="flex-shrink: 0;">
                <img src="{image}" alt="{title}" loading="lazy" class="rounded"
                  style="width: 80px; height: 80px; object-fit: cover; padding: 0px; border: none"
                onerror="this.style.display='none'">
            </div>
            <!-- ENDIF image -->
        </div>
    </div>
</div>