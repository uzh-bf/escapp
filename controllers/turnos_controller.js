const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;
const {nextStep, prevStep} = require("../helpers/progress");
const {startTurno, stopTurno} = require("../helpers/sockets");
const {checkOnlyOneTurn, checkTeamSizeOne} = require("../helpers/utils");


// Autoload the turn with id equals to :turnId
exports.load = (req, res, next, turnId) => {
    const options = {
        "where": req.params.escapeRoomId ? {"escapeRoomId": req.params.escapeRoomId} : undefined,
        "include": [
            {
                "model": models.team,
                "include": {"model": models.user, "as": "teamMembers"},
                "order": [["date", "ASC"]]
            }
        ]
    };

    if (req.session.user) {
        options.include.push({
            "model": models.user,
            "as": "students",
            // "where": {"id": req.session.user.id}, // TODO Comprobar
            "required": false
        });
    }

    models.turno.findByPk(turnId, options).
        then((turn) => {
            if (turn) {
                req.turn = turn;
                next();
            } else {
                res.status(404);
                next(new Error(404));
            }
        }).
        catch((error) => next(error));
};

exports.isTurnNotPending = (req, res, next) => {
    if (req.session.user.isStudent) {
        if (req.participant.teamsAgregados[0].turno.status === "pending") {
            res.redirect("back");
            return;
        }
    }
    next();
};

exports.isTurnStarted = (req, res, next) => {
    if (req.session.user.isStudent) {
        const [team] = req.participant.teamsAgregados;
        if (!(team.startTime instanceof Date && isFinite(team.startTime))) {
            res.redirect("back");
            return;
        }
    }
    next();
};

// POST /escapeRooms/:escapeRoomId/join
exports.indexStudent = async (req, res, next) => {
    try {
        const {escapeRoom} = req;
        const token = req.body.token || req.query.token;

        const onlyOneTurn = checkOnlyOneTurn(escapeRoom);
        const onlyOneMember = checkTeamSizeOne(escapeRoom);

        if (onlyOneTurn) {
            if (onlyOneMember) {
                req.params.turnoId = escapeRoom.turnos[0].id;
                req.body.name = req.session.user.name;
                req.user = await models.user.findByPk(req.session.user.id);
                next();
            } else {
                res.redirect(`/escapeRooms/${escapeRoom.id}/turnos/${escapeRoom.turnos[0].id}/teams?token=${token}`);
            }
        } else {
            res.render("turnos/_indexStudent.ejs", {"turnos": req.turnos, escapeRoom, token});
        }
    } catch (e) {
        next(e);
    }
};

// GET /escapeRooms/:escapeRoomId/activarTurno
exports.indexActivarTurno = async (req, res, next) => {
    const {escapeRoom} = req;

    try {
        const turnos = await models.turno.findAll({"where": {"escapeRoomId": req.escapeRoom.id}, "order": [["date", "ASC"]]});

        res.render("turnos/_indexActivarTurno.ejs", {turnos, escapeRoom});
    } catch (e) {
        next(e);
    }
};

// PUT /escapeRooms/:escapeRoomId/activar
exports.activar = async (req, res, next) => {
    const {escapeRoom, body} = req;
    const back = `/escapeRooms/${escapeRoom.id}`;

    try {
        const turno = await models.turno.findByPk(body.turnSelected);

        if (turno.status === "pending") {
            turno.status = "active";
            turno.startTime = new Date();
        } else {
            turno.status = "finished";
        }

        await turno.save({"fields": ["startTime", "status"]});
        req.flash("success", turno.status === "active" ? "Turno activo." : "Turno desactivado");
        if (turno.status === "active") {
            startTurno(turno.id);
            res.redirect(`/escapeRooms/${escapeRoom.id}/turnos/${turno.id}/play`);
        } else {
            stopTurno(turno.id);
            res.redirect(`/escapeRooms/${escapeRoom.id}/analytics/ranking?turnId=${turno.id}`);
        }
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(back);
        } else {
            next(error);
        }
    }
};

// POST /escapeRooms/:escapeRoomId/turnos
exports.create = (req, res, next) => {
    const {date, place} = req.body;
    const modDate = date === "always" ? null : new Date(date);
    const turn = models.turno.build({
        "date": modDate,
        place,
        "status": date === "always" ? "active" : "pending",
        "escapeRoomId": req.escapeRoom.id
    });
    let back = "";

    if (date === "always") {
        back = `/escapeRooms/${req.escapeRoom.id}/turnos`;
    } else {
        back = `/escapeRooms/${req.escapeRoom.id}/turnos?date=${modDate.getFullYear()}-${modDate.getMonth() + 1}-${modDate.getDate()}`;
    }

    turn.save().
        then(() => {
            req.flash("success", req.app.locals.i18n.common.flash.successCreatingTurno);
            res.redirect(back);
        }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(back);
        }).
        catch((error) => {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorCreatingTurno}: ${error.message}`);
            next(error);
        });
};

// DELETE /escapeRooms/:escapeRoomId/turnos/:turnoId
exports.destroy = async (req, res, next) => {
    const modDate = new Date(req.turn.date);

    try {
        const date = req.turn.date ? `?date=${modDate.getFullYear()}-${modDate.getMonth() + 1}-${modDate.getDate()}` : "";
        const back = `/escapeRooms/${req.params.escapeRoomId}/turnos${date}`;

        await req.turn.destroy({});

        req.flash("success", req.app.locals.i18n.common.flash.successDeletingTurno);
        res.redirect(back);
    } catch (error) {
        next(error);
    }
};

// GET /escapeRooms/:escapeRoomId/turnos
exports.turnos = (req, res) => {
    const {escapeRoom} = req;
    const {turnos} = escapeRoom;

    res.render("escapeRooms/steps/turnos", {escapeRoom, turnos, "progress": "turnos"});
};

// POST /escapeRooms/:escapeRoomId/turnos
exports.turnosUpdate = (req, res /* , next*/) => {
    const {escapeRoom, body} = req;

    const isPrevious = Boolean(body.previous);
    const progressBar = body.progress;

    res.redirect(`/escapeRooms/${escapeRoom.id}/${isPrevious ? prevStep("turnos") : progressBar || nextStep("turnos")}`);
};
