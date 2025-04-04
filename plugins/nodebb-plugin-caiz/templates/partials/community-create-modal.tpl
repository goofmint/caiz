<div class="modal fade" id="community-create-modal" tabindex="-1" role="dialog" aria-labelledby="communityCreateModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="communityCreateModalLabel"> 
                    [[caiz:create_community]]
                </h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">×</span>
                </button>
            </div>
            <div class="modal-body">
                <form id="community-create-form">
                    <!-- CSRFトークン（重要） -->
                    <input type="hidden" name="_csrf" value="{config.csrf_token}" />
                    <div class="form-group">
                        <label for="community-name">[[caiz:community_name]]</label>
                        <input type="text" class="form-control" id="community-name" name="name" required>
                    </div>
                    <div class="form-group">
                        <label for="community-description">[[caiz:community_description]]</label>
                        <textarea class="form-control" id="community-description" name="description" rows="3"></textarea>
                    </div>
                    <!-- 必要に応じて他のフィールドを追加 -->
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">
                    [[global:buttons.close]]
                </button>
                <button type="button" class="btn btn-primary" id="submit-community-create">
                    [[caiz:submit_create]]
                </button>
            </div>
        </div>
    </div>
</div>