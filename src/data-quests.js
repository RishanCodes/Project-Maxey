/* Basketball quest library.
 * space: 'court' (gym/half court with hoop) | 'hoop' (any hoop, incl. driveway) | 'home' (no hoop) | 'field' (open space to run)
 * partner: 0 solo, 1 helper (passer/rebounder/pad), 2 live defender or teammates
 * stage: 1 technique, 2 applied (movement, variability, decisions, pressure), 3 game application
 * load: 0 recovery, 1 light, 2 moderate, 3 hard. legs: lower-body stress for scheduling.
 * measure.kind: 'makes' (successes/attempts), 'rating' (1-5 quality), 'done' (completion only)
 * bench: per-session score that counts as a benchmark hit (makes/attempts, or rating/5)
 */
(function (MX) {
  const Q = [];
  function q(o) {
    Q.push(Object.assign({
      type: 'skill', stage: 1, diff: 2, dur: 15, space: 'court', partner: 0, load: 1, legs: 'none',
      skills: null, nodes: [], bench: 0.7, measure: { kind: 'makes', label: 'Makes', of: 'Attempts', att: 20 }
    }, o));
  }
  const M = function (label, of, att) { return { kind: 'makes', label: label, of: of, att: att }; };
  const R = function (label) { return { kind: 'rating', label: label || 'Quality of reps' }; };
  const DONE = { kind: 'done', label: 'Completed' };

  /* ---------------- FINISHING ---------------- */
  q({ id: 'fin-mikan', name: 'Mikan & Reverse Mikan Series', skill: 'fin', nodes: ['fin.a1', 'fin.a2', 'fin.a3', 'fin.b3'], diff: 1, dur: 10, space: 'hoop',
    measure: M('Makes', 'Attempts', 40), bench: 0.8,
    steps: ['10 regular Mikans each side, off the correct foot, ball high.', '10 reverse Mikans each side using the rim to protect.', 'Finish with your eyes on the target square, not the ball.', 'Count every attempt honestly, including rushed ones.'],
    purpose: 'Grooves touch, footwork and both-hand finishing at the rim with lots of quality reps in little time.',
    transfer: 'Close finishes decide whether your downhill drives turn into points. This builds the touch you rely on after the first step.',
    prog: 'Add a dribble into each finish, or alternate inside-hand and reverse finishes.', regr: 'Slow the pace and use only the strong hand until rhythm returns.',
    recovery: 'Low load. Fine the day before a game.' });

  q({ id: 'fin-5spot', name: 'Five-Spot Layup Ladder (Baseline)', skill: 'fin', nodes: ['fin.a1', 'fin.a2', 'fin.a3', 'fin.c1'], diff: 2, dur: 12, baseline: true,
    measure: M('Makes', 'Attempts', 20), bench: 0.75, unlocks: { nodes: ['fin.b1', 'fin.b2', 'fin.c1'], at: 0.8 },
    steps: ['Spots: right corner, right wing, middle, left wing, left corner, all at the 3-point line.', 'From each spot: one hard-dribble drive with the right hand finish and one with the left (outside hand).', 'Repeat the whole circuit twice = 20 attempts, game speed.', 'Same rules every time so results are comparable.'],
    purpose: 'A standardized finishing baseline across angles and hands.',
    transfer: 'Shows whether you can finish from the spots you actually attack from in games, not just under the rim.',
    prog: 'Add a floater from the middle spot or a defender contesting.', regr: 'Start from the elbow instead of the 3-point line.',
    recovery: 'Moderate load. Avoid within a few hours of a game.' , load: 2 });

  q({ id: 'fin-weak', name: 'Weak-Hand Finishing Block', skill: 'fin', nodes: ['fin.a2', 'fin.b2'], dur: 12,
    measure: M('Makes', 'Attempts', 24), bench: 0.7,
    steps: ['Weak hand only: 8 layups from the wing, 8 from the slot, 8 from baseline.', 'Take off from the correct foot every time.', 'Use one hard dribble from the 3-point line.'],
    purpose: 'Closes the gap between your strong and weak hand.',
    transfer: 'Defenders shade you to your strong hand. A reliable weak hand keeps both driving lanes open.',
    prog: 'Finish with the weak hand off the wrong foot (inside foot).', regr: 'Start from a stationary two-foot finish.',
    recovery: 'Low to moderate load.' });

  q({ id: 'fin-footwork', name: 'Footwork Finish Menu', skill: 'fin', nodes: ['fin.a3', 'fin.b2'], dur: 15,
    measure: M('Makes', 'Attempts', 20), bench: 0.7,
    steps: ['Five reps each: 1-2 step, jump stop, euro step, pro-hop.', 'Attack from the wing at about 80% speed.', 'Land balanced before you rise. Stop and redo any rep where you fell away.'],
    purpose: 'Gives you more than one way to gather so you can finish around bodies.',
    transfer: 'Different gathers let you adjust to a defender instead of running into him.',
    prog: 'Have someone call the footwork right as you reach the 3-point line.', regr: 'Walk the footwork without a ball, then add the ball.',
    recovery: 'Moderate on knees and ankles. Skip if sore.', load: 2, legs: 'light' });

  q({ id: 'fin-floater', name: 'Floater Range Builder', skill: 'fin', nodes: ['fin.b1'], diff: 2, dur: 12,
    measure: M('Makes', 'Attempts', 25), bench: 0.6,
    steps: ['Mark 3 spots in the paint about 6, 8 and 10 feet out.', 'From each spot: 1-dribble attack, one-foot and two-foot floaters.', 'High release, soft touch, land in place.'],
    purpose: 'Builds a soft shot over shot blockers.',
    transfer: 'Lets an undersized guard score in the paint without challenging the big at the rim.',
    prog: 'Add a coach or partner with raised arms in front of the rim.', regr: 'Shoot from 5 feet with no dribble.',
    recovery: 'Low load.' });

  q({ id: 'fin-inside', name: 'Inside-Hand & Reverse Finishes', skill: 'fin', nodes: ['fin.b2', 'fin.b3'], diff: 2, dur: 12,
    measure: M('Makes', 'Attempts', 20), bench: 0.65,
    steps: ['10 inside-hand finishes (right hand on the left side, left on the right).', '10 reverse finishes on baseline drives.', 'Imagine a defender on your outside shoulder each rep.'],
    purpose: 'Teaches finishes that use the rim and your body to protect the ball.',
    transfer: 'These finishes get you around rim protectors who are waiting for a standard layup.',
    prog: 'Alternate inside-hand and reverse on a partner\'s call.', regr: 'Start from the block with no dribble.',
    recovery: 'Low load.' });

  q({ id: 'fin-angles', name: 'Angle Attack Finishes', skill: 'fin', nodes: ['fin.c1', 'fin.a3'], stage: 2, diff: 2, dur: 15,
    measure: M('Makes', 'Attempts', 20), bench: 0.65, load: 2, legs: 'light',
    steps: ['Start each rep from a different spot: slot, wing, corner, baseline. Never repeat a spot twice in a row.', 'Full-speed attack from 2 dribbles out.', 'Choose the finish that suits the angle (strong hand, weak hand, reverse).'],
    purpose: 'Varies angle and speed so finishing adapts instead of repeating one rep.',
    transfer: 'Games never give you the same angle twice. Variable practice transfers better than repeating one spot.',
    prog: 'Add a chair as a help defender you must avoid.', regr: 'Use two angles only.',
    recovery: 'Moderate load.' });

  q({ id: 'fin-race', name: 'Race the Recovery (Solo)', skill: 'fin', nodes: ['fin.c2', 'sep.b2'], skills: { fin: 0.7, sep: 0.3 }, stage: 2, diff: 2, dur: 12,
    measure: M('Makes', 'Attempts', 16), bench: 0.6, load: 2, legs: 'light',
    steps: ['Start at half court. Speed dribble into the lane in 4 dribbles or fewer.', 'Imagine the defender trailing on your hip: finish with the outside hand and shield with your body.', 'Alternate sides. A rep only counts if you used the rule (dribbles and hand).'],
    purpose: 'Adds time pressure and ball protection to finishing at speed.',
    transfer: 'Simulates the trailing defender you deal with after beating your man.',
    prog: 'Have a partner chase from a step behind (see Trailer 1v1).', regr: 'Start from the 3-point line.',
    recovery: 'Moderate load.' });

  q({ id: 'fin-trailer', name: 'Trailer 1v1', skill: 'fin', nodes: ['fin.c2', 'fin.d1', 'sep.b2'], skills: { fin: 0.6, sep: 0.4 }, stage: 2, diff: 3, dur: 15, partner: 2, alt: 'fin-race',
    measure: M('Scores', 'Possessions', 10), bench: 0.5, load: 2, legs: 'light',
    steps: ['Defender starts on your hip, a half step behind.', 'Drive from the wing and finish while they recover.', '10 possessions. Count only made finishes.'],
    purpose: 'Live practice finishing while a beaten defender recovers.',
    transfer: 'Directly targets your listed need: keeping the advantage and finishing it.',
    prog: 'Defender starts even with you.', regr: 'Defender starts a full step behind.',
    recovery: 'Moderate load. Contact possible, so keep it controlled.' });

  q({ id: 'fin-blocker', name: 'Read the Rim Protector', skill: 'fin', nodes: ['fin.c3', 'fin.d1', 'fin.d2'], stage: 2, diff: 3, dur: 15, partner: 2, alt: 'fin-blocker-solo',
    measure: M('Good finishes', 'Attempts', 12), bench: 0.55, load: 2,
    steps: ['Partner stands in the paint and either steps up to you or stays home.', 'Step up = floater. Stays home = finish away from them or reverse.', 'Count a rep as good only if the read was right and the shot was made.'],
    purpose: 'Trains reading the shot blocker before you choose a finish.',
    transfer: 'Choosing early beats deciding in the air, where most blocks happen.',
    prog: 'Partner disguises the choice until later.', regr: 'Partner shows the choice early.',
    recovery: 'Moderate load.' });

  q({ id: 'fin-blocker-solo', name: 'Rim Protector Read (Solo Cue)', skill: 'fin', nodes: ['fin.c3', 'fin.b1'], stage: 2, diff: 2, dur: 12,
    measure: M('Correct makes', 'Attempts', 16), bench: 0.6,
    steps: ['Set a random timer or flip a coin as you reach the 3-point line.', 'Heads (big steps up): floater from 8 feet. Tails (big stays home): rim finish or reverse.', 'Count only reps with the correct read and a make.'],
    purpose: 'Adds a decision to finishing when you train alone.',
    transfer: 'Builds the habit of reading before the gather, not after.',
    prog: 'Make the cue later (at the elbow).', regr: 'Know the cue before you start the rep.',
    recovery: 'Low to moderate load.' });

  q({ id: 'fin-contact', name: 'Contact Finishing with Pad', skill: 'fin', nodes: ['fin.c2', 'str.d2'], skills: { fin: 0.7, str: 0.3 }, stage: 2, diff: 3, dur: 12, partner: 1, alt: 'fin-race',
    measure: M('Makes', 'Attempts', 16), bench: 0.55, load: 2,
    steps: ['Partner holds a pad (or a firm cushion) and gives a light, controlled bump on your gather.', 'Absorb, stay balanced, and finish with the outside hand.', 'Partner adjusts contact to stay safe. Never hit in the air.'],
    purpose: 'Teaches staying on balance through contact.',
    transfer: 'Lane contact is constant. Finishing through it turns contact into and-ones.',
    prog: 'Bump on the second step instead of the gather.', regr: 'Very light contact with a walk-through.',
    recovery: 'Moderate. Skip when sore or the day before a game.' });

  /* ---------------- SHOOTING ---------------- */
  q({ id: 'sht-form', name: 'Form Shooting Ladder', skill: 'sht', nodes: ['sht.a1'], diff: 1, dur: 10, space: 'hoop',
    measure: M('Makes', 'Shots', 30), bench: 0.7,
    steps: ['One-hand form shots: 5 spots at 5 feet, then step back to 8 feet.', 'Hold the follow-through until the ball lands.', 'Only move back after 4/5 swishes or clean makes at a spot.'],
    purpose: 'Locks in a repeatable release.', transfer: 'Consistent mechanics make your shot hold up under pressure.',
    prog: 'Move to 12 feet with both hands.', regr: 'Shoot from 3 feet.', recovery: 'Very low load. Good game-day warm-up.' , load: 0 });

  q({ id: 'sht-5spot', name: 'Five-Spot Catch-and-Shoot (Baseline)', skill: 'sht', nodes: ['sht.a2', 'sht.a3'], diff: 2, dur: 15, baseline: true, partner: 0,
    measure: M('Makes', 'Shots', 50), bench: 0.5, unlocks: { nodes: ['sht.b1', 'sht.b2'], at: 0.55 },
    steps: ['5 spots around the arc (use mid-range if 3s are not in range yet. Pick once and stick with it).', 'At each spot: 10 shots from a self-pass (spin the ball out and step in) or a partner\'s pass.', 'Same distance and rules every time. Note the distance in the notes.'],
    purpose: 'Your standardized catch-and-shoot baseline.', transfer: 'Defenders who go under screens or help off you must pay for it.',
    prog: 'Move back to the 3-point line, or add a shot fake and one dribble.', regr: 'Shoot from 12 feet.', recovery: 'Low load.' });

  q({ id: 'sht-hop', name: '1-2 Step vs Hop Footwork Series', skill: 'sht', nodes: ['sht.a3', 'sht.b1'], dur: 12,
    measure: M('Makes', 'Shots', 30), bench: 0.55,
    steps: ['From the wing: 10 shots with a 1-2 step (inside foot first), 10 with a hop.', 'Then 10 alternating as you move toward the ball.', 'Land square and on balance before every shot.'],
    purpose: 'Builds footwork to arrive ready from any direction.', transfer: 'Good feet mean you can shoot quickly off passes and off your own dribble.',
    prog: 'Sprint 6 feet into each catch.', regr: 'Stationary catch with only the 1-2.', recovery: 'Low load.' });

  q({ id: 'sht-relocate', name: 'Relocate & Shoot', skill: 'sht', nodes: ['sht.b1', 'sht.c3'], stage: 2, dur: 12,
    measure: M('Makes', 'Shots', 30), bench: 0.45, load: 2, legs: 'light',
    steps: ['After every shot, sprint to a new spot at least 10 feet away.', 'Self-pass or partner pass on arrival. Shoot within one second.', 'No two shots in a row from the same spot.'],
    purpose: 'Shooting on the move with variability.', transfer: 'Mirrors how guards get catch-and-shoot chances after a drive and kick.',
    prog: 'Add a shot fake and one-dribble pull-up option.', regr: 'Jog instead of sprint.', recovery: 'Moderate load.' });

  q({ id: 'sht-pullup', name: 'One- and Two-Dribble Pull-Ups', skill: 'sht', nodes: ['sht.b2', 'sep.c1'], skills: { sht: 0.7, sep: 0.15, bh: 0.15 }, diff: 2, dur: 15,
    measure: M('Makes', 'Shots', 30), bench: 0.45, load: 1,
    steps: ['From the wing and top: one hard dribble right, pull up. Then left.', 'Then two dribbles (cross then rise).', 'Sell the drive with your eyes and shoulders before you stop.'],
    purpose: 'Builds your pull-up off the dribble.', transfer: 'Matches the Maxey-style pull-up when defenders drop back to stop your drive.',
    prog: 'Add a hesitation before the rise (Change-of-Pace Pull-Up).', regr: 'Pull up from 12 feet.', recovery: 'Low to moderate load.' });

  q({ id: 'sht-pace', name: 'Change-of-Pace Pull-Up', skill: 'sht', nodes: ['sht.b3', 'sep.b3', 'sep.c1'], skills: { sht: 0.5, sep: 0.5 }, stage: 2, diff: 3, dur: 15,
    measure: M('Makes', 'Shots', 24), bench: 0.4, load: 2, legs: 'light',
    steps: ['Attack at 70% speed, hesitate (head and shoulders up), then explode into one dribble and pull up.', 'Vary the hesi spot each rep (top, wing, elbow).', 'A rep counts only if you were balanced on the rise.'],
    purpose: 'Combines your change of pace with a pull-up.', transfer: 'Freezing a defender with pace, then rising, is a core way quick guards create shots.',
    prog: 'Add a chair "defender" you must hesi past.', regr: 'One speed, then pull-up.', recovery: 'Moderate load.' });

  q({ id: 'sht-closeout-solo', name: 'Closeout Decision Shooting (Solo)', skill: 'sht', nodes: ['sht.c2', 'iq.c1'], skills: { sht: 0.7, iq: 0.3 }, stage: 2, diff: 2, dur: 15,
    measure: M('Correct makes', 'Reps', 24), bench: 0.45,
    steps: ['Self-pass from the wing. As you catch, use a random cue (phone random number or a coin).', 'Even/heads = shoot. Odd/tails = shot fake, one dribble, pull-up.', 'Count only reps where you followed the cue and made the shot.'],
    purpose: 'Puts a decision on the catch.', transfer: 'Games ask "shoot or go?" on every catch. This practises answering fast.',
    prog: 'Add a third option: drive and kick to a target.', regr: 'Know the decision before the catch.', recovery: 'Low load.' });

  q({ id: 'sht-closeout-live', name: 'Live Closeouts', skill: 'sht', nodes: ['sht.c1', 'sht.c2', 'def.a2'], skills: { sht: 0.7, iq: 0.15, def: 0.15 }, stage: 2, diff: 3, dur: 15, partner: 1, alt: 'sht-closeout-solo',
    measure: M('Makes', 'Shots', 20), bench: 0.4,
    steps: ['Partner passes and closes out hard with a high hand.', 'Short closeout: shoot. Flying closeout: one-dribble attack.', 'Partner swaps to defense practice every 10 reps if you like.'],
    purpose: 'Shooting against a real contest.', transfer: 'The best test of whether your shot holds up in games.',
    prog: 'Partner can choose to run you off the line.', regr: 'Partner closes out softly.', recovery: 'Low to moderate load.' });

  q({ id: 'sht-fatigue', name: 'Fatigue Free Throws & Pull-Ups', skill: 'sht', type: 'cond', nodes: ['sht.c3', 'cond.b3', 'cond.c1'], skills: { sht: 0.5, cond: 0.5 }, stage: 2, diff: 2, dur: 15,
    measure: M('Makes', 'Shots', 24), bench: 0.5, load: 2, legs: 'light',
    steps: ['Run one baseline-to-baseline-and-back at about 80% effort.', 'Immediately shoot 2 free throws, then one pull-up from the elbow.', 'Rest 30–45 seconds. 8 rounds.', 'Keep the same routine on every free throw.'],
    purpose: 'Keeps your shot when your heart rate is high.', transfer: 'Late-game free throws and pull-ups happen tired. This trains the routine to hold.',
    prog: 'Shorten rest to 20 seconds.', regr: '6 rounds with 60 seconds rest.', recovery: 'Moderate load. Skip the day before a game if legs are heavy.' });

  q({ id: 'sht-gameshots', name: 'Game-Shot Session', skill: 'sht', nodes: ['sht.c2', 'sht.d2', 'sht.d1'], stage: 2, diff: 2, dur: 20,
    measure: M('Makes', 'Shots', 40), bench: 0.45, load: 2,
    steps: ['Only take shots you take (or want to take) in games: pull-ups, catch-and-shoot 3s, floaters.', 'Game speed. Every shot starts with a move or a catch on the move.', 'Write down your three most common game shots in notes.'],
    purpose: 'Practice exactly the shots you take in games.', transfer: 'The shots you rehearse at game speed are the ones that hold up in games.',
    prog: 'Add a partner contest on every third shot.', regr: 'Half speed.', recovery: 'Moderate load.' });

  q({ id: 'sht-ft', name: 'Free Throw Routine Sets', skill: 'sht', nodes: ['sht.a1'], diff: 1, dur: 8, space: 'hoop',
    measure: M('Makes', 'Shots', 20), bench: 0.7, load: 0,
    steps: ['Shoot in sets of 2 like a game, with your full routine every time.', 'Walk to half court and back between sets.', 'Track makes honestly.'],
    purpose: 'Builds a repeatable routine.', transfer: 'Free throws are the most repeatable points a driving guard can earn.',
    prog: 'Shoot after a sprint (Fatigue Free Throws).', regr: 'Sets of 5.', recovery: 'Very low load.' });

  /* ---------------- BALL HANDLING ---------------- */
  q({ id: 'bh-pound', name: 'Pound & Control Series', skill: 'bh', nodes: ['bh.a1', 'bh.a2', 'bh.a3'], diff: 1, dur: 10, space: 'home',
    measure: M('Clean sets', 'Sets', 10), bench: 0.8,
    steps: ['30-second sets: hard pounds at knee, waist and hip height, each hand.', 'Then crossovers, between the legs, behind the back.', 'Eyes on a target on the wall the whole time.', 'A set is clean if you never lost control or looked down.'],
    purpose: 'Builds hand strength and control with eyes up.', transfer: 'A strong, low dribble holds up against reaching defenders.',
    prog: 'Add a tennis ball toss with the free hand.', regr: '20-second sets.', recovery: 'Low load. Works at home on a hard surface.' , load: 0 });

  q({ id: 'bh-tennis', name: 'Tennis-Ball Toss Handling', skill: 'bh', nodes: ['bh.a2', 'bh.c2'], stage: 2, dur: 10, space: 'home',
    measure: M('Clean catches', 'Tosses', 30), bench: 0.7,
    steps: ['Dribble with one hand, toss and catch a tennis ball with the other.', 'Switch hands every 10 tosses. Add crossovers between tosses.', 'A rep is clean if you caught it without losing the dribble.'],
    purpose: 'Forces your dribble to run on its own while your attention is elsewhere.', transfer: 'In games your eyes and attention are on the defense, not the ball.',
    prog: 'Partner tosses at random times.', regr: 'Toss to yourself without dribbling, then add the dribble.', recovery: 'Low load.' , load: 0 });

  q({ id: 'bh-cone', name: 'Cone Combo Attacks', skill: 'bh', nodes: ['bh.b1', 'bh.b2', 'sep.a1'], skills: { bh: 0.7, sep: 0.3 }, dur: 15,
    measure: M('Clean reps', 'Reps', 20), bench: 0.7, load: 2, legs: 'light',
    steps: ['Line up 3 cones from half court to the elbow.', 'Different move at each cone (cross, between, behind) at speed, then finish or pull up.', 'A rep is clean if you never slowed down to set up a move.'],
    purpose: 'Moves at real speed that lead to a finish.', transfer: 'Combo moves only matter if they keep your speed into the paint.',
    prog: 'Partner points left or right at the last cone.', regr: 'Half speed.', recovery: 'Moderate load.' });

  q({ id: 'bh-hesi', name: 'Hesi & Retreat Series', skill: 'bh', nodes: ['bh.b2', 'bh.a3', 'sep.a2'], skills: { bh: 0.6, sep: 0.4 }, dur: 12,
    measure: M('Clean reps', 'Reps', 20), bench: 0.7,
    steps: ['10 reps: attack, hesitate (rise up with eyes and shoulders), explode past a cone.', '10 reps: attack, retreat dribble two steps back with the ball protected, then re-attack.', 'Clean = ball protected and speed change obvious.'],
    purpose: 'Builds the hesi and the escape dribble.', transfer: 'Hesis freeze defenders; retreats get you out of traps without turnovers.',
    prog: 'Add a pull-up after the hesi.', regr: 'Stationary hesi rhythm.', recovery: 'Low to moderate load.' });

  q({ id: 'bh-speed', name: 'Full-Court Speed Dribble', skill: 'bh', nodes: ['bh.b3', 'cond.c2', 'iq.b3'], skills: { bh: 0.6, cond: 0.4 }, dur: 10,
    measure: M('Clean reps', 'Reps', 12), bench: 0.7, load: 2, legs: 'light',
    steps: ['Push from baseline to half court in 4–5 dribbles, eyes up.', 'Finish with a layup or pull-up at the other end.', 'Alternate hands each rep. Walk back to recover.'],
    purpose: 'Push in transition with few dribbles.', transfer: 'Quick guards earn easy points by getting downhill before the defense sets.',
    prog: 'Add a change of direction at half court.', regr: 'Half-court reps only.', recovery: 'Moderate load.' });

  q({ id: 'bh-twoball', name: 'Two-Ball Reactive Handling', skill: 'bh', nodes: ['bh.a1', 'bh.c2'], stage: 2, dur: 10, space: 'home',
    measure: M('Clean sets', 'Sets', 8), bench: 0.7,
    steps: ['Two balls: same-time, alternating, then high-low.', 'Partner or phone calls a change every few seconds.', 'Clean set = never lost a ball.'],
    purpose: 'Strengthens the weak hand and coordination with reaction.', transfer: 'Weak-hand control under distraction holds up better in games.',
    prog: 'Walk forward and back while dribbling.', regr: 'No reaction cues.', recovery: 'Low load.' , load: 0 });

  q({ id: 'bh-pressure', name: 'Pressure Handle', skill: 'bh', nodes: ['bh.c1', 'bh.a3', 'bh.d1'], stage: 2, diff: 3, dur: 12, partner: 2, alt: 'bh-hesi',
    measure: M('Clean possessions', 'Possessions', 10), bench: 0.6, load: 2,
    steps: ['Partner harasses you with hands and body (or a pool noodle) inside a half-court box.', 'Keep the dribble alive for 10 seconds and get to a target line.', 'Clean = no turnover and reached the line.'],
    purpose: 'Handling with real pressure.', transfer: 'Prepares you for full-court pressure and physical guards.',
    prog: 'Shrink the box or add a second defender.', regr: 'Partner uses one hand only.', recovery: 'Moderate load.' });

  q({ id: 'bh-press', name: '1v1 Full-Court Press Break', skill: 'bh', nodes: ['bh.c3', 'bh.c1', 'def.b3'], skills: { bh: 0.7, def: 0.3 }, stage: 2, diff: 3, dur: 15, partner: 2, alt: 'bh-speed',
    measure: M('Successful breaks', 'Possessions', 10), bench: 0.6, load: 3, legs: 'moderate',
    steps: ['Inbound, defender picks you up full court.', 'Get over half court in 8 seconds without a turnover.', 'Switch roles every 2 possessions so you also work on ball pressure.'],
    purpose: 'Live press-break practice.', transfer: 'Handles the full-court pressure common in club and school games.',
    prog: 'Add a second trapping defender.', regr: 'Defender plays at 50%.', recovery: 'Hard on legs. Not the day before a game.' });

  /* ---------------- SEPARATION ---------------- */
  q({ id: 'sep-first', name: 'First-Step Launch', skill: 'sep', nodes: ['sep.a1', 'sep.a3', 'str.c2'], skills: { sep: 0.8, str: 0.2 }, dur: 12,
    measure: M('Clean reps', 'Reps', 20), bench: 0.7, load: 2, legs: 'light',
    steps: ['From triple threat at the wing: jab and go, rip through, catch-and-go.', 'Your goal: reach a cone 2 steps past the "defender" chair in 2 dribbles or less.', 'Long first step, low shoulder, push off the back foot.'],
    purpose: 'Sharpens your first-step strength.', transfer: 'Your first step is a strength. This keeps it sharp and adds variety.',
    prog: 'Partner holds a pad at your shoulder.', regr: 'Without the ball.', recovery: 'Moderate on legs.' });

  q({ id: 'sep-pace', name: 'Slow-Fast Change-of-Pace Lanes', skill: 'sep', nodes: ['sep.a2', 'sep.b3', 'bh.b2'], skills: { sep: 0.7, bh: 0.3 }, dur: 12,
    measure: M('Clean reps', 'Reps', 16), bench: 0.7, load: 2, legs: 'light',
    steps: ['Dribble half court at 50%, then explode to 100% for 3 dribbles.', 'Use a hesi, in-and-out or shoulder fake as the trigger.', 'Clean = a real, visible speed change both ways.'],
    purpose: 'Builds the slow-to-fast rhythm.', transfer: 'Defenders guard speed. They struggle with changes in speed.',
    prog: 'Change speeds twice per rep.', regr: 'Walk-to-jog speed changes.', recovery: 'Moderate load.' });

  q({ id: 'sep-hipline', name: 'Hip-Line Drive', skill: 'sep', nodes: ['sep.b1', 'sep.a1'], dur: 12,
    measure: M('Clean reps', 'Reps', 16), bench: 0.7, load: 2, legs: 'light',
    steps: ['Place a chair as the defender at the elbow.', 'Attack so your shoulder passes the chair\'s "hip", then stay on a straight line to the rim. No drifting wide.', 'Finish or jump stop. Clean = line kept and finish under control.'],
    purpose: 'Teaches keeping a straight driving line.', transfer: 'Drifting wide after a good first step lets the defender recover. That is your listed need.',
    prog: 'Partner chases from behind (Keep the Advantage).', regr: 'Walk the line, then jog.', recovery: 'Moderate load.' });

  q({ id: 'sep-keep', name: 'Keep the Advantage', skill: 'sep', nodes: ['sep.b1', 'sep.b2', 'sep.d1', 'fin.c2'], skills: { sep: 0.7, fin: 0.3 }, stage: 2, diff: 3, dur: 15, partner: 2, alt: 'sep-hipline',
    measure: M('Quality chances', 'Possessions', 10), bench: 0.5, load: 2, legs: 'light',
    problem: 'You beat defenders initially but struggle to keep the advantage.',
    steps: ['Start with the defender a half step behind you.', 'Attack past their hip and keep the advantage.', 'Make an appropriate decision: finish, stop and pull up, or kick.', 'Count a quality scoring chance: a good shot or finish, whether made or not.'],
    purpose: 'Turns initial separation into real scoring chances.', transfer: 'Exactly the game situation you want to improve.',
    prog: 'Vary where the defender starts and how they recover.', regr: 'Defender starts a full step behind.', recovery: 'Moderate load.' });

  q({ id: 'sep-stopgo', name: 'Stop-and-Go Space Maker', skill: 'sep', nodes: ['sep.c2', 'sep.c1', 'sht.b2'], skills: { sep: 0.6, sht: 0.4 }, stage: 2, diff: 2, dur: 15,
    measure: M('Good reps', 'Reps', 20), bench: 0.55, load: 2, legs: 'light',
    steps: ['Attack downhill. On a random cue (coin or timer) either jump stop into a pull-up or hang-dribble and re-attack.', 'Make the stop hard enough that a real defender would overrun you.', 'Good rep = balanced stop and a good shot or finish.'],
    purpose: 'Creates space with stops and re-directions.', transfer: 'Hard stops are how fast guards create pull-up space.',
    prog: 'Partner chases to test the stop.', regr: 'Know the option before the rep.', recovery: 'Moderate on knees.' });

  q({ id: 'sep-shadow', name: 'Shadow Defender Reaction (Solo)', skill: 'sep', nodes: ['sep.a3', 'sep.b2', 'sep.c3'], stage: 2, diff: 2, dur: 12,
    measure: M('Correct reads', 'Reps', 20), bench: 0.6, load: 1,
    steps: ['Picture a defender. Use a random cue to set their "lead foot" (left/right).', 'Attack the lead-foot side in 1 dribble. If the cue says "recovered", jump stop or re-angle.', 'Count correct reads with a balanced finish or stop.'],
    purpose: 'Reads defender positioning on your own.', transfer: 'Attacking the right side makes your first step even more effective.',
    prog: 'Use a partner pointing instead of a random cue.', regr: 'No dribble, footwork only.', recovery: 'Low load.' });

  q({ id: 'sep-leadfoot', name: 'Read the Lead Foot', skill: 'sep', nodes: ['sep.a3', 'sep.c3', 'iq.b1'], skills: { sep: 0.7, iq: 0.3 }, stage: 2, diff: 2, dur: 12, partner: 1, alt: 'sep-shadow',
    measure: M('Correct reads', 'Reps', 16), bench: 0.65,
    steps: ['Partner gets in a stance with one foot forward on your catch.', 'Attack the lead-foot side. Partner can then slide at half speed.', 'Count correct reads that reached the paint.'],
    purpose: 'Reads a real stance.', transfer: 'You get an edge before the first dribble.',
    prog: 'Partner shifts at the last moment.', regr: 'Partner holds the stance still.', recovery: 'Low load.' });

  q({ id: 'sep-1v1', name: 'Advantage 1v1 from the Catch', skill: 'sep', nodes: ['sep.c3', 'sep.d2', 'sep.d3', 'sht.c1'], skills: { sep: 0.6, sht: 0.2, iq: 0.2 }, stage: 2, diff: 3, dur: 15, partner: 2, alt: 'sep-stopgo',
    measure: M('Good shots created', 'Possessions', 12), bench: 0.5, load: 3, legs: 'moderate',
    steps: ['Defender closes out from a different spot every time.', 'Max 3 dribbles. Create a good shot: pull-up, finish, or kick (to a target).', 'Count good shots created, made or missed.'],
    purpose: 'Live separation against closeouts.', transfer: 'This is where most of your scoring chances come from.',
    prog: 'Defender can choose to sag or press.', regr: 'Defender plays 75% speed.', recovery: 'Hard. Not the day before a game.' });

  /* ---------------- PLAYMAKING & IQ ---------------- */
  q({ id: 'iq-film', name: 'Film Study: Guard Reads', skill: 'iq', type: 'film', nodes: ['iq.a1', 'iq.b2', 'iq.b3'], diff: 1, dur: 15, space: 'home',
    measure: M('Correct predictions', 'Possessions', 10), bench: 0.6, load: 0,
    steps: ['Watch your own game film, or a guard you study (Tyrese Maxey drives are a good choice).', 'Pause when the guard starts a drive or uses a screen. Predict where the help will come from and the right read.', 'Play and check. Count correct predictions.'],
    purpose: 'Builds pattern recognition without physical load.', transfer: 'Recognising help early lets you make the read a beat faster on the floor.',
    prog: 'Watch at 1.5x speed or predict two steps ahead.', regr: 'Watch first, then pause on replay.', recovery: 'Zero physical load. Ideal for rest days.' });

  q({ id: 'iq-passes', name: 'Moving Pass Targets', skill: 'iq', nodes: ['iq.a2', 'iq.a3'], dur: 10, space: 'home',
    measure: M('On-target passes', 'Passes', 30), bench: 0.75, load: 0,
    steps: ['Tape 3 targets on a wall at chest height.', 'Move laterally and throw one-hand push passes, wraparounds and pocket passes off a dribble.', 'On target = hits within one hand-width of the tape.'],
    purpose: 'Passing accuracy with either hand.', transfer: 'Accurate passes after a drive turn your attacks into assists.',
    prog: 'Pass off a live dribble at speed.', regr: 'Two-hand passes, stationary.', recovery: 'Very low load.' });

  q({ id: 'iq-kick', name: 'Drive-and-Kick Accuracy', skill: 'iq', nodes: ['iq.a3', 'iq.c2'], stage: 2, dur: 12,
    measure: M('Accurate kicks', 'Reps', 20), bench: 0.7, load: 1,
    steps: ['Set 2 targets (cones or chairs) at the corner and wing.', 'Drive to the paint. On a random cue, kick to the called target.', 'Accurate = would have reached a shooter\'s shooting pocket.'],
    purpose: 'Passing out of drives on a cue.', transfer: 'When help collapses on your drive, the kick-out is the right play.',
    prog: 'Add a jump stop and pivot before the pass.', regr: 'Know the target before the drive.', recovery: 'Low load.' });

  q({ id: 'iq-2v1', name: '2v1 / 3v2 Advantage Reads', skill: 'iq', nodes: ['iq.b1', 'iq.c3', 'iq.d1'], stage: 2, diff: 2, dur: 15, partner: 2, alt: 'iq-film',
    measure: M('Correct reads', 'Possessions', 10), bench: 0.6, load: 2,
    steps: ['With two or more teammates: play 2v1 or 3v2 from half court.', 'Attack to draw a defender, then make the read.', 'Correct = right decision (score or pass to open player), made or not.'],
    purpose: 'Live advantage reads.', transfer: 'Numbers advantages after your drive must become points.',
    prog: 'Add a trailing defender.', regr: 'Defenders play at half speed.', recovery: 'Moderate load.' });

  q({ id: 'iq-pnr', name: 'Pick-and-Roll Read Chart', skill: 'iq', nodes: ['iq.b2', 'iq.c2'], dur: 15,
    measure: M('Correct reps', 'Reps', 16), bench: 0.7, load: 1,
    steps: ['Use a chair as the screen.', 'For each coverage (drop, hedge, switch, under) walk through the read, then do 4 reps at game speed.', 'Drop = pull-up or float. Hedge = split or pocket. Switch = attack the big. Under = shoot.'],
    purpose: 'Learn the main pick-and-roll reads.', transfer: 'Many team offenses run through ball screens for guards.',
    prog: 'Have a partner show the coverage live.', regr: 'Walk-through only.', recovery: 'Low load.' });

  q({ id: 'iq-clock', name: 'Shot-Clock Decisions', skill: 'iq', nodes: ['iq.c1', 'sht.c2'], skills: { iq: 0.6, sht: 0.4 }, stage: 2, dur: 12,
    measure: M('Good decisions', 'Reps', 20), bench: 0.6, load: 1,
    steps: ['Every catch has a 2-second count. Decide: shoot, drive, or pass to a target.', 'Use a random cue for whether a "closeout" is coming.', 'Good decision = right choice before the count hits zero.'],
    purpose: 'Speeds up decision making.', transfer: 'Fast decisions keep the defense rotating.',
    prog: 'One-second count.', regr: 'Three-second count.', recovery: 'Low load.' });

  /* ---------------- DEFENSE ---------------- */
  q({ id: 'def-slide', name: 'Slide Technique Ladder', skill: 'def', nodes: ['def.a1', 'def.b1'], dur: 10, space: 'field',
    measure: M('Clean reps', 'Reps', 12), bench: 0.75, load: 2, legs: 'light',
    steps: ['Zig-zag between 4 cones down the court in your stance.', 'Push from the trail foot, never cross your feet, chest up.', 'Clean = no crossing and stayed low the whole way.'],
    purpose: 'Builds stance and slide mechanics.', transfer: 'Good slides let you use your quickness on defense too.',
    prog: 'Add a drop step and sprint between cones.', regr: 'Shorter zig-zags.', recovery: 'Moderate on legs.' });

  q({ id: 'def-closeout', name: 'Closeout Footwork', skill: 'def', nodes: ['def.a2', 'def.c2'], dur: 10,
    measure: M('Clean reps', 'Reps', 16), bench: 0.75, load: 2, legs: 'light',
    steps: ['Start in the paint. Sprint to a cone at the arc.', 'Chop your feet two-thirds of the way, arrive with a high hand and balanced stance.', 'Then slide one step to cut off a drive.'],
    purpose: 'Closeout technique without getting blown by.', transfer: 'Good closeouts stop shooters and drivers without fouling.',
    prog: 'Partner catches and attacks after your closeout.', regr: 'Walk through the chop.', recovery: 'Moderate load.' });

  q({ id: 'def-hip', name: 'Hip-Turn & Recover', skill: 'def', nodes: ['def.a3', 'def.b3'], dur: 10, space: 'field',
    measure: M('Clean reps', 'Reps', 12), bench: 0.75, load: 2, legs: 'light',
    steps: ['Slide 2 steps, open your hips, sprint 3 steps, then slide again.', 'Turn without crossing over too early.', 'Clean = smooth turn and back into a balanced stance.'],
    purpose: 'Recover when the ball-handler gets by you.', transfer: 'Getting beat is normal. Recovering is what good defenders do.',
    prog: 'React to a partner\'s direction.', regr: 'Walk through the turn.', recovery: 'Moderate on legs.' });

  q({ id: 'def-mirror', name: 'Mirror Drill', skill: 'def', nodes: ['def.b1', 'def.b2'], stage: 2, dur: 10, partner: 1, alt: 'def-slide', space: 'field',
    measure: M('Clean rounds', 'Rounds', 8), bench: 0.6, load: 2, legs: 'light',
    steps: ['Partner moves side to side between two lines. You mirror them, staying in front.', '20-second rounds, 40 seconds rest.', 'Clean = never lost position and hands stayed active without reaching.'],
    purpose: 'Reacting to a real opponent.', transfer: 'Defense is reaction. This trains it with light load.',
    prog: 'Partner adds fakes.', regr: '15-second rounds.', recovery: 'Moderate.' });

  q({ id: 'def-contain', name: '1v1 Contain from Closeout', skill: 'def', nodes: ['def.c2', 'def.b1', 'def.d1'], stage: 2, diff: 3, dur: 15, partner: 2, alt: 'def-closeout',
    measure: M('Stops', 'Possessions', 10), bench: 0.5, load: 3, legs: 'moderate',
    steps: ['Pass to your partner and close out.', 'They have 3 dribbles to score. You contain.', 'A stop = miss you contested or no shot in 3 dribbles.'],
    purpose: 'Live on-ball defense.', transfer: 'Direct game situation.',
    prog: 'Allow 5 dribbles.', regr: 'Attacker limited to one direction.', recovery: 'Hard on legs.' });

  q({ id: 'def-screens', name: 'Screen Navigation', skill: 'def', nodes: ['def.c3'], stage: 2, dur: 12,
    measure: M('Clean reps', 'Reps', 16), bench: 0.7, load: 1,
    steps: ['Set a chair as a screen at the top.', 'Over: get skinny and chase over. Under: step behind. Ice: force away from the screen.', 'A random cue (coin/timer) picks the coverage.'],
    purpose: 'Reacting to screens with the right technique.', transfer: 'Ball screens are everywhere at club level.',
    prog: 'A partner screens live with light contact.', regr: 'Walk-through.', recovery: 'Low load.' });

  q({ id: 'def-help', name: 'Help-Side Reaction (Solo Cue)', skill: 'def', nodes: ['def.c1', 'def.a2'], stage: 2, dur: 10,
    measure: M('Correct reactions', 'Reps', 16), bench: 0.7, load: 2, legs: 'light',
    steps: ['Start in help position: one step off the line between ball and basket, seeing ball and your man.', 'Random cue (coin/timer): "drive" = sprint two steps to the help spot and show your chest; "skip" = close out to the wing cone.', 'Correct = right reaction, arrived balanced, chopped feet on the closeout.'],
    purpose: 'Off-ball reactions with a decision.', transfer: 'Help defense is a reaction to the ball. This trains reacting fast to the right spot.',
    prog: 'Partner drives or skips live.', regr: 'Know the cue before the rep.', recovery: 'Moderate on legs.' });

  q({ id: 'def-film', name: 'Help-Side Film Check', skill: 'def', type: 'film', nodes: ['def.c1', 'def.d2'], diff: 1, dur: 15, space: 'home',
    measure: M('Correct spots', 'Possessions', 10), bench: 0.6, load: 0,
    steps: ['Watch your own game film (or any game).', 'Pause on drives. Where should the help-side defenders be? Check where they were.', 'Note one thing you will apply in your next practice.'],
    purpose: 'Learn help positioning.', transfer: 'Help defense is about being in the right place early.',
    prog: 'Track your own off-ball positioning.', regr: 'Watch only one player.', recovery: 'Zero physical load.' });

  /* ---------------- CONDITIONING ---------------- */
  q({ id: 'cond-tempo', name: 'Tempo Runs (Aerobic)', skill: 'cond', type: 'cond', nodes: ['cond.a1', 'cond.a2'], diff: 1, dur: 15, space: 'field',
    measure: R('How controlled was the pace?'), bench: 0.8, load: 2, legs: 'light',
    steps: ['10 x one court length (or 40 m) at about 65–70% effort.', 'Walk back as recovery.', 'You should be able to speak in short sentences. If not, slow down.'],
    purpose: 'Builds an aerobic base without hammering your legs.', transfer: 'A better base helps you recover between possessions and days.',
    prog: 'Add 2 runs.', regr: '6 runs.', recovery: 'Skip if you have practice twice already this week and feel tired.' });

  q({ id: 'cond-repeat', name: 'Repeat-Effort Drives', skill: 'cond', type: 'cond', nodes: ['cond.b1', 'cond.c2', 'sep.a1'], skills: { cond: 0.6, sep: 0.4 }, stage: 2, diff: 3, dur: 15,
    measure: M('Rounds with full quality', 'Rounds', 6), bench: 0.65, load: 3, legs: 'moderate',
    steps: ['20 seconds: continuous full-speed drives from the wing with a finish.', '40 seconds rest. 6 rounds.', 'A round counts as full quality if your last drive was as sharp as your first.'],
    purpose: 'Basketball-specific repeated effort.', transfer: 'Games are repeated short bursts. This trains that, with skill.',
    prog: '8 rounds.', regr: '15 seconds work, 45 rest.', recovery: 'Hard. Not within 24 hours of a game.' });

  q({ id: 'cond-slide', name: 'Defensive Slide Intervals', skill: 'cond', type: 'cond', nodes: ['cond.b2', 'def.a1'], skills: { cond: 0.6, def: 0.4 }, dur: 10, space: 'field',
    measure: R('How well did you hold your stance?'), bench: 0.8, load: 2, legs: 'moderate',
    steps: ['15 seconds lane slides, 45 seconds rest, 6 rounds.', 'Quality first: stay low, no crossing.', 'Stop the round if your form breaks.'],
    purpose: 'Stance endurance.', transfer: 'Late possessions are lost when stance breaks.',
    prog: '20 seconds.', regr: '4 rounds.', recovery: 'Moderate on legs.' });

  q({ id: 'cond-transition', name: 'Transition Both Ways', skill: 'cond', type: 'cond', nodes: ['cond.c2', 'cond.b1', 'bh.b3'], skills: { cond: 0.6, bh: 0.2, fin: 0.2 }, stage: 2, diff: 2, dur: 12,
    measure: M('Makes', 'Attempts', 10), bench: 0.6, load: 3, legs: 'moderate',
    steps: ['Speed dribble for a layup, sprint back to the opposite free-throw line and slide to the corner (getting back on D).', 'Rest 45 seconds. 10 reps.', 'Count the made layups.'],
    purpose: 'Running the floor on offense and defense.', transfer: 'Rewards effort in both directions.',
    prog: '30 seconds rest.', regr: '6 reps.', recovery: 'Hard. Not within 24 hours of a game.' });

  q({ id: 'cond-breath', name: 'Recovery Breathing & Pace Check', skill: 'cond', type: 'recovery', nodes: ['cond.a3', 'cond.c3'], diff: 1, dur: 8, space: 'home',
    measure: DONE, bench: 0.7, load: 0,
    steps: ['5 minutes of slow nasal breathing: 4 seconds in, 6 seconds out.', 'Rate how your body feels honestly.', 'Plan your next hard session around your schedule.'],
    purpose: 'Learn to bring your system down.', transfer: 'Dead-ball recovery and good sleep both help late-game performance.',
    prog: 'Use it between shooting sets.', regr: '2 minutes.', recovery: 'Recovery activity.' });

  /* ---------------- RECOVERY ---------------- */
  q({ id: 'rec-mobility', name: 'Mobility Flow', skill: 'str', type: 'recovery', nodes: ['cond.c3', 'str.a1'], skills: { cond: 0.5, str: 0.5 }, diff: 1, dur: 12, space: 'home',
    measure: DONE, load: 0,
    steps: ['Ankle rocks (10 each), hip 90/90 switches (8 each), world\'s greatest stretch (5 each).', 'T-spine openers (8 each), calf stretch (30 s each).', 'Move slowly. Nothing should hurt.'],
    purpose: 'Keeps hips, ankles and upper back moving well.', transfer: 'Mobility helps your stance, landing and gather.',
    prog: 'Add a light jog warm-up.', regr: 'Do half.', recovery: 'Recovery activity. Good after games.' });

  q({ id: 'rec-shootaround', name: 'Light Shootaround', skill: 'sht', type: 'recovery', nodes: ['sht.a1'], diff: 1, dur: 15, space: 'hoop',
    measure: M('Makes', 'Shots', 40), bench: 0.6, load: 0,
    steps: ['Close-range form shots, free throws, a few catch-and-shoot from your range.', 'No sprinting. Stay loose.'],
    purpose: 'Keeps rhythm on light days.', transfer: 'Feel for the ball without fatigue.',
    prog: '—', regr: 'Just free throws.', recovery: 'Very low load. Fine on game day.' });

  q({ id: 'rec-rest', name: 'Full Rest Day', skill: 'cond', type: 'recovery', nodes: [], diff: 1, dur: 0, space: 'home', measure: DONE, load: 0,
    steps: ['No training today. Sleep 9+ hours if you can, eat well, drink water.', 'Rest is when your body adapts to training.'],
    purpose: 'Recovery.', transfer: 'Fresh legs play faster than tired ones.', prog: '—', regr: '—', recovery: 'Rest.' });

  /* ---------------- TEAM & GAME MISSIONS (logged as game-application reports) ---------------- */
  function mission(o) { q(Object.assign({ type: o.type || 'team', stage: 3, diff: 2, dur: 0, space: 'any', load: 0, measure: { kind: 'report', label: 'Report' }, bench: 0 }, o)); }
  mission({ id: 'tm-keep', name: 'Practice Mission: Keep the Advantage', skill: 'sep', nodes: ['sep.d1', 'sep.d3'], reportSkills: ['sep', 'fin'],
    steps: ['In team practice today, every time you beat your man: stay on the line past his hip.', 'Afterwards, note roughly how often you kept the advantage.'],
    purpose: 'Bring your main focus into team practice.', transfer: 'Practice reps against teammates are the bridge to games.', prog: '—', regr: '—', recovery: 'Uses practice time. No extra load.' });
  mission({ id: 'tm-shot', name: 'Practice Mission: Shot Selection Check', skill: 'sht', nodes: ['sht.d1', 'sht.d2'], reportSkills: ['sht', 'iq'],
    steps: ['In scrimmage today, before each shot ask: is this a shot I make in training?', 'Note how many shots were good shots.'],
    purpose: 'Connect drill work to shot choices.', transfer: 'Good shot selection makes your percentage reflect your real skill.', prog: '—', regr: '—', recovery: 'No extra load.' });
  mission({ id: 'tm-talk', name: 'Practice Mission: Talk on Every Possession', skill: 'def', nodes: ['def.d2', 'iq.d2'], reportSkills: ['def', 'iq'],
    steps: ['On defense in practice, call every screen and every help.', 'Note whether you kept talking late in practice.'],
    purpose: 'Communication habits.', transfer: 'Talking is a skill coaches notice and games need.', prog: '—', regr: '—', recovery: 'No extra load.' });
  mission({ id: 'tm-pressure', name: 'Practice Mission: Calm Against Pressure', skill: 'bh', nodes: ['bh.d1', 'bh.d3'], reportSkills: ['bh', 'iq'],
    steps: ['When pressured in practice: protect, keep your eyes up, use a retreat dribble if needed.', 'Note turnovers and good escapes.'],
    purpose: 'Take ball protection into practice.', transfer: 'Pressure handling must hold up against real defenders.', prog: '—', regr: '—', recovery: 'No extra load.' });
  mission({ id: 'gm-attack', name: 'Game Mission: Attack and Decide', type: 'game', skill: 'sep', nodes: ['sep.d1', 'sep.d2', 'fin.d1'], reportSkills: ['sep', 'fin', 'sht'],
    steps: ['Attack downhill when you have the first step. After separation, make the next decision fast: finish, pull up, or kick.', 'After the game, report what worked and what did not. Be honest. Mixed is normal.'],
    purpose: 'Apply your primary focus in a real game.', transfer: 'This is the stage that counts.', prog: '—', regr: '—', recovery: 'Game day: no hard training before the game.' });
  mission({ id: 'gm-shots', name: 'Game Mission: Quality Looks Only', type: 'game', skill: 'sht', nodes: ['sht.d1', 'sht.d3', 'sht.d2'], reportSkills: ['sht', 'iq'],
    steps: ['Take pull-ups when your defender\'s hips turn. Take catch-and-shoot 3s when the closeout is short.', 'Report your shooting honestly, including roughly makes and attempts if you know them.'],
    purpose: 'Shot selection in a real game.', transfer: 'Game application.', prog: '—', regr: '—', recovery: 'Game day.' });
  mission({ id: 'gm-defense', name: 'Game Mission: Defensive Engine', type: 'game', skill: 'def', nodes: ['def.d1', 'def.d3', 'cond.d1'], reportSkills: ['def', 'cond'],
    steps: ['Pick up your man early and talk on every screen.', 'Report how your defense and energy held up late in the game.'],
    purpose: 'Take defense and conditioning into games.', transfer: 'Game application.', prog: '—', regr: '—', recovery: 'Game day.' });

  /* ---------------- BOSS CHALLENGES ---------------- */
  function boss(o) { q(Object.assign({ type: 'boss', stage: 2, diff: 3, dur: 20, load: 2 }, o)); }
  boss({ id: 'boss-fin', name: 'The Finishing Gauntlet', skill: 'fin', nodes: ['fin.boss'], measure: M('Makes', 'Attempts', 30), bench: 0.7,
    steps: ['10 attempts: Five-Spot Layup Ladder, both hands.', '10 attempts: floater / rim / reverse decided by a random cue at the 3-point line.', '10 attempts: Race the Recovery, outside-hand finishes from half court in 4 dribbles.', 'Pass: 21/30 or better. With a partner, swap the last block for Trailer 1v1 (10 possessions) and use 18/30.'],
    purpose: 'Milestone test of mixed finishing.', transfer: 'Proves your finishing holds when the situation changes every rep.', prog: 'Repeat every 4 weeks.', regr: 'Do the blocks on separate days first.', recovery: 'Moderate. Not the day before a game.' });
  boss({ id: 'boss-sht', name: 'Standardized Shooting Test', skill: 'sht', nodes: ['sht.boss'], measure: M('Makes', 'Shots', 50), bench: 0.48, dur: 25,
    steps: ['20 catch-and-shoot: 4 per spot at the same 5 spots as your baseline.', '20 pull-ups: 10 one-dribble, 10 two-dribble from the wing and top.', '10 fatigue shots: one lane-length run, then one free throw, five rounds of two.', 'Pass: 24/50 or better at your chosen distance. Write the distance in notes.'],
    purpose: 'One fixed test you repeat to see real change.', transfer: 'The fatigue block and pull-ups make it closer to game shooting than a stationary test.', prog: 'Move the distance back.', regr: 'Mid-range distance.', recovery: 'Moderate.' });
  boss({ id: 'boss-bh', name: 'Pressure Handle Test', skill: 'bh', nodes: ['bh.boss'], measure: M('Clean runs', 'Runs', 8), bench: 0.75, load: 2, legs: 'light',
    steps: ['Cone gauntlet: 5 cones half to full court, a different move at each, finish at the rim.', 'Each run must be under 12 seconds with zero lost dribbles.', '8 runs. Pass: 6 clean runs.', 'With a partner: 8 full-court keep-away possessions instead, pass at 6 successful breaks.'],
    purpose: 'Handling under time and pressure.', transfer: 'Combines speed, control and moves that keep going.', prog: 'Under 10 seconds.', regr: 'Under 14 seconds.', recovery: 'Moderate.' });
  boss({ id: 'boss-sep', name: 'Keep the Advantage: Boss', skill: 'sep', nodes: ['sep.boss'], measure: M('Quality chances', 'Possessions', 10), bench: 0.6, load: 3, legs: 'moderate',
    steps: ['Partner version: 10 possessions vs a live defender starting even with you at the wing. Max 3 dribbles. Count quality chances created. Pass: 6/10.', 'Solo version: 10 reps of chair-elbow attack with a random stop/attack cue. A rep passes if you keep a straight line and finish or pull up balanced in 3 dribbles. Pass: 6/10 (write "solo" in notes).'],
    purpose: 'Milestone test of your main development need.', transfer: 'Keeping and converting advantages is what turns your speed into points.', prog: 'Defender starts a half step ahead.', regr: 'Defender starts a half step behind.', recovery: 'Hard. Not within 24 hours of a game.' });
  boss({ id: 'boss-iq', name: 'Decision Exam', skill: 'iq', nodes: ['iq.boss'], measure: M('Correct reads', 'Possessions', 20), bench: 0.7, space: 'home', load: 0, dur: 25,
    steps: ['Solo: watch 20 possessions of game film. Pause as the ball-handler uses a screen or drives. Call the read out loud. Play and score yourself honestly.', 'Team version: 20 possessions of 3v2, scored by a coach or teammate.', 'Pass: 14/20.'],
    purpose: 'A measured test of reads.', transfer: 'Seeing the play early is how smaller guards stay effective.', prog: 'Use faster playback.', regr: '10 possessions.', recovery: 'No physical load.' });
  boss({ id: 'boss-def', name: 'Lockdown Test', skill: 'def', nodes: ['def.boss'], measure: M('Stops', 'Possessions', 10), bench: 0.6, load: 3, legs: 'moderate', space: 'court',
    steps: ['Partner version: 10 possessions of 1v1 contain from a closeout, 3 dribbles max. Pass: 6 stops.', 'Solo version: 10 zig-zag slide runs (4 cones) with hip-turn recoveries, rated clean or not. Pass: 7/10 clean, and write "solo" in notes.'],
    purpose: 'A milestone defensive test.', transfer: 'On-ball containment is a strength you can build into a calling card.', prog: '5 dribbles.', regr: 'Attacker limited to one direction.', recovery: 'Hard on legs.' });
  boss({ id: 'boss-cond', name: 'Court Engine Test', skill: 'cond', nodes: ['cond.boss'], measure: M('Free throws made', 'Free throws', 12), bench: 0.67, load: 3, legs: 'moderate', type: 'boss',
    steps: ['6 rounds: two lane-length runs at about 80% effort, then 2 free throws, 45 seconds rest.', 'Keep the same run effort every round (this is not a max test).', 'Pass: 8/12 free throws with steady effort. Stop if you feel dizzy, unwell or have pain.'],
    purpose: 'Skill holding up under work.', transfer: 'Measures what matters: skill when tired.', prog: '8 rounds.', regr: '4 rounds.', recovery: 'Hard. Not within 24 hours of a game.' });
  boss({ id: 'boss-str', name: 'Movement Quality Screen', skill: 'str', nodes: ['str.boss'], measure: M('Passed checks', 'Checks', 6), bench: 0.83, space: 'home', load: 1, legs: 'light', dur: 15,
    steps: ['Check 1–2: 8 controlled split squats each side, knee tracking over toes.', 'Check 3–4: 5 lateral bounds each side, each landing stuck for 2 seconds.', 'Check 5: 5 snap-downs landing quietly.', 'Check 6: 30-second side plank each side without sagging.', 'Pass: 5 of 6 checks. Best done with a coach or adult watching.'],
    purpose: 'Checks quality of movement, not maximal strength.', transfer: 'Controlled landings and single-leg strength are the base for cutting and jumping.', prog: 'Repeat in 4 weeks.', regr: 'Do checks on separate days.', recovery: 'Light.' });

  MX.QUESTS = Q;
  MX.QUEST = {};
  Q.forEach(function (x) {
    if (!x.skills) { x.skills = {}; x.skills[x.skill] = 1; }
    MX.QUEST[x.id] = x;
  });
})(globalThis.MX = globalThis.MX || {});
