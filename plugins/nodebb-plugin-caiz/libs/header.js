const winston = require.main.require('winston');
const path = require('path');
const fs = require('fs').promises;
const Base = require('./base');

class Header extends Base {
  static async customizeSidebarCommunities(data) {
    // このフックは現在使用していないが、将来的にサーバーサイドでデータを渡す場合に使用可能
    return data;
  }

  static async loadCommunityEditModal(data) {
    winston.info('[plugin/caiz] Loading community edit modal template');
    
    try {
      const templatePath = path.join(__dirname, '../templates/partials/community-edit-modal.tpl');
      const modalTemplate = await fs.readFile(templatePath, 'utf8');
      
      // テンプレートをクライアントで利用可能にする
      if (!data.templateData) {
        data.templateData = {};
      }
      
      data.templateData.communityEditModal = modalTemplate;
      winston.info('[plugin/caiz] Community edit modal template loaded successfully');
      
    } catch (error) {
      winston.error('[plugin/caiz] Error loading community edit modal template:', error);
    }
    
    return data;
  }
}

module.exports = Header;
