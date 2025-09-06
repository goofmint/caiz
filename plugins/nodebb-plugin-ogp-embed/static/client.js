'use strict';

/* globals $, app, socket */

$(document).ready(function() {
    
    let isProcessing = false;
    
    /**
     * Process OGP placeholders and fetch data
     */
    function processOGPPlaceholders() {
        if (isProcessing) return;
        isProcessing = true;
        
        const $placeholders = $('.ogp-card-placeholder[data-ogp-url]:not(.processing)');
        if ($placeholders.length === 0) {
            isProcessing = false;
            return;
        }
        
        $placeholders.each(function() {
            const $placeholder = $(this);
            const url = $placeholder.attr('data-ogp-url');
            
            $placeholder.addClass('processing');
            
            socket.emit('plugins.ogp-embed.fetch', { url: url }, function(err, data) {
                if (err || !data || !data.url) {
                    $placeholder.replaceWith(
                        '<div class="ogp-card-fallback">' +
                        '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(url) + '</a>' +
                        '</div>'
                    );
                } else {
                    const cardHtml = buildOGPCard(data);
                    const $card = $(cardHtml);
                    $placeholder.replaceWith($card);
                    require(['translator'], function(translator) {
                        translator.translate($card.get(0));
                    });
                }
            });
        });
        
        isProcessing = false;
    }
    
    /**
     * Build OGP card HTML from data (matching server-side template)
     */
    function buildOGPCard(data) {
        let html = '<div class="card mb-3 ogp-embed-card border-start border-3" style="border-left-color: #4a9fd5 !important;" data-ogp-url="' + escapeHtml(data.url) + '">';
        html += '<div class="card-body p-3">';
        html += '<a href="#" class="btn btn-sm btn-outline-secondary ogp-refetch-btn" data-action="ogp-refetch" title="[[ogp-embed:ogp-refetch]]">';
        html += '<i class="fa fa-refresh"></i>';
        html += '</a>';
        html += '<div class="d-flex">';
        html += '<div class="flex-grow-1">';
        
        // Favicon and domain
        html += '<div class="d-flex align-items-center mb-2">';
        if (data.favicon) {
            html += '<img src="' + escapeHtml(data.favicon) + '" alt="" width="16" height="16" class="me-2" style="width: 16px; height: 16px; padding: 0; border: none;">';
        }
        html += '<small class="text-muted">' + escapeHtml(data.domain || '') + '</small>';
        html += '</div>';
        
        // Title
        html += '<h6 class="mb-2">';
        html += '<a href="' + escapeHtml(data.url) + '" target="_blank" rel="noopener noreferrer" class="text-decoration-none text-primary me-2">';
        html += escapeHtml(data.title || 'No title');
        html += '</a>';
        html += '</h6>';
        
        // Description
        if (data.description) {
            html += '<p class="card-text text-muted small mb-0">' + escapeHtml(data.description) + '</p>';
        }
        
        html += '</div>';
        
        // Image
        if (data.image) {
            html += '<div class="ms-3" style="flex-shrink: 0;">';
            html += '<img src="' + escapeHtml(data.image) + '" alt="' + escapeHtml(data.title || '') + '" loading="lazy" class="rounded" ';
            html += 'style="width: 80px; height: 80px; object-fit: cover; padding: 0px; border: none">';
            html += '</div>';
        }
        
        html += '</div>'; // d-flex
        html += '</div>'; // card-body
        html += '</div>'; // card
        
        return html;
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
    
    $(window).on('action:posts.loaded action:topic.loaded', function() {
        processOGPPlaceholders();
        require(['translator'], function(translator) {
            $('.ogp-embed-card').each(function() { translator.translate(this); });
        });
    });
    
    processOGPPlaceholders();
    require(['translator'], function(translator) {
        $('.ogp-embed-card').each(function() { translator.translate(this); });
    });

    // Refetch handler
    $(document).on('click', '[data-action="ogp-refetch"]', function(e) {
        e.preventDefault();
        const $btn = $(this);
        const $card = $btn.closest('.ogp-embed-card');
        const url = $card.attr('data-ogp-url');
        if (!url) return;

        // Disable button during request
        $btn.prop('disabled', true);

        // Ensure label is translated
        require(['translator'], function(translator) {
            translator.translate($btn.get(0));
        });

        const payload = { url: url };
        if (typeof window.topicId !== 'undefined') payload.topicId = window.topicId;
        // Add spin feedback
        const $icon = $btn.find('i.fa');
        $icon.addClass('fa-spin');

        socket.emit('plugins.ogp-embed.refetch', payload, function(res) {
            $btn.prop('disabled', false);
            $icon.removeClass('fa-spin');
            try {
                if (res && res.accepted) {
                    if (typeof app !== 'undefined' && app.alertSuccess) {
                        require(['translator'], function(translator) {
                            translator.translate('[[ogp-embed:ogp-refetch-accepted]]', function(text) {
                                app.alertSuccess(text);
                            });
                        });
                    }

                    // Immediately fetch updated OGP and replace this card
                    socket.emit('plugins.ogp-embed.fetch', { url: url }, function(err2, data2) {
                        if (!err2 && data2 && data2.url) {
                            const newHtml = buildOGPCard(data2);
                            const $newCard = $(newHtml);
                            $card.replaceWith($newCard);
                            require(['translator'], function(translator) {
                                translator.translate($newCard.get(0));
                            });
                        }
                    });
                } else if (res && res.error && res.error.message) {
                    if (typeof app !== 'undefined' && app.alertError) {
                        app.alertError(res.error.message);
                    }
                }
            } catch (err) {
                if (typeof app !== 'undefined' && app.alertError) {
                    app.alertError('Error');
                }
            }
        });
    });
});
