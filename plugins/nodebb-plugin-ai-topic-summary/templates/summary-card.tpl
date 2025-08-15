<div class="ai-summary-card <!-- IF collapsed -->collapsed<!-- ENDIF collapsed -->" data-tid="{tid}">
  <div class="ai-summary-header">
    <h6 class="ai-summary-title">
      <i class="fas fa-robot ai-summary-icon"></i>
      <span>[[ai-topic-summary:ai-summary]]</span>
    </h6>
    <i class="fas fa-chevron-down ai-summary-toggle <!-- IF collapsed -->collapsed<!-- ENDIF collapsed -->"></i>
  </div>
  <div class="ai-summary-content">
    <div class="ai-summary-text">
      {text}
    </div>
    <div class="ai-summary-meta">
      <div class="ai-summary-meta-left">
        <span><i class="fas fa-comments me-1"></i>[[ai-topic-summary:posts-summarized, {postCount}]]</span>
        <span><i class="fas fa-clock me-1"></i>{formattedDate}</span>
      </div>
      <div class="ai-summary-meta-right">
        <span class="ai-summary-badge">{aiModel}</span>
      </div>
    </div>
  </div>
</div>