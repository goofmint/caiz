// JSON Schema definitions for WebSocket event payloads
// Used for runtime validation during development and testing phases

const wsEventSchemas = {
  // Community creation
  'plugins.community.create': {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 3 },
      description: { type: 'string' }
    },
    required: ['name'],
    additionalProperties: false
  },

  // Community operations
  'plugins.community.follow': {
    type: 'object',
    properties: {
      cid: { type: 'number' }
    },
    required: ['cid'],
    additionalProperties: false
  },

  'plugins.community.unfollow': {
    type: 'object',
    properties: {
      cid: { type: 'number' }
    },
    required: ['cid'],
    additionalProperties: false
  },

  'plugins.community.isFollowed': {
    type: 'object',
    properties: {
      cid: { type: 'number' }
    },
    required: ['cid'],
    additionalProperties: false
  },

  'plugins.community.isCommunityOwner': {
    type: 'object',
    properties: {
      cid: { type: 'number' }
    },
    required: ['cid'],
    additionalProperties: false
  },

  'plugins.community.getCommunityData': {
    type: 'object',
    properties: {
      cid: { type: 'number' }
    },
    required: ['cid'],
    additionalProperties: false
  },

  'plugins.community.updateCommunityData': {
    type: 'object',
    properties: {
      cid: { type: 'number' },
      name: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      backgroundImage: { type: 'string' },
      icon: { type: 'string' },
      color: { type: 'string' },
      bgColor: { type: 'string' }
    },
    required: ['cid', 'name'],
    additionalProperties: false
  },

  // Subcategory operations
  'plugins.community.getSubCategories': {
    type: 'object',
    properties: {
      cid: { type: 'number' }
    },
    required: ['cid'],
    additionalProperties: false
  },

  'plugins.community.createSubCategory': {
    type: 'object',
    properties: {
      parentCid: { type: 'number' },
      name: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      icon: { type: 'string' },
      color: { type: 'string' },
      bgColor: { type: 'string' }
    },
    required: ['parentCid', 'name'],
    additionalProperties: false
  },

  'plugins.community.updateSubCategory': {
    type: 'object',
    properties: {
      cid: { type: 'number' },
      parentCid: { type: 'number' },
      name: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      icon: { type: 'string' },
      color: { type: 'string' },
      bgColor: { type: 'string' }
    },
    required: ['cid', 'parentCid', 'name'],
    additionalProperties: false
  },

  'plugins.community.deleteSubCategory': {
    type: 'object',
    properties: {
      cid: { type: 'number' },
      parentCid: { type: 'number' }
    },
    required: ['cid', 'parentCid'],
    additionalProperties: false
  },

  'plugins.community.reorderSubCategories': {
    type: 'object',
    properties: {
      parentCid: { type: 'number' },
      categoryIds: {
        type: 'array',
        items: { type: 'number' },
        minItems: 1
      }
    },
    required: ['parentCid', 'categoryIds'],
    additionalProperties: false
  },

  // Member operations
  'plugins.community.getMembers': {
    type: 'object',
    properties: {
      cid: { type: 'number' }
    },
    required: ['cid'],
    additionalProperties: false
  },

  'plugins.community.addMember': {
    type: 'object',
    properties: {
      cid: { type: 'number' },
      username: { type: 'string', minLength: 1 }
    },
    required: ['cid', 'username'],
    additionalProperties: false
  },

  'plugins.community.changeMemberRole': {
    type: 'object',
    properties: {
      cid: { type: 'number' },
      targetUid: { type: 'number' },
      newRole: { 
        type: 'string',
        enum: ['owner', 'manager', 'member', 'banned']
      }
    },
    required: ['cid', 'targetUid', 'newRole'],
    additionalProperties: false
  },

  'plugins.community.removeMember': {
    type: 'object',
    properties: {
      cid: { type: 'number' },
      targetUid: { type: 'number' }
    },
    required: ['cid', 'targetUid'],
    additionalProperties: false
  }
};

// Legacy schema definitions for backwards compatibility
const communitySchema = {
  name: {
    type: 'string',
    required: true,
    minLength: 3
  },
  description: {
    type: 'string',
    required: false
  },
  backgroundImage: {
    type: 'string',
    required: false
  },
  icon: {
    type: 'string',
    required: false
  },
  color: {
    type: 'string',
    required: false
  },
  bgColor: {
    type: 'string',
    required: false
  }
};

const subcategorySchema = {
  name: {
    type: 'string',
    required: true,
    minLength: 1
  },
  description: {
    type: 'string',
    required: false
  },
  parentCid: {
    type: 'number',
    required: true
  },
  icon: {
    type: 'string',
    required: false
  },
  color: {
    type: 'string',
    required: false
  },
  bgColor: {
    type: 'string',
    required: false
  },
  order: {
    type: 'number',
    required: false
  }
};

const memberChangeSchema = {
  cid: {
    type: 'number',
    required: true
  },
  targetUid: {
    type: 'number',
    required: true
  },
  newRole: {
    type: 'string',
    required: true,
    enum: ['owner', 'manager', 'member', 'banned']
  }
};

// Runtime validation helper (for development/testing)
function validatePayload(eventName, payload) {
  const schema = wsEventSchemas[eventName];
  if (!schema) {
    return { valid: true, errors: [] }; // No schema defined, skip validation
  }

  // Simple validation implementation
  // In production, consider using a proper JSON Schema validator like ajv
  const errors = [];
  const { properties, required = [], additionalProperties = true } = schema;

  // Check required properties
  for (const prop of required) {
    if (!(prop in payload)) {
      errors.push(`Missing required property: ${prop}`);
    }
  }

  // Check property types and constraints
  for (const [key, value] of Object.entries(payload)) {
    if (properties[key]) {
      const propSchema = properties[key];
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      if (propSchema.type && actualType !== propSchema.type) {
        errors.push(`Property ${key} should be ${propSchema.type}, got ${actualType}`);
      }
      
      if (propSchema.minLength && value.length < propSchema.minLength) {
        errors.push(`Property ${key} should have minimum length ${propSchema.minLength}`);
      }
      
      if (propSchema.enum && !propSchema.enum.includes(value)) {
        errors.push(`Property ${key} should be one of: ${propSchema.enum.join(', ')}`);
      }
    } else if (!additionalProperties) {
      errors.push(`Additional property not allowed: ${key}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  wsEventSchemas,
  communitySchema,
  subcategorySchema,
  memberChangeSchema,
  validatePayload
};