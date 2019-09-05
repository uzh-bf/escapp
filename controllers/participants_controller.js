const {models} = require("../models");// Autoload the user with id equals to :userId
const {createCsvFile} = require("../helpers/csv");
const Sequelize = require("sequelize");
const {Op} = Sequelize;

// POST  /escapeRooms/:escapeRoomId/users/:userId/selectTurno
exports.selectTurno = (req, res) => {
    const {escapeRoom} = req;
    const direccion = req.body.redir || `/escapeRooms/${escapeRoom.id}/turnos/${req.body.turnSelected}/teams`;

    res.redirect(direccion);
};

// GET /escapeRooms/:escapeRoomId/participants
exports.index = (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId, orderBy} = query;
    const options = {
        "attributes": [
            "id",
            "name",
            "surname",
            "gender",
            "username",
            "dni"
        ],
        "include": [
            {
                "model": models.turno,
                "as": "turnosAgregados",
                "duplicating": false,
                "required": true,
                "attributes": [
                    "id",
                    "date"
                ],
                "where": {
                    "escapeRoomId": escapeRoom.id
                },
                "through": {"model": models.participants,
                    "attributes": ["attendance"]}
            },
            {
                "model": models.team,
                "as": "teamsAgregados",
                "duplicating": false,
                "required": true,
                "attributes": ["id"],
                "include": {
                    "model": models.turno,
                    "where": {
                        "escapeRoomId": escapeRoom.id
                    }
                }

            }
        ]
    };

    if (turnId) {
        options.include.where.id = turnId;
    }
    if (orderBy) {
        const isPg = process.env.DATABASE_URL;

        options.order = Sequelize.literal(isPg ? `lower("user"."${orderBy}") ASC` : `lower(user.${orderBy}) ASC`);
    }
    models.user.findAll(options).then((users) => {
        const participants = [];

        users.forEach((user) => {
            const {id, name, gender, username, surname, dni} = user;

            participants.push({id,
                name,
                surname,
                gender,
                username,
                dni,
                "teamId": user.teamsAgregados[0].id,
                "turnId": user.turnosAgregados[0].id,
                "turnDate": user.turnosAgregados[0].date,
                "attendance": user.turnosAgregados[0].participants.attendance});
        });
        if (req.query.csv) {
            createCsvFile(res, participants, "participants");
        } else {
            res.render("escapeRooms/participants", {escapeRoom,
                participants,
                turnId,
                orderBy});
        }
    }).
        catch((e) => next(e));
};

// POST /escapeRooms/:escapeRoomId/confirm
exports.confirmAttendance = (req, res) => {
    const turnos = req.escapeRoom.turnos.map((t) => t.id);

    models.participants.update({"attendance": true}, {
        "where": {
            [Op.and]: [
                {"turnId": {[Op.in]: turnos}},
                {"userId": {[Op.in]: req.body.attendance.yes}}
            ]
        }
    }).
        then(() => {
            models.participants.update({"attendance": false}, {
                "where": {
                    [Op.and]: [
                        {"turnId": {[Op.in]: turnos}},
                        {"userId": {[Op.in]: req.body.attendance.no}}
                    ]
                }
            }).then(() => {
                res.end();
            });
        }).
        catch(() => {
            res.status(500);
            res.end();
        });
};

// DELETE /escapeRooms/:escapeRoomId/turno/:turnId/team/:teamId
exports.studentLeave = (req, res) => {
    models.user.findByPk(req.session.user.id).then((user) => {
        req.team.removeTeamMember(user).then(() => {
            models.participants.findOne({"where": {"turnId": req.turn.id,
                "userId": req.session.user.id}}).
                then((participant) => {
                    participant.destroy().then(() => {
                        if (req.team.teamMembers.length <= 1) {
                            req.team.destroy().then(() => {
                                res.redirect("/");
                            });
                        } else {
                            res.redirect("/");
                        }
                    });
                });
        });
    });
};

// DELETE /escapeRooms/:escapeRoomId/turno/:turnId/team/:teamId/user/:userId
exports.studentDelete = async (req, res) => {
    await req.team.removeTeamMember(req.user);
    let participant = await models.participants.findOne({
        "where": {
            "turnId": req.turn.id,
            "userId": req.user.id
        }
    });
    participant.destroy().then(() => {
        console.log(req.team, "****************")
        if (req.team.teamMembers.length <= 1) {
            req.team.destroy().then(() => {
                res.redirect("/");
            });
        } else {
            res.redirect("/");
        }
    });
};
