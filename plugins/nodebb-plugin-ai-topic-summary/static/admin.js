// AI Topic Summary - Admin Panel

define('admin/plugins/ai-topic-summary', ['settings'], function (settings) {
  'use strict';

  const AiTopicSummary = {};

  AiTopicSummary.init = function () {
    settings.load('ai-topic-summary', $('.ai-summary-settings'), function() {
      console.log('[ai-topic-summary] Settings loaded');
    });

    $('#save-settings').on('click', function(e) {
      e.preventDefault();
      saveSettings();
    });

    $('#test-connection').on('click', function(e) {
      e.preventDefault();
      testConnection();
    });
  };

  function saveSettings() {
    const button = $('#save-settings');
    const originalText = button.text();
    
    button.prop('disabled', true).text('Saving...');

    settings.save('ai-topic-summary', $('.ai-summary-settings'), function() {
      button.prop('disabled', false).text(originalText);
      
      if (typeof app !== 'undefined' && app.alertSuccess) {
        app.alertSuccess('Settings saved successfully');
      } else if (typeof alerts !== 'undefined') {
        alerts.success('Settings saved successfully');
      }
    }, function(err) {
      button.prop('disabled', false).text(originalText);
      
      if (typeof app !== 'undefined' && app.alertError) {
        app.alertError(err.message || 'Failed to save settings');
      } else if (typeof alerts !== 'undefined') {
        alerts.error(err.message || 'Failed to save settings');
      }
    });
  }

  function testConnection() {
    const apiKey = $('#gemini-api-key').val();
    
    if (!apiKey || !apiKey.trim()) {
      if (typeof app !== 'undefined' && app.alertError) {
        app.alertError('Please enter a Gemini API key first');
      } else if (typeof alerts !== 'undefined') {
        alerts.error('Please enter a Gemini API key first');
      }
      return;
    }

    const button = $('#test-connection');
    const originalText = button.text();
    
    button.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i>Testing...');

    // Test with a simple prompt
    $.ajax({
      url: '/api/v3/plugins/ai-topic-summary/test',
      type: 'POST',
      data: {
        apiKey: apiKey
      },
      headers: {
        'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content')
      },
      success: function(data) {
        button.prop('disabled', false).text(originalText);
        
        if (typeof app !== 'undefined' && app.alertSuccess) {
          app.alertSuccess('Connection successful! Gemini API is working.');
        } else if (typeof alerts !== 'undefined') {
          alerts.success('Connection successful! Gemini API is working.');
        }
      },
      error: function(xhr) {
        button.prop('disabled', false).text(originalText);
        
        let errorMsg = 'Connection failed';
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.error) {
            errorMsg = response.error;
          }
        } catch (e) {
          // Use default error message
        }
        
        if (typeof app !== 'undefined' && app.alertError) {
          app.alertError(errorMsg);
        } else if (typeof alerts !== 'undefined') {
          alerts.error(errorMsg);
        }
      }
    });
  }

  return AiTopicSummary;
});