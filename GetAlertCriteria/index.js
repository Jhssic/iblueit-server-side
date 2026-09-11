module.exports = async function (context, req) {
    const mongoose = require('mongoose');
    const DATABASE = process.env.MongoDbAtlas;
    mongoose.connect(DATABASE);
    mongoose.Promise = global.Promise;

    require('../shared/AlertCriteria');
    const AlertCriteriaModel = mongoose.model('AlertCriteria');

    const utils = require('../shared/utils');

    const isVerifiedGameToken = await utils.verifyGameToken(req.headers.gametoken, mongoose);
    if (!isVerifiedGameToken) {
        context.res = { status: 403, body: utils.createResponse(false, false, "Chave de acesso inválida.", null, 1) };
        context.done();
        return;
    }

    const pacientId = req.params.pacientId;
    if (!pacientId) {
        context.res = { status: 400, body: utils.createResponse(false, true, "Parâmetros de consulta inexistentes.", null, 300) };
        context.done();
        return;
    }

    try {
        const criteria = await AlertCriteriaModel.find({ pacientId, active: true }).sort({ created_at: 1 });
        context.res = {
            status: 200,
            body: utils.createResponse(true, true, "Consulta realizada com sucesso.", criteria, null),
        };
    } catch (err) {
        context.log("[GetAlertCriteria] - ERROR: ", err);
        context.res = { status: 500, body: utils.createResponse(false, true, "Ocorreu um erro interno ao realizar a operação.", null, 0) };
    }

    context.done();
};
