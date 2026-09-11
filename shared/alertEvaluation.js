/*
 * RF09/RF10/RN04 — avaliação de critérios de alerta clínico.
 *
 * Cada critério é avaliado contra a série de sessões mais recentes do paciente
 * em plataformoverviews. Métricas suportadas hoje são as que têm valor real
 * por sessão nessa collection (DJ/PJ/EB) — CGc (gameparameters) e FR/PEmax/PImax
 * (perfil estático do paciente, sem série temporal) ainda não são avaliáveis
 * como tendência e ficam fora do escopo desta função por enquanto.
 */

const METRIC_FIELD_MAP = {
    DJ: 'scoreRatio',
    PJ: 'score',
    EB: 'BorgScale',
};

const DEFAULT_CRITERIA = [
    { metric: 'DJ', condition: 'Deterioração consecutiva', triggerValue: 5 },
];

function evaluateConsecutiveDrop(sessionsDesc, field, triggerValue) {
    if (sessionsDesc.length < triggerValue) return false;
    const window = sessionsDesc.slice(0, triggerValue).slice().reverse();
    let consecutiveDrops = 0;
    for (let i = 1; i < window.length; i++) {
        if (window[i][field] < window[i - 1][field]) {
            consecutiveDrops++;
        } else {
            consecutiveDrops = 0;
        }
    }
    return consecutiveDrops >= triggerValue - 1;
}

function evaluatePercentDrop(sessionsDesc, field, triggerValue) {
    if (sessionsDesc.length < 2) return false;
    const [latest, previous] = sessionsDesc;
    if (previous[field] == null || previous[field] === 0 || latest[field] == null) return false;
    const pctChange = ((previous[field] - latest[field]) / previous[field]) * 100;
    return pctChange >= triggerValue;
}

async function evaluateAlerts(pacientId, mongoose) {
    require('./AlertCriteria');
    require('./PlataformOverview');
    const AlertCriteriaModel = mongoose.model('AlertCriteria');
    const PlataformOverviewModel = mongoose.model('PlataformOverview');

    let criteria = await AlertCriteriaModel.find({ pacientId, active: true });
    if (!criteria.length) criteria = DEFAULT_CRITERIA;

    const triggered = [];

    for (const criterion of criteria) {
        const field = METRIC_FIELD_MAP[criterion.metric];
        if (!field) continue; // métrica sem série temporal avaliável (ex: FR, CGc)

        const limit = criterion.condition === 'Deterioração consecutiva'
            ? criterion.triggerValue
            : 2;

        const sessionsDesc = await PlataformOverviewModel
            .find({ pacientId })
            .sort({ created_at: -1 })
            .limit(limit);

        const matched = criterion.condition === 'Deterioração consecutiva'
            ? evaluateConsecutiveDrop(sessionsDesc, field, criterion.triggerValue)
            : evaluatePercentDrop(sessionsDesc, field, criterion.triggerValue);

        if (matched) {
            triggered.push({
                metric: criterion.metric,
                condition: criterion.condition,
                triggerValue: criterion.triggerValue,
            });
        }
    }

    return triggered;
}

module.exports = { evaluateAlerts, METRIC_FIELD_MAP, DEFAULT_CRITERIA };
