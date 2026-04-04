const { Schema } = require('mongoose');

const siteSettingsSchema = new Schema({
  key:         { type: String, required: true, unique: true, default: 'main' },
  isLive:      { type: Boolean, default: false },
  launchDate:  { type: Date, default: null },
}, { timestamps: true });

module.exports = function makeSiteSettingsModel(mongoose) {
  try { return mongoose.model('SiteSettings'); }
  catch (e) { return mongoose.model('SiteSettings', siteSettingsSchema); }
};
