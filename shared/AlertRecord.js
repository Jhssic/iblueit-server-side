const mongoose = require('mongoose');

const AlertRecordSchema = mongoose.Schema({
    pacientId: { type: String },
    clinicalReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalReport' },
    metric: { type: String },
    condition: { type: String },
    triggerValue: { type: Number },
    active: { type: Boolean, default: true },
},
    { timestamps: { createdAt: 'triggered_at' } }
);

module.exports = mongoose.model('AlertRecord', AlertRecordSchema);
