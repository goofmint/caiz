const winston = require.main.require('winston');
const Categories = require.main.require('./src/categories');
const Groups = require.main.require('./src/groups');
const db = require.main.require('./src/database');

/**
 * Subcategory management functionality
 */

async function GetSubCategories(socket, { cid }) {
  winston.info(`[plugin/caiz] Getting subcategories for cid: ${cid}, uid: ${socket.uid}`);
  
  const { uid } = socket;
  if (!uid) {
    throw new Error('Authentication required');
  }
  
  // Check ownership
  const categoryData = await Categories.getCategoryData(cid);
  const ownerGroup = categoryData.ownerGroup;
  const isOwner = await Groups.isMember(uid, ownerGroup);
  
  if (!isOwner) {
    throw new Error('Permission denied');
  }
  
  // Get subcategories using Categories API
  const children = await Categories.getChildren([cid], uid);
  const subcategories = children[0] || [];
  
  // Categories.getChildren already returns them in the correct order
  return subcategories
    .filter(cat => cat && !cat.disabled)
    .map(cat => ({
      cid: cat.cid,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      color: cat.color,
      bgColor: cat.bgColor,
      order: cat.order,
      postcount: cat.postcount || 0,
      topiccount: cat.topiccount || 0
    }));
}

async function CreateSubCategory(socket, dataInput) {
  winston.info(`[plugin/caiz] Creating subcategory for cid: ${dataInput.parentCid}, uid: ${socket.uid}`);
  winston.info(`[plugin/caiz] Subcategory data:`, JSON.stringify(dataInput, null, 2));
  
  const { uid } = socket;
  const { parentCid, name, description, icon, color, bgColor } = dataInput;
  
  if (!uid) {
    throw new Error('Authentication required');
  }
  
  if (!name || !name.trim()) {
    throw new Error('Category name is required');
  }
  
  // Check ownership
  const parentData = await Categories.getCategoryData(parentCid);
  const ownerGroup = parentData.ownerGroup;
  const isOwner = await Groups.isMember(uid, ownerGroup);
  
  if (!isOwner) {
    throw new Error('Permission denied');
  }
  
  // Check for duplicate names within the same parent
  const existingSubcategories = await GetSubCategories(socket, { cid: parentCid });
  const nameExists = existingSubcategories.some(cat => 
    cat.name.toLowerCase() === name.trim().toLowerCase()
  );
  
  if (nameExists) {
    throw new Error('A category with this name already exists');
  }
  
  // Get next order number
  const maxOrder = Math.max(0, ...existingSubcategories.map(cat => cat.order || 0));
  const order = maxOrder + 1;
  
  // Create subcategory
  const categoryData = {
    name: name.trim(),
    description: description ? description.trim() : '',
    parentCid: parentCid,
    order: order
  };
  
  // Add optional fields
  if (icon) categoryData.icon = icon;
  if (color) categoryData.color = color;
  if (bgColor) categoryData.bgColor = bgColor;
  
  const newCategory = await Categories.create(categoryData);
  winston.info(`[plugin/caiz] Subcategory created: ${newCategory.cid}`);
  
  return {
    success: true,
    category: {
      cid: newCategory.cid,
      name: newCategory.name,
      description: newCategory.description,
      icon: newCategory.icon,
      color: newCategory.color,
      bgColor: newCategory.bgColor,
      order: newCategory.order,
      postcount: 0,
      topiccount: 0
    }
  };
}

async function UpdateSubCategory(socket, dataInput) {
  winston.info(`[plugin/caiz] Updating subcategory: ${dataInput.cid}, uid: ${socket.uid}`);
  winston.info(`[plugin/caiz] Update data:`, dataInput);
  
  const { uid } = socket;
  const { cid, parentCid, name, description, icon, color, bgColor } = dataInput;
  
  if (!uid || !cid) {
    throw new Error('Authentication and category ID required');
  }
  
  if (!name || !name.trim()) {
    throw new Error('Category name is required');
  }
  
  // Check ownership of parent community
  const parentCategoryData = await Categories.getCategoryData(parentCid);
  const ownerGroup = parentCategoryData.ownerGroup;
  const isOwner = await Groups.isMember(uid, ownerGroup);
  
  if (!isOwner) {
    throw new Error('Permission denied');
  }
  
  // Verify subcategory exists and belongs to parent
  const subcategory = await Categories.getCategoryData(cid);
  if (!subcategory || subcategory.parentCid != parentCid) {
    throw new Error('Subcategory not found or access denied');
  }
  
  // Check for duplicate names (excluding current category)
  const existingSubcategories = await GetSubCategories(socket, { cid: parentCid });
  const nameExists = existingSubcategories.some(cat => 
    cat.cid != cid && cat.name.toLowerCase() === name.trim().toLowerCase()
  );
  
  if (nameExists) {
    throw new Error('A category with this name already exists');
  }
  
  // Prepare update data
  const updateData = {
    name: name.trim(),
    description: description ? description.trim() : ''
  };
  
  // Handle optional fields
  if (icon !== undefined) updateData.icon = icon || '';
  if (color !== undefined) updateData.color = color || '';
  if (bgColor !== undefined) updateData.bgColor = bgColor || '';
  
  // Update category using proper NodeBB Categories API
  winston.info(`[plugin/caiz] Updating category ${cid} with data:`, updateData);
  
  // Use the correct Categories.update method: modified object with cid as key
  const modified = { [cid]: updateData };
  await Categories.update(modified);
  
  winston.info(`[plugin/caiz] Subcategory updated: ${cid}`);
  
  return { success: true };
}

