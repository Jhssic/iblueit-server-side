module.exports = async function (context, req) {
    const mongoose = require('mongoose');
    const DATABASE = process.env.MongoDbAtlas;
    mongoose.connect(DATABASE);
    mongoose.Promise = global.Promise;

    require('../shared/UserAccount');
    require('../shared/AlertCriteria');
    const UserAccountModel = mongoose.model('UserAccount');
    const AlertCriteriaModel = mongoose.model('AlertCriteria');

    const utils = require('../shared/utils');
    const validations = require('../shared/Validators');

    const isVerifiedGameToken = await utils.verifyGameToken(req.headers.gametoken, mongoose);
    if (!isVerifiedGameToken) {
        context.res = { status: 403, body: utils.createResponse(false, false, "Chave de acesso inválida.", null, 1) };
        context.done();
        return;
    }

    // RN01: apenas Administrator pode configurar alertas
    const requestingUser = await UserAccountModel.findOne({ "gameToken.token": req.headers.gametoken });
    if (!requestingUser || requestingUser.role !== "Administrator") {
        context.res = {
            status: 403,
            body: utils.createResponse(false, false, "Apenas profissionais autenticados podem configurar alertas.", null, 1),
        };
        context.done();
        return;
    }

    const pacientId = req.params.pacientId;
    if (!pacientId) {
        context.res = { status: 400, body: utils.createResponse(false, true, "Parâmetros de consulta inexistentes.", null, 300) };
        context.done();
        return;
    }

    const body = req.body || {};
    if (Object.entries(body).length === 0) {
        context.res = { status: 400, body: utils.createResponse(false, true, "Dados vazios!", null, 2) };
        context.done();
        return;
    }

    let validationResult = validations.saveAlertCriteriaValidator(body);
    if (validationResult.errorCount !== 0) {
        let response = utils.createResponse(false, true, "Erros de validação encontrados!", null, 2);
        response.errors = validationResult.errors.errors;
        context.res = { status: 400, body: response };
        context.done();
        return;
    }

    try {
        // Substitui todos os critérios do paciente pela lista enviada.
        await AlertCriteriaModel.deleteMany({ pacientId });

        const created = await AlertCriteriaModel.insertMany(
            body.criteria.map((c) => ({
                pacientId,
                metric: c.metric,
                condition: c.condition,
                triggerValue: c.triggerValue,
            }))
        );

        context.res = {
            status: 201,
            body: utils.createResponse(true, true, "Configuração de alertas salva com sucesso.", created, null),
        };
    } catch (err) {
        context.log("[SaveAlertCriteria] - ERROR: ", err);
        context.res = { status: 500, body: utils.createResponse(false, true, "Ocorreu um erro interno ao realizar a operação.", null, 0) };
    }

    context.done();
};
