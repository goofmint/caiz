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

module.exports = {
  communitySchema,
  subcategorySchema,
  memberChangeSchema
};