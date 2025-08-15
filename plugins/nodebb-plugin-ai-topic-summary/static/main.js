// AI Topic Summary - Client Side Code

$(document).ready(function() {
  // Initialize summary display on topic pages
  if (ajaxify.data.template.topic) {
    initializeTopicSummary();
  }
});

function initializeTopicSummary() {
  const topicData = ajaxify.data;
  
  if (!topicData.aiSummary) {
    return;
  }

  // Create and insert summary card
  const summaryCard = createSummaryCard(topicData.aiSummary, topicData.tid);
  
  // Insert before the first post
  const firstPost = $('.posts .post-row').first();
  if (firstPost.length) {
    summaryCard.insertBefore(firstPost);
  } else {
    // Fallback: insert at top of posts container
    const postsContainer = $('.posts');
    if (postsContainer.length) {
      postsContainer.prepend(summaryCard);
    }
  }

  // Initialize event handlers
  initializeSummaryEvents();
}

function createSummaryCard(summaryData, topicId) {
  const isCollapsed = getSummaryPreference() === 'collapsed';
  
  const card = $(`
    <div class="ai-summary-card ${isCollapsed ? 'collapsed' : ''}" data-tid="${topicId}">
      <div class="ai-summary-header">
        <h6 class="ai-summary-title">
          <i class="fas fa-robot ai-summary-icon"></i>
          <span>AI Summary</span>
        </h6>
        <i class="fas fa-chevron-down ai-summary-toggle ${isCollapsed ? 'collapsed' : ''}"></i>
      </div>
      <div class="ai-summary-content">
        <div class="ai-summary-text">
          ${escapeHtml(summaryData.text)}
        </div>
        <div class="ai-summary-meta">
          <div class="ai-summary-meta-left">
            <span><i class="fas fa-comments me-1"></i>${summaryData.postCount} posts summarized</span>
            <span><i class="fas fa-clock me-1"></i>${formatDate(summaryData.generatedAt)}</span>
          </div>
          <div class="ai-summary-meta-right">
            <span class="ai-summary-badge">${summaryData.aiModel}</span>
          </div>
        </div>
      </div>
    </div>
  `);

  return card;
}

function initializeSummaryEvents() {
  // Toggle summary visibility
  $(document).off('click.aiSummary').on('click.aiSummary', '.ai-summary-header', function(e) {
    e.preventDefault();
    
    const card = $(this).closest('.ai-summary-card');
    const toggle = $(this).find('.ai-summary-toggle');
    
    card.toggleClass('collapsed');
    toggle.toggleClass('collapsed');
    
    // Save user preference
    const isCollapsed = card.hasClass('collapsed');
    setSummaryPreference(isCollapsed ? 'collapsed' : 'expanded');
  });
}

// User preference management
function getSummaryPreference() {
  try {
    return localStorage.getItem('aiSummaryState') || 'expanded';
  } catch (e) {
    return 'expanded';
  }
}

function setSummaryPreference(state) {
  try {
    localStorage.setItem('aiSummaryState', state);
  } catch (e) {
    // Ignore localStorage errors
  }
}

// Utility functions
function escapeHtml(text) {
  if (!text) return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(timestamp) {
  try {
    const date = new Date(parseInt(timestamp));
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (e) {
    return 'Unknown';
  }
}

// Manual summary generation (for moderators)
function generateSummaryManual(topicId) {
  if (!topicId || !app.user.uid) {
    return;
  }

  // Show loading state
  const button = $(`.generate-summary-btn[data-tid="${topicId}"]`);
  if (button.length) {
    button.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i>Generating...');
  }

  // Make API call
  $.ajax({
    url: `/api/v3/plugins/ai-topic-summary/generate/${topicId}`,
    type: 'POST',
    headers: {
      'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content')
    },
    success: function(data) {
      if (data && data.summaryText) {
        // Reload page to show new summary
        ajaxify.refresh();
      }
    },
    error: function(xhr) {
      let errorMsg = 'Failed to generate summary';
      try {
        const response = JSON.parse(xhr.responseText);
        if (response.error) {
          errorMsg = response.error;
        }
      } catch (e) {
        // Use default error message
      }
      
      if (typeof alerts !== 'undefined') {
        alerts.error(errorMsg);
      } else {
        console.error('AI Summary Error:', errorMsg);
      }
    },
    complete: function() {
      // Reset button state
      if (button.length) {
        button.prop('disabled', false).html('<i class="fas fa-robot me-1"></i>Generate Summary');
      }
    }
  });
}

// Export for global access
window.AiTopicSummary = {
  generateManual: generateSummaryManual
};