const CONNECT = "connect";
const DISCONNECT = "disconnect";
const ERROR = "ERROR";
const RANKING = "RANKING";
const JOIN_TEAM = "JOIN_TEAM";
const JOIN_PARTICIPANT = "JOIN_PARTICIPANT";
const LEAVE_TEAM = "LEAVE_TEAM";
const LEAVE_PARTICIPANT = "LEAVE_PARTICIPANT";
const sort = () => {
	teams = teams.sort((a,b)=>{
		if (a.retos.length > b.retos.length) {
			return -1;
		} else if (a.retos.length < b.retos.length) {
			return 1;
		} else {
			if (a.latestRetoSuperado < b.latestRetoSuperado) {
				return -1;
			} else {
				return 1;
			}
		}
	});
    var top = 75;
    $.each(teams.map(t=>t.id), function(idx, id) {
        var el = $('.ranking-row#team-' + id);
        $('.ranking-row#team-' + id + " .ranking-pos").html(idx + 1);
        el.animate({
            position: 'absolute',
            top: top + 'px'
        }, {
        	duration: 1000
        });
        top += el.outerHeight() ;
    });
}

const secondsToDhms = function (secs) {
    const seconds = Number(secs);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);

    const dDisplay = d > 0 ? `${d}d` : "";
    const hDisplay = h > 0 ? `${h}h` : "";
    const mDisplay = m > 0 ? `${m}m` : "";
    const sDisplay = s > 0 ? `${s}s` : "";

    return [
        dDisplay,
        hDisplay,
        mDisplay,
        sDisplay
    ].filter((a) => a !== "").join(", ");
};

const initSocketServer = (escapeRoomId, teamId, turnId) => {
  sort();	
  socket = io('/', {query: {escapeRoom: escapeRoomId || undefined, team: teamId || undefined, turn: turnId || undefined }});
  
  /*Connect*/
  socket.on(CONNECT, function(){
  	console.log("Connected to socket server");
  });

  /*Error*/
  socket.on(ERROR, function({msg}){
    console.error(msg);
  });

  socket.on(RANKING, function({teamId, puzzleId, time}){
  	const team = teams.find(team => team.id == teamId);
    	if (team) {
      const reto = team.retos.find(reto => reto.id === puzzleId);
      
  		if (!reto) {
  			team.retos = [...team.retos, {id: puzzleId, date: time}];
  			team.result = team.retos.length + "/" + nPuzzles;
  			team.latestRetoSuperado = time;
  			$('#team-' + teamId + " .ranking-res").html(team.result);
  			if (team.retos.length == nPuzzles) {
  				team.finishTime = secondsToDhms((new Date(time) - new Date(team.startTime))/1000);
  				$('#team-' + teamId +" .ranking-time").html(team.finishTime);
  			}
  			sort();
        
        if ($('#podium').length) {
          $('#podium').html(podium(teams));
          $("#podium . podium").addClass("started");
        }
      }
    }
  });

  socket.on(JOIN_TEAM, function({team}){
    const exists = teams.find(t => t.id == team.id);
    	if (!exists) {
        let count = 0;
        let retos = [];
        let result = "0/" + nPuzzles;
        teams.push({...team, result, count, retos});
        $('ranking').html(rankingTemplate(teams, teamId));
        sort();
      }
  });

  socket.on(JOIN_PARTICIPANT,function({team}){
    const index = teams.findIndex(t => t.id === team.id);
    if (index > -1) {
      const {teamMembers, participants} = team;
      teams[index].teamMembers = teamMembers;
      teams[index].participants = participants;
      $('ranking').html(rankingTemplate(teams, teamId));
      sort();
    }
  });

  socket.on(LEAVE_TEAM,  function ({team}) {
    const index = teams.findIndex(t => t.id === team.id);
    if (index > -1) {
      teams.splice(index, 1);
      $('ranking').html(rankingTemplate(teams, teamId));
      sort();
    }
  });
  
  socket.on(LEAVE_PARTICIPANT,  function ({team}) {
    const foundTeam = teams.find(t => t.id === team.id);
    if (foundTeam) {
      const {teamMembers, participants} = team;
      foundTeam.teamMembers = teamMembers;
      foundTeam.participants = participants;
      $('ranking').html(rankingTemplate(teams, teamId));
      sort();
    }
  });

};