async function DeleteSubCategory(socket, { cid, parentCid }) {
  winston.info(`[plugin/caiz] Deleting subcategory: ${cid}, parent: ${parentCid}, uid: ${socket.uid}`);
  
  const { uid } = socket;
  
  if (!uid || !cid || !parentCid) {
    throw new Error('Authentication, category ID, and parent ID required');
  }
  
  // Check ownership of parent community
  const parentCategoryData = await Categories.getCategoryData(parentCid);
  const ownerGroup = parentCategoryData.ownerGroup;
  const isOwner = await Groups.isMember(uid, ownerGroup);
  
  if (!isOwner) {
    throw new Error('Permission denied');
  }
  
  // Verify subcategory exists and belongs to parent
  const subcategory = await Categories.getCategoryData(cid);
  if (!subcategory || subcategory.parentCid != parentCid) {
    throw new Error('Subcategory not found or access denied');
  }
  
  // Check if category has any topics
  const topicCount = await db.sortedSetCard(`cid:${cid}:tids`);
  if (topicCount > 0) {
    throw new Error(`Cannot delete category with ${topicCount} topics. Please move or delete topics first.`);
  }
  
  // Check if category has any subcategories
  const subcategoryCount = await db.sortedSetCard(`cid:${cid}:children`);
  if (subcategoryCount > 0) {
    throw new Error('Cannot delete category with subcategories. Please delete subcategories first.');
  }
  
  // Delete the category
  await Categories.purge(cid, uid);
  
  winston.info(`[plugin/caiz] Subcategory deleted: ${cid}`);
  
  return { success: true };
}

async function ReorderSubCategories(socket, { parentCid, categoryIds }) {
  winston.info(`[plugin/caiz] Reordering subcategories for parent: ${parentCid}, uid: ${socket.uid}`);
  winston.info(`[plugin/caiz] New order:`, categoryIds);
  
  const { uid } = socket;
  
  if (!uid || !parentCid || !Array.isArray(categoryIds)) {
    throw new Error('Authentication, parent ID, and category order required');
  }
  
  // Check ownership of parent community
  const parentCategoryData = await Categories.getCategoryData(parentCid);
  const ownerGroup = parentCategoryData.ownerGroup;
  const isOwner = await Groups.isMember(uid, ownerGroup);
  
  if (!isOwner) {
    throw new Error('Permission denied');
  }
  
  // Verify all categories belong to this parent
  const children = await Categories.getChildren([parentCid], uid);
  const existingSubcategories = children[0] || [];
  const existingIds = existingSubcategories.map(cat => parseInt(cat.cid));
  const requestedIds = categoryIds.map(id => parseInt(id));
  
  // Check if all requested IDs exist and belong to parent
  const invalidIds = requestedIds.filter(id => !existingIds.includes(id));
  if (invalidIds.length > 0) {
    throw new Error(`Invalid category IDs: ${invalidIds.join(', ')}`);
  }
  
  // Check if all existing categories are included
  if (requestedIds.length !== existingIds.length) {
    throw new Error('All categories must be included in reorder operation');
  }
  
  try {
    // Update order for each category using direct database access
    for (let i = 0; i < categoryIds.length; i++) {
      const cid = parseInt(categoryIds[i]);
      const newOrder = i + 1;
      
      winston.info(`[plugin/caiz] Updating category ${cid} to order ${newOrder}`);
      
      // Set the order field directly in the database
      await db.setObjectField(`category:${cid}`, 'order', newOrder);
      winston.info(`[plugin/caiz] Set order ${newOrder} for category ${cid}`);
    }
    
    winston.info(`[plugin/caiz] Subcategories reordered successfully for parent: ${parentCid}`);
    
    return { success: true };
  } catch (error) {
    winston.error(`[plugin/caiz] Error reordering subcategories:`, error);
    winston.error(`[plugin/caiz] Error stack:`, error.stack);
    throw new Error(`Failed to reorder categories: ${error.message}`);
  }
}

module.exports = {
  GetSubCategories,
  CreateSubCategory,
  UpdateSubCategory,
  DeleteSubCategory,
  ReorderSubCategories
};