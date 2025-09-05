<div class="modal fade community-edit-modal" id="community-edit-modal" tabindex="-1" aria-labelledby="community-edit-modal-label" aria-hidden="true">
  <div class="modal-dialog modal-xl">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="community-edit-modal-label">[[caiz:edit-community]]</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body p-0" style="max-height: 80vh; overflow: hidden;">
        <div class="row g-0" style="height: 80vh;">
          <!-- Left Sidebar (30%) -->
          <div class="col-md-4 sidebar-menu border-end" style="height: 100%;">
            <div class="list-group list-group-flush">
              <a href="#" class="list-group-item list-group-item-action active" data-tab="general">
                <i class="fa fa-edit me-2"></i>[[caiz:edit]]
              </a>
              <a href="#" class="list-group-item list-group-item-action" data-tab="categories">
                <i class="fa fa-folder me-2"></i>[[caiz:categories]]
              </a>
              <a href="#" class="list-group-item list-group-item-action" data-tab="members">
                <i class="fa fa-users me-2"></i>[[caiz:members]]
              </a>
              <a href="#" class="list-group-item list-group-item-action" data-tab="notifications">
                <i class="fa fa-bell me-2"></i>[[caiz:notifications]]
              </a>
            </div>
          </div>
          <!-- Right Content Area (70%) -->
          <div class="col-md-8 content-area" style="height: 100%; overflow-y: auto;">
            <div class="tab-content p-4" style="padding-bottom: 100px !important;">
              <div class="tab-pane fade show active" id="general-tab">
                <!-- IMPORT partials/community-edit-form.tpl -->
              </div>
              <div class="tab-pane fade" id="categories-tab">
                <h6 class="mb-3">[[caiz:category-management]]</h6>
                <div id="categories-loading" style="display: none;">
                  <i class="fa fa-spinner fa-spin"></i> [[caiz:loading-categories]]
                </div>
                <div id="categories-empty" style="display: none;">
                  <p class="text-muted">[[caiz:no-categories-yet]]</p>
                </div>
                <div id="categories-content" style="display: none;">
                  <table class="table">
                    <tbody id="categories-table-body"></tbody>
                  </table>
                </div>
                <div id="category-form-container" style="display: none;">
                  <form id="category-form">
                    <input type="hidden" id="category-form-cid" name="cid">
                    <h5 id="category-form-title">[[caiz:add-category]]</h5>
                    
                    <div class="mb-3">
                      <label for="category-form-name" class="form-label">[[caiz:name]]</label>
                      <input type="text" id="category-form-name" name="name" class="form-control" placeholder="[[caiz:category-name]]" required>
                    </div>
                    
                    <div class="mb-3">
                      <label for="category-form-description" class="form-label">[[caiz:description]]</label>
                      <textarea id="category-form-description" name="description" class="form-control" placeholder="[[caiz:category-description]]" rows="3"></textarea>
                    </div>
                    
                    <div class="mb-3">
                      <label class="form-label">[[caiz:icon-colors]]</label>
                      <div class="d-flex align-items-center gap-2 mb-2">
                        <div id="category-selected-icon" class="fa fa-folder fa-lg me-2" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;"></div>
                        <label for="category-form-color" class="form-label mb-0 me-2">[[caiz:text]]:</label>
                        <input type="color" id="category-form-color" name="color" value="#000000" class="form-control form-control-color me-2" style="width: 40px; height: 30px;">
                        <label for="category-form-bg-color" class="form-label mb-0 me-2">[[caiz:background]]:</label>
                        <input type="color" id="category-form-bg-color" name="bgColor" value="#ffffff" class="form-control form-control-color" style="width: 40px; height: 30px;">
                      </div>
                      <button type="button" id="category-icon-select" class="btn btn-outline-secondary btn-sm">
                        <i class="fa fa-search me-1"></i>[[caiz:select-icon]]
                      </button>
                      <input type="hidden" id="category-form-icon" name="icon" value="fa-folder">
                    </div>
                    
                    <div class="d-flex gap-2">
                      <button type="button" id="cancel-category-form" class="btn btn-outline-secondary">
                        <i class="fa fa-times me-1"></i>[[caiz:cancel]]
                      </button>
                      <button type="submit" class="btn btn-primary">
                        <span class="category-form-btn-spinner spinner-border spinner-border-sm me-1" style="display: none;"></span>
                        <span class="category-form-btn-text">[[caiz:add-category]]</span>
                      </button>
                    </div>
                  </form>
                </div>
                <button id="add-category-btn" class="btn btn-primary">[[caiz:add-category]]</button>
              </div>
              <div class="tab-pane fade" id="members-tab">
                <h6 class="mb-3">[[caiz:member-management]]</h6>
                
                <!-- Member Filter Section -->
                <div id="members-filter" style="display: none;">
                  <div class="mb-3">
                    <input type="text" id="member-search" class="form-control" placeholder="[[caiz:filter-members]]">
                  </div>
                </div>
                
                <div id="members-loading" style="display: none;">
                  <i class="fa fa-spinner fa-spin"></i> [[caiz:loading-members]]
                </div>
                <div id="members-empty" style="display: none;">
                  <p class="text-muted">[[caiz:no-members-yet]]</p>
                </div>
                <div id="members-content" style="display: none;">
                  <div id="members-list">
                    <table class="table">
                      <tbody id="members-table-body"></tbody>
                    </table>
                  </div>
                </div>
                
                <!-- Add Member Form -->
                <div id="member-form-container" style="display: none;">
                  <form id="member-form">
                    <input type="hidden" id="member-form-uid">
                    <h5 id="member-form-title">[[caiz:add-member]]</h5>
                    
                    <div class="mb-3">
                      <label for="add-member-username" class="form-label">[[caiz:username]]</label>
                      <input type="text" id="add-member-username" name="username" class="form-control" placeholder="[[caiz:enter-username]]" required>
                      <div id="username-suggestions" class="dropdown-menu" style="display: none; position: absolute; width: 100%;"></div>
                    </div>
                    
                    <div class="mb-3">
                      <label for="member-role" class="form-label">[[caiz:role]]</label>
                      <select id="member-role" name="role" class="form-select">
                        <option value="member">[[caiz:member]]</option>
                        <option value="manager">[[caiz:manager]]</option>
                        <option value="owner">[[caiz:owner]]</option>
                      </select>
                    </div>
                    
                    <div class="d-flex gap-2">
                      <button type="button" id="cancel-member-form" class="btn btn-outline-secondary">
                        <i class="fa fa-times me-1"></i>[[caiz:cancel]]
                      </button>
                      <button type="submit" class="btn btn-primary">
                        <span class="member-form-btn-spinner spinner-border spinner-border-sm me-1" style="display: none;"></span>
                        <span class="member-form-btn-text">[[caiz:add-member]]</span>
                      </button>
                    </div>
                  </form>
                </div>
                
                <button id="add-member-btn" class="btn btn-primary">[[caiz:add-member]]</button>
              </div>
              <div class="tab-pane fade" id="notifications-tab">
                <h6 class="mb-3">[[caiz:notification-settings]]</h6>
                
                <!-- Slack Notifications -->
                <div class="card mb-3">
                  <div class="card-body">
                    <h5 class="card-title">
                      <i class="fab fa-slack me-2"></i>[[caiz:slack-notifications]]
                    </h5>
                    
                    <!-- 未接続状態 -->
                    <div id="slack-disconnected" style="display: block;">
                      <p class="text-muted">[[caiz:slack-not-connected]]</p>
                      <button type="button" class="btn btn-primary" id="connect-slack">
                        <i class="fab fa-slack me-1"></i>[[caiz:connect-to-slack]]
                      </button>
                    </div>
                    
                    <!-- 接続済み状態 -->
                    <div id="slack-connected" style="display: none;">
                      <div class="alert alert-success">
                        <i class="fa fa-check-circle me-1"></i>
                        [[caiz:slack-connected-to]] <strong id="slack-team-name"></strong>
                        <span id="slack-channel-info" style="display: none;">
                          (<span id="slack-channel-name"></span>)
                        </span>
                        <br>
                        <small class="text-muted">[[caiz:connected-at]] <span id="slack-connected-date"></span></small>
                      </div>
                      
                      <div class="form-check mb-3">
                        <input type="checkbox" class="form-check-input" id="slack-enabled" checked>
                        <label class="form-check-label" for="slack-enabled">
                          [[caiz:enable-slack-notifications]]
                        </label>
                      </div>
                      
                      
                      <hr class="my-3">
                      
                      <button type="button" class="btn btn-outline-danger" id="disconnect-slack">
                        <i class="fa fa-unlink me-1"></i>[[caiz:disconnect-slack]]
                      </button>
                    </div>
                    
                    <!-- 接続中状態 -->
                    <div id="slack-connecting" style="display: none;">
                      <div class="text-center">
                        <i class="fa fa-spinner fa-spin me-2"></i>[[caiz:connecting-to-slack]]
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Discord Notifications -->
                <div class="card mb-3">
                  <div class="card-body">
                    <h5 class="card-title">
                      <i class="fab fa-discord me-2"></i>[[caiz:discord-notifications]]
                    </h5>
                    
                    <!-- 未接続状態 -->
                    <div id="discord-disconnected" style="display: block;">
                      <p class="text-muted">[[caiz:discord-not-connected]]</p>
                      <button type="button" class="btn btn-primary" id="connect-discord" style="background-color: #5865F2; border-color: #5865F2;">
                        <i class="fab fa-discord me-1"></i>[[caiz:connect-to-discord]]
                      </button>
                    </div>
                    
                    <!-- 接続済み状態 -->
                    <div id="discord-connected" style="display: none;">
                      <div class="alert alert-success">
                        <i class="fa fa-check-circle me-1"></i>
                        [[caiz:discord-connected-to]] <strong id="discord-guild-name"></strong>
                        <span id="discord-user-info" style="display: none;">
                          (<span id="discord-username"></span>)
                        </span>
                        <br>
                        <small class="text-muted">[[caiz:connected-at]] <span id="discord-connected-date"></span></small>
                      </div>
                      
                      <div class="form-check mb-3">
                        <input type="checkbox" class="form-check-input" id="discord-enabled" checked>
                        <label class="form-check-label" for="discord-enabled">
                          [[caiz:enable-discord-notifications]]
                        </label>
                      </div>
                      
                      
                      <hr class="my-3">
                      
                      <button type="button" class="btn btn-outline-danger" id="disconnect-discord">
                        <i class="fa fa-unlink me-1"></i>[[caiz:disconnect-discord]]
                      </button>
                    </div>
                    
                    <!-- 接続中状態 -->
                    <div id="discord-connecting" style="display: none;">
                      <div class="text-center">
                        <i class="fa fa-spinner fa-spin me-2"></i>[[caiz:connecting-to-discord]]
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- X Notifications -->
                <div class="card mb-3">
                  <div class="card-body">
                    <h5 class="card-title">
                      <i class="fab fa-x-twitter me-2"></i>[[caiz:x-notifications]]
                    </h5>
                    
                    <!-- 未接続状態 -->
                    <div id="x-disconnected" style="display: block;">
                      <p class="text-muted">[[caiz:x-not-connected]]</p>
                      <button type="button" class="btn btn-dark" id="connect-x">
                        <i class="fab fa-x-twitter me-1"></i>[[caiz:connect-to-x]]
                      </button>
                    </div>
                    
                    <!-- 接続済み状態 -->
                    <div id="x-connected" style="display: none;">
                      <p>[[caiz:x-connected-to]] <strong><span id="x-account-name"></span></strong></p>
                      <p class="text-muted">[[caiz:connected-at]] <span id="x-connected-at"></span></p>
                      
                      <div class="form-check mb-3">
                        <input type="checkbox" class="form-check-input" id="x-enabled" checked>
                        <label class="form-check-label" for="x-enabled">
                          [[caiz:enable-x-notifications]]
                        </label>
                      </div>
                      
                      <hr class="my-3">
                      
                      <button type="button" class="btn btn-outline-danger" id="disconnect-x">
                        <i class="fa fa-unlink me-1"></i>[[caiz:disconnect-x]]
                      </button>
                    </div>
                    
                    <!-- 接続中状態 -->
                    <div id="x-connecting" style="display: none;">
                      <div class="text-center">
                        <i class="fa fa-spinner fa-spin me-2"></i>[[caiz:connecting-to-x]]
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Common Notification Events -->
                <div class="card mb-3">
                  <div class="card-body">
                    <h5 class="card-title">
                      <i class="fa fa-bell me-2"></i>[[caiz:notification-events]]
                    </h5>
                    
                    <div class="form-check mb-3">
                      <input type="checkbox" class="form-check-input" id="notify-new-topic" checked>
                      <label class="form-check-label" for="notify-new-topic">
                        [[caiz:notify-new-topic]]
                      </label>
                    </div>
                    
                    <div class="form-check mb-3">
                      <input type="checkbox" class="form-check-input" id="notify-new-post" checked>
                      <label class="form-check-label" for="notify-new-post">
                        [[caiz:notify-new-post]]
                      </label>
                    </div>
                    
                    <div class="form-check mb-3">
                      <input type="checkbox" class="form-check-input" id="notify-member-join">
                      <label class="form-check-label" for="notify-member-join">
                        [[caiz:notify-member-join]]
                      </label>
                    </div>
                    
                    <div class="form-check mb-3">
                      <input type="checkbox" class="form-check-input" id="notify-member-leave">
                      <label class="form-check-label" for="notify-member-leave">
                        [[caiz:notify-member-leave]]
                      </label>
                    </div>
                    
                    <button type="button" class="btn btn-primary" id="save-notification-settings">
                      <span class="save-notification-btn-spinner spinner-border spinner-border-sm me-1" style="display: none;"></span>
                      [[caiz:save-settings]]
                    </button>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>