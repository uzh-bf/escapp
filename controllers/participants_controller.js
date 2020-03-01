const {models} = require("../models");// Autoload the user with id equals to :userId
const {createCsvFile} = require("../helpers/csv");
const Sequelize = require("sequelize");
const {Op} = Sequelize;
const queries = require("../queries");

// POST  /escapeRooms/:escapeRoomId/users/:userId/selectTurno
exports.selectTurno = (req, res) => {
    const {escapeRoom} = req;
    const direccion = req.body.redir || `/escapeRooms/${escapeRoom.id}/turnos/${req.body.turnSelected}/teams`;

    res.redirect(direccion);
};

// GET /escapeRooms/:escapeRoomId/participants
exports.index = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId, orderBy} = query;

    try {
        const users = await models.user.findAll(queries.user.participantsWithTurnoAndTeam(escapeRoom.id, turnId, orderBy));
        const participants = [];

        users.forEach((user) => {
            const {id, name, gender, username, surname, dni, teamsAgregados, turnosAgregados} = user;
            const [{"id": turnoId, "date": turnDate, "participants": parts}] = turnosAgregados;
            const [{"id": teamId}] = teamsAgregados;
            const {attendance} = parts;

            participants.push({id,
                name,
                surname,
                gender,
                username,
                dni,
                teamId,
                turnoId,
                turnDate,
                attendance});
        });
        if (req.query.csv) {
            createCsvFile(res, participants, "participants");
        } else {
            res.render("escapeRooms/participants", {escapeRoom,
                participants,
                turnId,
                orderBy});
        }
    } catch (e) {
        next(e);
    }
};

// POST /escapeRooms/:escapeRoomId/confirm
exports.confirmAttendance = async (req, res) => {
    const turnos = req.escapeRoom.turnos.map((t) => t.id);

    try {
        await models.participants.update({"attendance": true}, {
            "where": {
                [Op.and]: [
                    {"turnId": {[Op.in]: turnos}},
                    {"userId": {[Op.in]: req.body.attendance.yes}}
                ]
            }
        });
        await models.participants.update({"attendance": false}, {
            "where": {
                [Op.and]: [
                    {"turnId": {[Op.in]: turnos}},
                    {"userId": {[Op.in]: req.body.attendance.no}}
                ]
            }
        });
        await res.end();
    } catch (e) {
        res.status(500);
        res.end();
    }
};

// DELETE /escapeRooms/:escapeRoomId/turno/:turnId/team/:teamId
// DELETE /escapeRooms/:escapeRoomId/turno/:turnId/team/:teamId/user/:userId
exports.studentLeave = async (req, res, next) => {
    let {user} = req;
    const {turn} = req;
    let redirectUrl = `/escapeRooms/${req.escapeRoom.id}/participants`;

    try {
        // TODO También echar si el turno no está con status pending
        if (req.user && req.user.id !== req.session.user.id && req.session.user.isStudent) {
            // If it's not myself and I am not a teacher
            res.redirect("back");
            return;
        } else if (!req.user && req.session.user.isStudent) {
            if (req.turn.status !== "pending") {
                req.flash("error", `${req.app.locals.i18n.common.flash.errorStudentLeave}`);
                res.redirect("/");
                return;
            }
            user = await models.user.findByPk(req.session.user.id);
        }
        const userId = user.id;
        const turnId = turn.id;


        await req.team.removeTeamMember(user);
        const participant = await models.participants.findOne({"where": {turnId,
            userId}});

        await participant.destroy();
        if (req.session.user.isStudent) {
            redirectUrl = `/users/${req.session.user.id}/escapeRooms`;
        }

        if (req.team.teamMembers.length <= 1) {
            await req.team.destroy();
            res.redirect(redirectUrl);
        } else {
            res.redirect(redirectUrl);
        }
    } catch (e) {
        next(e);
    }
};
