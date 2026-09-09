const mongoose = require('mongoose');

const librarySettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Setting key is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Setting value is required']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);


module.exports = mongoose.model('LibrarySetting', librarySettingSchema);
