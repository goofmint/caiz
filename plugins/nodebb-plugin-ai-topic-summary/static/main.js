// AI Topic Summary - Client Side Code

'use strict';

/* globals $, ajaxify, app, window */

console.log('[AI Topic Summary] Script loading...');

$(document).ready(function() {
  console.log('[AI Topic Summary] Document ready');
  
  // Check if we're already on a topic page
  if (ajaxify.data.template && ajaxify.data.template.topic) {
    console.log('[AI Topic Summary] Already on topic page, initializing');
    initializeTopicSummary();
  }
});

$(window).on('action:ajaxify.end', function(evt, data) {
  console.log('[AI Topic Summary] ajaxify.end triggered, template:', data.tpl);
  // Initialize summary display on topic pages
  if (data.tpl === 'topic') {
    console.log('[AI Topic Summary] Topic page detected via ajaxify, initializing summary');
    setTimeout(function() {
      initializeTopicSummary();
    }, 100); // Small delay to ensure DOM is ready
  }
});

function initializeTopicSummary() {
  console.log('[AI Topic Summary] initializeTopicSummary called');
  
  if (!ajaxify || !ajaxify.data) {
    console.error('[AI Topic Summary] ajaxify.data not available');
    return;
  }
  
  const topicData = ajaxify.data;
  console.log('[AI Topic Summary] Topic data available:', !!topicData);
  console.log('[AI Topic Summary] Topic template:', topicData.template);
  console.log('[AI Topic Summary] Full topic data:', topicData);
  
  if (!topicData.aiSummary) {
    console.log('[AI Topic Summary] No AI summary available for this topic');
    return;
  }
  
  console.log('[AI Topic Summary] AI summary found:', topicData.aiSummary);

  // Create and insert summary card
  console.log('[AI Topic Summary] Creating summary card');
  createSummaryCard(topicData.aiSummary, topicData.tid).then(function(summaryCard) {
    console.log('[AI Topic Summary] Summary card created successfully');
    
    // Insert before the first post
    const firstPost = $('.posts .post-row').first();
    if (firstPost.length) {
      console.log('[AI Topic Summary] Inserting summary before first post');
      summaryCard.insertBefore(firstPost);
    } else {
      // Fallback: insert at top of posts container
      const postsContainer = $('.posts');
      if (postsContainer.length) {
        console.log('[AI Topic Summary] Inserting summary at top of posts container');
        postsContainer.prepend(summaryCard);
      } else {
        console.error('[AI Topic Summary] No posts container found!');
      }
    }

    // Initialize event handlers
    console.log('[AI Topic Summary] Initializing event handlers');
    initializeSummaryEvents();
  }).catch(function(err) {
    console.error('[AI Topic Summary] Failed to create summary card:', err);
  });
}

function createSummaryCard(summaryData, topicId) {
  console.log('[AI Topic Summary] createSummaryCard called with:', { summaryData, topicId });
  const isCollapsed = getSummaryPreference() === 'collapsed';
  console.log('[AI Topic Summary] User preference - collapsed:', isCollapsed);
  
  // Use templates.parse to render the template
  return new Promise((resolve, reject) => {
    const templateData = {
      tid: topicId,
      text: escapeHtml(summaryData.text),
      postCount: summaryData.postCount,
      formattedDate: formatDate(summaryData.generatedAt),
      aiModel: summaryData.aiModel,
      collapsed: isCollapsed
    };
    console.log('[AI Topic Summary] Template data:', templateData);
    
    app.parseAndTranslate('summary-card', templateData, function(html) {
      console.log('[AI Topic Summary] Template rendered, HTML length:', html.length);
      resolve($(html));
    });
  });
}

function initializeSummaryEvents() {
  console.log('[AI Topic Summary] Setting up event handlers');
  // Toggle summary visibility
  $(document).off('click.aiSummary').on('click.aiSummary', '.ai-summary-header', function(e) {
    console.log('[AI Topic Summary] Summary header clicked');
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

// Export for global access
window.AiTopicSummary = {
  initialize: initializeTopicSummary
};

console.log('[AI Topic Summary] Script loaded and ready');

