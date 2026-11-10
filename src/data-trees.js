/* Skill categories and skill-tree definitions.
 * Each tree: 4 branches (rows) x 3 nodes, plus one boss node.
 * Node fields:
 *   id, name, short (map label), purpose
 *   req: prerequisite node ids; need: how many of req must be satisfied (default 1)
 *   goal: highest evidence tier the node asks for: 'benchmark' | 'pressure' | 'game'
 *   x: cross-tree connected nodes (informational, never a hard requirement)
 */
(function (MX) {
  MX.SKILLS = {
    fin: { name: 'Finishing', short: 'FIN', icon: 'rim', color: '#3D8BFF' },
    sht: { name: 'Shooting', short: 'SHT', icon: 'target', color: '#29C5F6' },
    bh: { name: 'Ball handling', short: 'BH', icon: 'ball', color: '#7AA7FF' },
    sep: { name: 'Creating separation', short: 'SEP', icon: 'bolt', color: '#4FE0D2' },
    iq: { name: 'Playmaking & IQ', short: 'IQ', icon: 'eye', color: '#A9B8FF' },
    def: { name: 'Defense', short: 'DEF', icon: 'shield', color: '#5AA0E6' },
    cond: { name: 'Conditioning', short: 'CON', icon: 'pulse', color: '#66D9FF' },
    str: { name: 'Strength & explosiveness', short: 'STR', icon: 'iron', color: '#8FC4FF' }
  };
  MX.SKILL_KEYS = Object.keys(MX.SKILLS);

  function tree(key, branches, boss) {
    const nodes = [];
    branches.forEach(function (br, row) {
      br.nodes.forEach(function (n, col) {
        nodes.push(Object.assign({ tree: key, branch: br.name, row: row, col: col, need: 1, req: [], x: [] }, n,
          { id: key + '.' + n.id }));
      });
    });
    nodes.forEach(function (n) { n.req = n.req.map(function (r) { return r.indexOf('.') > 0 ? r : key + '.' + r; }); });
    const b = Object.assign({ tree: key, branch: 'Boss', row: branches.length, col: 1, boss: true, goal: 'benchmark', x: [] }, boss,
      { id: key + '.boss' });
    b.req = b.req.map(function (r) { return key + '.' + r; });
    nodes.push(b);
    return { key: key, branches: branches.map(function (b) { return { name: b.name, blurb: b.blurb }; }).concat([{ name: 'Boss', blurb: 'Milestone challenge' }]), nodes: nodes };
  }

  MX.TREES = [
    tree('fin', [
      { name: 'Foundation', blurb: 'Reliable finishes with both hands and balanced feet.', nodes: [
        { id: 'a1', name: 'Strong-hand consistency', short: 'Strong hand', goal: 'benchmark', purpose: 'Make routine strong-hand finishes automatic so you stop missing the "easy" ones after you beat your man.' },
        { id: 'a2', name: 'Weak-hand consistency', short: 'Weak hand', goal: 'benchmark', purpose: 'Finish with the off hand so help defenders cannot force you to one side.' },
        { id: 'a3', name: 'Footwork and balance', short: 'Footwork', goal: 'benchmark', purpose: 'Gather and take off under control (1-2, jump stop, euro, pro-hop) so speed does not wreck the finish.' }
      ] },
      { name: 'Touch', blurb: 'Soft finishes that avoid length at the rim.', nodes: [
        { id: 'b1', name: 'Floaters', short: 'Floaters', req: ['a1'], goal: 'benchmark', x: ['sep.c3'], purpose: 'Score over a rim protector from 6–10 feet without needing to reach the basket.' },
        { id: 'b2', name: 'Inside-hand finishes', short: 'Inside hand', req: ['a2', 'a3'], goal: 'benchmark', purpose: 'Use the hand closest to the defender with control to finish around their body.' },
        { id: 'b3', name: 'Reverse finishes', short: 'Reverses', req: ['a3'], goal: 'benchmark', purpose: 'Use the rim as protection when a shot blocker is coming from the front side.' }
      ] },
      { name: 'Contact finishing', blurb: 'Stay balanced, protect the ball and finish through legal, controlled contact.', nodes: [
        { id: 'e1', name: 'Balance and body control', short: 'Body control', req: ['a3'], goal: 'benchmark', x: ['str.a3', 'str.b1'], purpose: 'Gather on a wide, braced base and keep your balance and the ball when you are knocked slightly off your line.' },
        { id: 'e2', name: 'Finishing through controlled contact', short: 'Through contact', req: ['e1'], goal: 'pressure', x: ['str.d2'], purpose: 'Absorb a controlled bump at the gather and still finish with the correct hand, instead of fading away or avoiding the rim.' },
        { id: 'e3', name: 'Contact finishing in live play', short: 'Live contact', req: ['e2'], goal: 'game', purpose: 'Finish through real, legal contact in practices and games, and earn and-ones and free throws.' }
      ] },
      { name: 'Applied finishing', blurb: 'Finishing at speed, from angles, against bodies.', nodes: [
        { id: 'c1', name: 'Finishing from different angles', short: 'Angles', req: ['a1', 'a2'], goal: 'pressure', purpose: 'Finish from the slot, wing, corner and baseline at game speed, not just straight-on.' },
        { id: 'c2', name: 'Finishing against recovering defenders', short: 'Vs recovery', req: ['b1', 'b2', 'a3'], goal: 'pressure', x: ['sep.b2'], purpose: 'Protect the ball and pick the right hand when the defender you beat is chasing your hip.' },
        { id: 'c3', name: 'Reading shot blockers', short: 'Read blocker', req: ['b1', 'b3'], goal: 'pressure', purpose: 'Decide early between floater, rim finish or reverse based on what the big does.' }
      ] },
      { name: 'Game mastery', blurb: 'Finishing that shows up in real games.', nodes: [
        { id: 'd1', name: 'Finishing decisions under pressure', short: 'Pressure calls', req: ['c2', 'c3'], goal: 'game', purpose: 'Choose the right finish in the half-second you actually get in a game.' },
        { id: 'd2', name: 'Selecting finishes in live play', short: 'Finish menu', req: ['c1', 'c3'], goal: 'game', purpose: 'Use your full finishing menu in live play instead of forcing one move.' },
        { id: 'd3', name: 'Consistent application against defenders', short: 'Consistency', req: ['c1', 'c2'], goal: 'game', purpose: 'Finish at a steady rate against real defenders across many games.' }
      ] }
    ], { name: 'Boss: The Finishing Gauntlet', short: 'Gauntlet', req: ['c1', 'c2', 'c3', 'e2'], need: 2, purpose: 'A standardized finishing test across angles, hands and finish types. Clearing it shows your finishing holds up when the menu is mixed.' })
  ];

  MX.TREES.push(
    tree('sht', [
      { name: 'Foundation', blurb: 'A repeatable shot and balanced base.', nodes: [
        { id: 'a1', name: 'Mechanics and repeatability', short: 'Mechanics', goal: 'benchmark', purpose: 'Build one repeatable release so your misses become small and predictable.' },
        { id: 'a2', name: 'Catch-and-shoot consistency', short: 'Catch & shoot', goal: 'benchmark', purpose: 'Knock down open catches, which is most of the shots a driving guard creates for himself and teammates.' },
        { id: 'a3', name: 'Balance and footwork', short: 'Feet', goal: 'benchmark', purpose: 'Use 1-2 steps and hops to arrive balanced from any direction.' }
      ] },
      { name: 'Movement', blurb: 'Shooting on the move and off the bounce.', nodes: [
        { id: 'b1', name: 'Shooting off movement', short: 'On the move', req: ['a2', 'a3'], goal: 'benchmark', purpose: 'Stay accurate after relocating, coming off screens or sprinting into a shot.' },
        { id: 'b2', name: 'One- and two-dribble pull-ups', short: 'Pull-ups', req: ['a1', 'a3'], goal: 'benchmark', x: ['bh.b2', 'sep.c1'], purpose: 'Stop on a dime and rise into a balanced pull-up off one or two dribbles.' },
        { id: 'b3', name: 'Change-of-pace pull-ups', short: 'Pace pull-up', req: ['b2'], goal: 'pressure', x: ['sep.b3'], purpose: 'Use a hesitation or speed change to freeze the defender, then rise. The Maxey-style weapon.' }
      ] },
      { name: 'Pressure', blurb: 'Shooting with a defender and a clock.', nodes: [
        { id: 'c1', name: 'Shooting against closeouts', short: 'Closeouts', req: ['a2', 'b1'], goal: 'pressure', x: ['def.a2'], purpose: 'Shoot through a hard closeout without rushing or fading.' },
        { id: 'c2', name: 'Quick decision-making', short: 'Shoot or go', req: ['b1', 'b2'], goal: 'pressure', x: ['iq.c1'], purpose: 'Decide shoot, drive or pass on the catch instead of holding the ball.' },
        { id: 'c3', name: 'Shooting after game-like movement', short: 'Tired legs', req: ['a2'], goal: 'pressure', x: ['cond.b3'], purpose: 'Keep your shot when your legs are tired, like late in a quarter.' }
      ] },
      { name: 'Game mastery', blurb: 'Shot quality and makes in games.', nodes: [
        { id: 'd1', name: 'Appropriate shot selection', short: 'Shot selection', req: ['c2'], goal: 'game', purpose: 'Take the shots you make in practice and pass up the ones you do not.' },
        { id: 'd2', name: 'Creating and converting quality looks', short: 'Quality looks', req: ['c1', 'c2'], goal: 'game', purpose: 'Generate open looks for yourself and knock them down.' },
        { id: 'd3', name: 'Demonstrated application in games', short: 'Game shooting', req: ['c1', 'c3'], goal: 'game', purpose: 'Your practice shooting translates to games across several outings.' }
      ] }
    ], { name: 'Boss: Standardized Shooting Test', short: 'Shot test', req: ['b1', 'b2', 'c1', 'c2', 'c3'], need: 2, purpose: 'Fifty shots under fixed rules: catch-and-shoot, pull-ups and a fatigue block. Same test every time so the number means something.' }),

    tree('bh', [
      { name: 'Foundation', blurb: 'Control with both hands, eyes up.', nodes: [
        { id: 'a1', name: 'Two-hand control', short: 'Both hands', goal: 'benchmark', purpose: 'Handle equally with both hands at different heights and speeds.' },
        { id: 'a2', name: 'Eyes-up handling', short: 'Eyes up', goal: 'benchmark', purpose: 'See the floor while dribbling so you can read help and find teammates.' },
        { id: 'a3', name: 'Protecting the ball', short: 'Protect', goal: 'benchmark', purpose: 'Keep your body between the defender and the ball, with an arm bar and low dribble.' }
      ] },
      { name: 'Moves', blurb: 'Moves with a purpose at real speed.', nodes: [
        { id: 'b1', name: 'Crossovers and between-the-legs at speed', short: 'Speed moves', req: ['a1'], goal: 'benchmark', purpose: 'Change direction at speed without slowing down to set up the move.' },
        { id: 'b2', name: 'Hesitation and retreat dribble', short: 'Hesi & retreat', req: ['a1', 'a3'], goal: 'benchmark', x: ['sep.a2', 'sht.b2'], purpose: 'Freeze defenders with a hesi and escape traps with a retreat dribble.' },
        { id: 'b3', name: 'Speed dribble in transition', short: 'Speed dribble', req: ['a2'], goal: 'benchmark', x: ['cond.c2'], purpose: 'Push the ball up the floor in few dribbles with your eyes up.' }
      ] },
      { name: 'Pressure', blurb: 'Handling against hands, bodies and traps.', nodes: [
        { id: 'c1', name: 'Handling against pressure', short: 'Vs pressure', req: ['a3', 'b2'], goal: 'pressure', purpose: 'Keep your dribble alive and under control when a defender is in your body.' },
        { id: 'c2', name: 'Reactive handling with decisions', short: 'Reactive', req: ['a2', 'b1'], goal: 'pressure', purpose: 'Dribble while reacting to cues, like real defenders and help.' },
        { id: 'c3', name: 'Breaking full-court pressure', short: 'Press break', req: ['b3'], goal: 'pressure', x: ['def.b3'], purpose: 'Get the ball past half court against a pressing defender without panic.' }
      ] },
      { name: 'Game mastery', blurb: 'Taking care of the ball in real games.', nodes: [
        { id: 'd1', name: 'Low turnovers under pressure', short: 'Low TOs', req: ['c1', 'c3'], goal: 'game', purpose: 'Handle pressure in games without giving the ball away.' },
        { id: 'd2', name: 'Handle into shot or drive', short: 'Handle to score', req: ['c1', 'c2'], goal: 'game', x: ['sep.d3'], purpose: 'Your dribble moves lead somewhere: a drive, a pull-up or a pass.' },
        { id: 'd3', name: 'Running the offense under pressure', short: 'Run the team', req: ['c2', 'c3'], goal: 'game', x: ['iq.d2'], purpose: 'Bring the ball up and get your team into offense calmly.' }
      ] }
    ], { name: 'Boss: Pressure Handle Test', short: 'Handle test', req: ['c1', 'c2', 'c3'], need: 2, purpose: 'A timed cone gauntlet with a zero-turnover rule (or live full-court keep-away with a partner).' }),

    tree('sep', [
      { name: 'First step', blurb: 'Win the first two steps.', nodes: [
        { id: 'a1', name: 'Initial advantage creation', short: 'First step', goal: 'benchmark', purpose: 'Turn your quickness into a real advantage in the first two steps.' },
        { id: 'a2', name: 'Change-of-pace attacks', short: 'Change pace', goal: 'benchmark', x: ['bh.b2'], purpose: 'Use slow-to-fast speed changes so defenders cannot time your first step.' },
        { id: 'a3', name: 'Attacking defender positioning', short: 'Attack feet', goal: 'benchmark', purpose: 'Read the defender\'s lead foot and hips and attack the side they cannot cover.' }
      ] },
      { name: 'Advantage maintenance', blurb: 'Keep the advantage after you get it.', nodes: [
        { id: 'b1', name: 'Maintaining a driving line', short: 'Drive line', req: ['a1'], goal: 'benchmark', purpose: 'Get your shoulder past the defender\'s hip and stay on a straight line to the rim.' },
        { id: 'b2', name: 'Responding to defensive recovery', short: 'Vs recovery', req: ['a1', 'a3'], goal: 'pressure', x: ['fin.c2'], purpose: 'When the defender recovers, adjust (seal, stop, re-angle) instead of losing the advantage.' },
        { id: 'b3', name: 'Changing speeds after gaining an advantage', short: 'Speed shift', req: ['a2'], goal: 'benchmark', x: ['sht.b3'], purpose: 'Slow down or speed up after the first step to keep the defender off balance.' }
      ] },
      { name: 'Shot creation', blurb: 'Turn an advantage into a shot.', nodes: [
        { id: 'c1', name: 'Creating pull-up space', short: 'Pull-up space', req: ['a2', 'b3'], goal: 'pressure', x: ['sht.b2', 'bh.b2'], purpose: 'Use the threat of the drive to create room for a clean pull-up.' },
        { id: 'c2', name: 'Using stops and direction changes', short: 'Stops', req: ['b1', 'b3'], goal: 'pressure', purpose: 'Use hard stops and re-directions to make the defender overrun you.' },
        { id: 'c3', name: 'Reading defensive positioning', short: 'Read D', req: ['a3', 'b2'], goal: 'pressure', x: ['iq.b1', 'fin.b1'], purpose: 'Read where the help and your defender are to pick drive, stop or pass.' }
      ] },
      { name: 'Game mastery', blurb: 'Separation that works on real defenders.', nodes: [
        { id: 'd1', name: 'Creating useful advantages against live defenders', short: 'Live advantage', req: ['c2', 'c3'], goal: 'game', purpose: 'Beat real defenders in games in a way that leads to a good chance.' },
        { id: 'd2', name: 'Correct decisions after separation', short: 'Next decision', req: ['c1', 'c3'], goal: 'game', x: ['iq.c1'], purpose: 'After you gain space, make the right play: shoot, finish, or pass.' },
        { id: 'd3', name: 'Applying separation in competitive play', short: 'In games', req: ['c1', 'c2'], goal: 'game', purpose: 'Your separation skills show up consistently in competitive games.' }
      ] }
    ], { name: 'Boss: Keep the Advantage', short: 'Keep it', req: ['b2', 'c1', 'c2', 'c3'], need: 2, purpose: 'Ten possessions starting from a small advantage against a live defender (or a timed solo standard). Can you keep it and convert it?' }),

    tree('iq', [
      { name: 'Vision', blurb: 'See the floor and deliver the ball.', nodes: [
        { id: 'a1', name: 'Reading help defense', short: 'See help', goal: 'benchmark', purpose: 'Spot where the help is coming from before you get there.' },
        { id: 'a2', name: 'Passing accuracy on the move', short: 'Move passes', goal: 'benchmark', purpose: 'Deliver on-target passes with either hand while moving.' },
        { id: 'a3', name: 'Pocket and drive-and-kick passes', short: 'Kick passes', goal: 'benchmark', purpose: 'Hit the open shooter or roller when your drive draws help.' }
      ] },
      { name: 'Decisions', blurb: 'Read the play correctly.', nodes: [
        { id: 'b1', name: 'Advantage reads (2v1, 3v2)', short: 'Numbers', req: ['a1'], goal: 'pressure', x: ['sep.c3'], purpose: 'Make the right play when your team has a numbers advantage.' },
        { id: 'b2', name: 'Pick-and-roll reads', short: 'PnR reads', req: ['a1', 'a3'], goal: 'benchmark', purpose: 'Know your options against each common screen coverage.' },
        { id: 'b3', name: 'Tempo and pace control', short: 'Tempo', req: ['a2'], goal: 'benchmark', purpose: 'Know when to push and when to slow down and organize.' }
      ] },
      { name: 'Pressure', blurb: 'Fast decisions with defenders closing.', nodes: [
        { id: 'c1', name: 'Quick decisions under a clock', short: 'Quick reads', req: ['b1'], goal: 'pressure', x: ['sht.c2'], purpose: 'Decide in under a second on the catch or as help arrives.' },
        { id: 'c2', name: 'Passing against pressure', short: 'Pass vs D', req: ['b2', 'a3'], goal: 'pressure', purpose: 'Complete passes around active hands and hedging bigs.' },
        { id: 'c3', name: 'Transition decision-making', short: 'Transition', req: ['b3', 'b1'], goal: 'pressure', purpose: 'Make good choices in the open floor at full speed.' }
      ] },
      { name: 'Game mastery', blurb: 'Decision-making that shows up in games.', nodes: [
        { id: 'd1', name: 'Assist-to-turnover discipline', short: 'Ast:TO', req: ['c1', 'c2'], goal: 'game', purpose: 'Create for others without giving the ball away.' },
        { id: 'd2', name: 'Running sets and communication', short: 'Lead', req: ['c2', 'c3'], goal: 'game', purpose: 'Get the team into sets, call actions and talk on the floor.' },
        { id: 'd3', name: 'Late-game decisions', short: 'Late game', req: ['c1', 'c3'], goal: 'game', purpose: 'Make sound decisions in close, late possessions.' }
      ] }
    ], { name: 'Boss: Decision Exam', short: 'Exam', req: ['b1', 'c1', 'c2', 'c3'], need: 2, purpose: 'Pause-and-predict twenty possessions of game film (solo), or a scored 3v2 decision test with teammates.' }),

    tree('def', [
      { name: 'Foundation', blurb: 'Stance, slides and closeouts.', nodes: [
        { id: 'a1', name: 'Stance and slide mechanics', short: 'Slides', goal: 'benchmark', purpose: 'Stay low and balanced with feet that never cross while sliding.' },
        { id: 'a2', name: 'Closeout technique', short: 'Closeouts', goal: 'benchmark', x: ['sht.c1'], purpose: 'Sprint, chop, and arrive balanced with a high hand.' },
        { id: 'a3', name: 'Hip turn and recovery run', short: 'Hip turn', goal: 'benchmark', purpose: 'Open your hips and run to recover when the ball-handler gets by you.' }
      ] },
      { name: 'On-ball', blurb: 'Guarding the ball.', nodes: [
        { id: 'b1', name: 'Containing the drive', short: 'Contain', req: ['a1', 'a3'], goal: 'pressure', purpose: 'Keep the ball in front and force it where your team wants.' },
        { id: 'b2', name: 'Active hands without fouling', short: 'Clean hands', req: ['a1'], goal: 'benchmark', purpose: 'Pressure the ball and dig at it with discipline, no reaching.' },
        { id: 'b3', name: 'Full-court ball pressure', short: 'Pick up full', req: ['a3'], goal: 'benchmark', x: ['cond.b2'], purpose: 'Turn the ball-handler and wear down their time.' }
      ] },
      { name: 'Team defense', blurb: 'Help, screens and rotations.', nodes: [
        { id: 'c1', name: 'Help-side positioning', short: 'Help side', req: ['a2'], goal: 'pressure', purpose: 'Be in the right spot off the ball to stop drives before they start.' },
        { id: 'c2', name: 'Closeout to contain', short: 'Close & contain', req: ['a2', 'b1'], goal: 'pressure', purpose: 'Close out without getting blown by.' },
        { id: 'c3', name: 'Navigating screens', short: 'Screens', req: ['b1', 'b3'], goal: 'pressure', purpose: 'Get over, under, or ice screens as your team calls it.' }
      ] },
      { name: 'Game mastery', blurb: 'Defense that shows up in games.', nodes: [
        { id: 'd1', name: 'Stops on your assignment', short: 'Stops', req: ['c2', 'c3'], goal: 'game', purpose: 'Get stops on the player you are guarding in real games.' },
        { id: 'd2', name: 'Communication and rotations', short: 'Talk', req: ['c1'], goal: 'game', purpose: 'Talk and rotate so the team defense holds together.' },
        { id: 'd3', name: 'Disruption without fouls', short: 'Disrupt', req: ['c1', 'c3'], goal: 'game', purpose: 'Create deflections and turnovers while staying out of foul trouble.' }
      ] }
    ], { name: 'Boss: Lockdown Test', short: 'Lockdown', req: ['b1', 'c1', 'c2', 'c3'], need: 2, purpose: 'Ten 1v1 contain possessions from a closeout (or a timed solo slide standard with technique checks).' }),

    tree('cond', [
      { name: 'Base', blurb: 'Aerobic base and pacing.', nodes: [
        { id: 'a1', name: 'Aerobic base', short: 'Base', goal: 'benchmark', purpose: 'A base that helps you recover between possessions and between days.' },
        { id: 'a2', name: 'Pace awareness', short: 'Pacing', goal: 'benchmark', purpose: 'Know what 60%, 75% and 90% effort feel like, and choose on purpose.' },
        { id: 'a3', name: 'Recovering between efforts', short: 'Reset', goal: 'benchmark', purpose: 'Bring your breathing down fast during dead balls and timeouts.' }
      ] },
      { name: 'Basketball endurance', blurb: 'Repeat the efforts basketball asks for.', nodes: [
        { id: 'b1', name: 'Repeated sprint and recover', short: 'Repeat sprint', req: ['a1'], goal: 'benchmark', purpose: 'Hit hard efforts again and again with short rest.' },
        { id: 'b2', name: 'Defensive slide endurance', short: 'Slide engine', req: ['a1', 'a3'], goal: 'benchmark', x: ['def.b3'], purpose: 'Keep your stance and slides late in possessions.' },
        { id: 'b3', name: 'Skill under fatigue', short: 'Tired skill', req: ['a3'], goal: 'pressure', x: ['sht.c3'], purpose: 'Keep your shot and handle when your heart rate is high.' }
      ] },
      { name: 'Game demands', blurb: 'Handling game and week demands.', nodes: [
        { id: 'c1', name: 'Fourth-quarter quality', short: '4th quarter', req: ['b3'], goal: 'pressure', purpose: 'Execute late in games as well as early.' },
        { id: 'c2', name: 'Transition both ways', short: 'Both ways', req: ['b1'], goal: 'pressure', x: ['bh.b3'], purpose: 'Run the floor on offense and get back on defense every time.' },
        { id: 'c3', name: 'Load-management habits', short: 'Load habits', req: ['a2'], goal: 'benchmark', purpose: 'Use readiness checks and recovery so you are fresh when it counts.' }
      ] },
      { name: 'Game mastery', blurb: 'Your engine in real games.', nodes: [
        { id: 'd1', name: 'Sustaining intensity through games', short: 'Full game', req: ['c1', 'c2'], goal: 'game', purpose: 'Play hard every possession without long fades.' },
        { id: 'd2', name: 'Tournament readiness', short: 'Tournaments', req: ['c3', 'c2'], goal: 'game', purpose: 'Play well across multiple games in a weekend.' },
        { id: 'd3', name: 'Late-game execution under fatigue', short: 'Late & tired', req: ['c1'], goal: 'game', x: ['sht.d3'], purpose: 'Make plays late in games when you are tired.' }
      ] }
    ], { name: 'Boss: Court Engine Test', short: 'Engine', req: ['b1', 'b2', 'b3', 'c1', 'c2'], need: 2, purpose: 'Six rounds of controlled lane runs followed by free throws. Measures whether your skill holds when you are working hard.' }),

    tree('str', [
      { name: 'Foundation', blurb: 'Own the basic movement patterns.', nodes: [
        { id: 'a1', name: 'Squat pattern', short: 'Squat', goal: 'benchmark', purpose: 'Squat with good depth, knees tracking over toes and a braced trunk.' },
        { id: 'a2', name: 'Hinge pattern', short: 'Hinge', goal: 'benchmark', purpose: 'Bend from the hips with a neutral back. The base for jumping and landing.' },
        { id: 'a3', name: 'Core stability and bracing', short: 'Core', goal: 'benchmark', purpose: 'Resist twisting and arching so force transfers through your body.' }
      ] },
      { name: 'Strength', blurb: 'Balanced, gradual strength.', nodes: [
        { id: 'b1', name: 'Single-leg control', short: 'Single leg', req: ['a1'], goal: 'benchmark', purpose: 'Control your knee and hip on one leg, like every drive and landing.' },
        { id: 'b2', name: 'Upper-body push and pull balance', short: 'Push / pull', req: ['a3'], goal: 'benchmark', purpose: 'Build balanced upper-body strength for contact and ball protection.' },
        { id: 'b3', name: 'Loaded lower-body strength', short: 'Loaded legs', req: ['a1', 'a2'], need: 2, goal: 'benchmark', purpose: 'Add gradual load to squat and hinge patterns once technique is consistent.' }
      ] },
      { name: 'Explosiveness', blurb: 'Accelerate, jump and land, stop and change direction with control.', nodes: [
        { id: 'c1', name: 'Jumping and landing mechanics', short: 'Jump & land', req: ['a1', 'b1'], goal: 'benchmark', x: ['fin.e1'], purpose: 'Take off with a good hip hinge and arm swing, and land quietly with knees tracking over toes. The base for safe jumping, rebounding and finishing.' },
        { id: 'c2', name: 'Acceleration mechanics', short: 'Accelerate', req: ['a3', 'b1'], goal: 'benchmark', x: ['sep.a1'], purpose: 'Use forward lean and powerful pushes to start fast from a basketball stance. Your first step, trained as a skill.' },
        { id: 'c3', name: 'Deceleration and change of direction', short: 'Stop & cut', req: ['c1'], goal: 'benchmark', x: ['sep.c2', 'def.a3'], purpose: 'Stop in a few controlled steps with hips low, then plant and redirect. This is how quick guards create and keep separation without wrecking their knees.' }
      ] },
      { name: 'Applied athleticism', blurb: 'Power and strength in a basketball context.', nodes: [
        { id: 'd1', name: 'Low-volume power', short: 'Power', req: ['c1'], goal: 'benchmark', purpose: 'Small doses of jumps, approach jumps and throws done with full intent and perfect landings. Quality over volume.' },
        { id: 'd2', name: 'Strength through contact', short: 'Contact', req: ['b2', 'b3'], goal: 'pressure', x: ['fin.c2', 'fin.e2'], purpose: 'Stay balanced and finish through a bump.' },
        { id: 'd3', name: 'Game-speed movement', short: 'Game speed', req: ['c2', 'c3'], goal: 'game', purpose: 'You feel your movement quality in games. Self-reported, not a measured speed gain.' }
      ] }
    ], { name: 'Boss: Movement Quality Screen', short: 'Screen', req: ['b1', 'c1', 'c3'], need: 2, purpose: 'A technique screen: controlled single-leg work and stuck landings on both sides. It checks quality, not maximal strength.' })
  );

  MX.NODES = {};
  MX.TREES.forEach(function (t) { t.nodes.forEach(function (n) { MX.NODES[n.id] = n; }); });
  MX.TREE = {};
  MX.TREES.forEach(function (t) { MX.TREE[t.key] = t; });
})(globalThis.MX = globalThis.MX || {});
