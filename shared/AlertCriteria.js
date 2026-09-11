const mongoose = require('mongoose');

// RF10: critério de alerta configurável por paciente.
// triggerValue tem significado dependente da condition:
//  - "Deterioração consecutiva": número de sessões consecutivas em queda.
//  - "Queda percentual >": percentual de queda entre as duas últimas sessões.
const AlertCriteriaSchema = mongoose.Schema({
    pacientId: { type: String },
    metric: { type: String },
    condition: { type: String },
    triggerValue: { type: Number },
    active: { type: Boolean, default: true },
},
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('AlertCriteria', AlertCriteriaSchema);
