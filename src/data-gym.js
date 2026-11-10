/* Weight-room and athletic-development library. Age-appropriate, technique-first.
 * equip codes: db dumbbells, kb kettlebell, bench, trap trap bar, band, box, mb med ball, cable, mat, bar pull-up/row bar
 * legs: none | light | moderate | heavy ; sup: needs qualified supervision when inexperienced
 */
(function (MX) {
  MX.EQUIPMENT = {
    db: 'Dumbbells', kb: 'Kettlebells', bench: 'Bench', trap: 'Trap bar', band: 'Resistance bands', box: 'Plyo box / sturdy step',
    mb: 'Medicine ball', cable: 'Cable machine', bar: 'Pull-up / row bar', mat: 'Mat'
  };

  const E = [];
  function ex(o) { E.push(Object.assign({ equip: [], legs: 'none', sup: false, nodes: [] }, o)); }

  ex({ id: 'goblet', name: 'Goblet Squat', cat: 'Squat', equip: ['db'], alt: 'boxsquat', legs: 'moderate', nodes: ['str.a1', 'str.b3'], sets: 3, reps: '8', rest: '90 s',
    purpose: 'Teaches an upright, deep squat with the load in front, the safest way to start loading a squat.',
    cues: ['Hold the dumbbell at your chest, elbows down.', 'Sit between your heels, knees follow your toes.', 'Chest tall, drive the floor away to stand.'],
    easier: 'Box squat to a bench with no weight.', prog: 'Add 1–2 reps per set, then a slightly heavier dumbbell when all sets feel solid at RPE 7 or below.',
    mistakes: ['Knees caving in', 'Heels lifting', 'Rounding forward at the bottom'], safety: 'Use a weight you can control for every rep. Stop if you feel knee or back pain.' });
  ex({ id: 'boxsquat', name: 'Box Squat (Bodyweight)', cat: 'Squat', equip: [], legs: 'light', nodes: ['str.a1'], sets: 3, reps: '10', rest: '60 s',
    purpose: 'Learns squat depth and control using a box or chair as a target.', cues: ['Reach hips back to touch the box.', 'Do not crash down; touch and stand.', 'Arms forward for balance.'],
    easier: 'Higher box.', prog: 'Lower box, then hold a light dumbbell (Goblet Squat).', mistakes: ['Dropping onto the box', 'Knees caving'], safety: 'Use a stable box or chair against a wall.' });
  ex({ id: 'trapdl', name: 'Trap-Bar Deadlift', cat: 'Hinge', equip: ['trap'], alt: 'rdl', legs: 'heavy', sup: true, nodes: ['str.a2', 'str.b3'], sets: 3, reps: '5', rest: '2 min',
    purpose: 'A beginner-friendly way to load the hinge pattern for whole-body strength.',
    cues: ['Stand in the middle, grip the handles.', 'Hips back, chest tall, flat back.', 'Push the floor away, stand tall, lower with control.'],
    easier: 'Dumbbell Romanian Deadlift.', prog: 'Small load jumps (about 2.5–5 kg / 5–10 lb) only when all reps are solid.',
    mistakes: ['Rounding the lower back', 'Jerking the bar off the floor', 'Leaning back at the top'], safety: 'Requires a coach or qualified adult watching technique. Never test a maximum.' });
  ex({ id: 'rdl', name: 'Dumbbell Romanian Deadlift', cat: 'Hinge', equip: ['db'], alt: 'dowel', legs: 'moderate', nodes: ['str.a2'], sets: 3, reps: '8–10', rest: '90 s',
    purpose: 'Strengthens hamstrings and glutes while teaching the hip hinge.', cues: ['Soft knees.', 'Push hips back, slide dumbbells down your thighs.', 'Stop when your back would round, then drive hips forward.'],
    easier: 'Hip hinge with a dowel or broomstick.', prog: 'Slightly heavier dumbbells when all reps are smooth.', mistakes: ['Squatting the movement', 'Rounding the back'], safety: 'Keep the weights close to your legs.' });
  ex({ id: 'dowel', name: 'Hip Hinge with Dowel', cat: 'Hinge', equip: [], legs: 'none', nodes: ['str.a2'], sets: 2, reps: '10', rest: '45 s',
    purpose: 'Learns the hinge with a stick touching head, upper back and tailbone.', cues: ['Keep three points of contact.', 'Hips back, not down.'],
    easier: 'Butt-to-wall hinge.', prog: 'Dumbbell RDL.', mistakes: ['Losing head contact'], safety: 'Very low risk.' });
  ex({ id: 'split', name: 'Split Squat', cat: 'Single-leg', equip: [], legs: 'moderate', nodes: ['str.b1'], sets: 3, reps: '8 / side', rest: '60 s',
    purpose: 'Builds single-leg strength and knee control.', cues: ['Long stance, back heel up.', 'Drop the back knee straight down.', 'Front knee tracks over the middle toes.'],
    easier: 'Hold a rack or wall for balance.', prog: 'Hold dumbbells, then elevate the back foot.', mistakes: ['Front knee collapsing in', 'Short stance'], safety: 'Stop if the front knee hurts.' });
  ex({ id: 'stepup', name: 'Step-Up', cat: 'Single-leg', equip: ['box'], alt: 'split', legs: 'moderate', nodes: ['str.b1'], sets: 3, reps: '8 / side', rest: '60 s',
    purpose: 'Single-leg drive like your gather on a layup.', cues: ['Whole foot on the box.', 'Drive through the top leg, do not push off the bottom.', 'Lower slowly.'],
    easier: 'Lower box.', prog: 'Hold dumbbells.', mistakes: ['Pushing off the back foot', 'Knee caving'], safety: 'Use a stable box.' });
  ex({ id: 'latlunge', name: 'Lateral Lunge', cat: 'Single-leg', equip: [], legs: 'moderate', nodes: ['str.b1', 'str.c3'], sets: 2, reps: '6 / side', rest: '60 s',
    purpose: 'Strength in the side-to-side plane used in slides and cuts.', cues: ['Big step sideways, sit into that hip.', 'Other leg straight, both feet flat.'],
    easier: 'Smaller step.', prog: 'Hold a dumbbell at chest.', mistakes: ['Knee past toes caving inward'], safety: 'Go only to a comfortable depth.' });
  ex({ id: 'slrdl', name: 'Single-Leg RDL (Reach)', cat: 'Hinge', equip: [], legs: 'light', nodes: ['str.b1', 'str.a2'], sets: 2, reps: '6 / side', rest: '45 s',
    purpose: 'Balance and hip control on one leg.', cues: ['Hinge on one leg, back leg reaches behind.', 'Hips stay square to the floor.'],
    easier: 'Kickstand version (back toe touching).', prog: 'Hold a light dumbbell.', mistakes: ['Hips opening', 'Rushing'], safety: 'Low risk.' });
  ex({ id: 'bridge', name: 'Glute Bridge', cat: 'Hinge', equip: [], legs: 'light', nodes: ['str.a2'], sets: 3, reps: '12', rest: '45 s',
    purpose: 'Glute strength for hip extension.', cues: ['Feet flat, drive through heels.', 'Squeeze glutes at top, ribs down.'],
    easier: 'Shorter range.', prog: 'Single-leg bridge.', mistakes: ['Arching lower back'], safety: 'Low risk.' });
  ex({ id: 'pushup', name: 'Push-Up', cat: 'Push', equip: [], nodes: ['str.b2'], sets: 3, reps: '8–12', rest: '60 s',
    purpose: 'Upper-body pushing and trunk control together.', cues: ['Straight line from head to heels.', 'Hands under shoulders, elbows about 45°.', 'Chest to fist height from the floor.'],
    easier: 'Hands on a bench (incline).', prog: 'Feet elevated or slower lowering (3 s).', mistakes: ['Hips sagging', 'Flared elbows'], safety: 'Low risk.' });
  ex({ id: 'dbbench', name: 'Dumbbell Bench Press', cat: 'Push', equip: ['db', 'bench'], alt: 'pushup', nodes: ['str.b2'], sets: 3, reps: '8–10', rest: '90 s',
    purpose: 'Pressing strength with each arm working independently.', cues: ['Feet flat, shoulder blades pinched.', 'Lower to chest level with control.', 'Press up and slightly together.'],
    easier: 'Push-up.', prog: 'Heavier dumbbells in small steps.', mistakes: ['Bouncing', 'Losing control at the bottom'], safety: 'Use a weight you can lower slowly.' });
  ex({ id: 'invrow', name: 'Inverted Row', cat: 'Pull', equip: ['bar'], alt: 'bandrow', nodes: ['str.b2'], sets: 3, reps: '8–10', rest: '60 s',
    purpose: 'Pulling strength to balance pressing and protect shoulders.', cues: ['Body straight like a plank.', 'Pull chest to the bar, squeeze shoulder blades.'],
    easier: 'Higher bar (more upright).', prog: 'Lower bar or feet on a box.', mistakes: ['Hips sagging', 'Shrugging'], safety: 'Use a stable bar.' });
  ex({ id: 'dbrow', name: 'One-Arm Dumbbell Row', cat: 'Pull', equip: ['db'], alt: 'bandrow', nodes: ['str.b2'], sets: 3, reps: '10 / side', rest: '60 s',
    purpose: 'Back strength and anti-rotation.', cues: ['Hand and knee on a bench, flat back.', 'Pull elbow toward your hip.'],
    easier: 'Band row.', prog: 'Heavier dumbbell.', mistakes: ['Twisting the torso', 'Yanking'], safety: 'Low risk.' });
  ex({ id: 'bandrow', name: 'Band Row', cat: 'Pull', equip: ['band'], nodes: ['str.b2'], sets: 3, reps: '12', rest: '45 s',
    purpose: 'Simple pulling at home or as an easier option.', cues: ['Anchor at chest height.', 'Pull elbows back, squeeze.'], easier: 'Lighter band.', prog: 'Heavier band or one arm.', mistakes: ['Shrugging'], safety: 'Check the anchor is secure.' });
  ex({ id: 'kneelpress', name: 'Half-Kneeling Dumbbell Press', cat: 'Push', equip: ['db'], alt: 'pushup', nodes: ['str.b2', 'str.a3'], sets: 3, reps: '8 / side', rest: '60 s',
    purpose: 'Overhead pressing with core stability.', cues: ['One knee down, glute of that side squeezed.', 'Press up without leaning back.'],
    easier: 'Lighter dumbbell.', prog: 'Standing single-arm press.', mistakes: ['Arching back', 'Leaning'], safety: 'Skip if overhead pressing hurts your shoulder.' });
  ex({ id: 'deadbug', name: 'Dead Bug', cat: 'Core', equip: [], nodes: ['str.a3'], sets: 2, reps: '8 / side', rest: '45 s',
    purpose: 'Trunk control while arms and legs move.', cues: ['Low back pressed into the floor.', 'Opposite arm and leg reach slowly, exhale.'],
    easier: 'Legs only.', prog: 'Hold a light weight in your hands.', mistakes: ['Back arching off floor'], safety: 'Low risk.' });
  ex({ id: 'sideplank', name: 'Side Plank', cat: 'Core', equip: [], nodes: ['str.a3'], sets: 2, reps: '20–30 s / side', rest: '30 s',
    purpose: 'Lateral core strength for contact and balance.', cues: ['Elbow under shoulder, straight line.', 'Hips high.'],
    easier: 'Knees bent.', prog: 'Top leg raised.', mistakes: ['Hips sagging'], safety: 'Low risk.' });
  ex({ id: 'pallof', name: 'Pallof Press', cat: 'Core', equip: ['band'], alt: 'deadbug', nodes: ['str.a3'], sets: 2, reps: '10 / side', rest: '45 s',
    purpose: 'Resisting rotation, like protecting the ball through contact.', cues: ['Band at chest height to your side.', 'Press straight out, do not let it twist you.'],
    easier: 'Lighter band.', prog: 'Half-kneeling or step further out.', mistakes: ['Rotating', 'Holding breath'], safety: 'Low risk.' });
  ex({ id: 'copen', name: 'Short-Lever Copenhagen Plank', cat: 'Core', equip: ['bench'], alt: 'sideplank', nodes: ['str.a3', 'str.b1'], sets: 2, reps: '15–20 s / side', rest: '45 s',
    purpose: 'Inner-thigh and trunk strength for cutting.', cues: ['Top knee on the bench, lift hips.', 'Body straight.'],
    easier: 'Side plank.', prog: 'Longer hold.', mistakes: ['Hips dropping'], safety: 'Stop if groin pain.' });
  ex({ id: 'calf', name: 'Single-Leg Calf Raise', cat: 'Landing', equip: [], legs: 'light', nodes: ['str.c1'], sets: 2, reps: '12 / side', rest: '45 s',
    purpose: 'Ankle and calf strength for jumping and landing.', cues: ['Full range: heel down low, up high.', 'Slow lowering.'],
    easier: 'Both legs.', prog: 'Hold a dumbbell.', mistakes: ['Bouncing'], safety: 'Low risk.' });
  ex({ id: 'snapdown', name: 'Snap-Down to Stick', cat: 'Landing', equip: [], legs: 'light', nodes: ['str.c1'], sets: 3, reps: '3–5', rest: '45 s',
    purpose: 'Teaches quiet, controlled landings.', cues: ['Rise on toes, arms up, then snap into an athletic stance.', 'Land quietly and hold for 2 seconds.'],
    easier: 'Slow drop into stance.', prog: 'Drop from a small box.', mistakes: ['Loud landings', 'Knees caving'], safety: 'Quality over quantity.' });
  ex({ id: 'boxjump', name: 'Box Jump (Step Down)', cat: 'Power', equip: ['box'], alt: 'broad', legs: 'light', nodes: ['str.d1'], sets: 3, reps: '3', rest: '90 s',
    purpose: 'Low-volume jumping with a soft landing.', cues: ['Use a box you clear easily.', 'Land soft in the same stance you took off.', 'Step down, never jump down.'],
    easier: 'Lower box.', prog: 'Slightly higher box only if landings stay quiet.', mistakes: ['Box too high', 'Landing in a deep squat'], safety: 'Low reps, full rest. Stop if knees or shins hurt.' });
  ex({ id: 'broad', name: 'Broad Jump & Stick', cat: 'Power', equip: [], legs: 'light', nodes: ['str.d1', 'str.c1'], sets: 3, reps: '3', rest: '90 s',
    purpose: 'Horizontal power with a controlled landing.', cues: ['Swing arms, jump forward.', 'Stick the landing for 2 seconds.'],
    easier: 'Shorter jump.', prog: 'Two jumps in a row.', mistakes: ['Falling forward on landing'], safety: 'Grippy surface.' });
  ex({ id: 'latbound', name: 'Lateral Bound & Stick', cat: 'Power', equip: [], legs: 'light', nodes: ['str.c3', 'str.c1'], sets: 3, reps: '3 / side', rest: '60 s',
    purpose: 'Side-to-side force and control for cuts and slides.', cues: ['Push off one leg sideways.', 'Land on the other leg, stick for 2 seconds.'],
    easier: 'Short hop.', prog: 'Longer bound.', mistakes: ['Knee caving on landing'], safety: 'Stop if you cannot stick the landing.' });
  ex({ id: 'pogo', name: 'Low Pogo Hops', cat: 'Landing', equip: [], legs: 'light', nodes: ['str.c1'], sets: 2, reps: '10', rest: '45 s',
    purpose: 'Ankle stiffness and rhythm.', cues: ['Small quick hops on the balls of your feet.', 'Knees soft but not bending much.'],
    easier: 'In-place calf bounces.', prog: 'Forward and back hops.', mistakes: ['Heavy landings'], safety: 'Low height, low reps.' });
  ex({ id: 'mbthrow', name: 'Med-Ball Chest Pass / Scoop Toss', cat: 'Power', equip: ['mb'], alt: 'pushup', nodes: ['str.d1', 'str.b2'], sets: 3, reps: '5', rest: '60 s',
    purpose: 'Upper-body and whole-body power with low impact.', cues: ['Throw with full intent at a wall.', 'Reset fully between reps.'],
    easier: 'Lighter ball.', prog: 'Rotational scoop toss.', mistakes: ['Ball too heavy so it gets slow'], safety: 'Use a wall that can take it.' });
  ex({ id: 'fallstart', name: 'Falling Starts', cat: 'Acceleration', equip: [], legs: 'light', nodes: ['str.c2'], sets: 4, reps: '1 x 10 m', rest: '60 s',
    purpose: 'Acceleration posture: lean, push, drive.', cues: ['Lean forward until you must step.', 'Drive knees, push the ground back.'],
    easier: 'Wall-drive marches.', prog: 'Start from a basketball stance.', mistakes: ['Standing up too early'], safety: 'Warm up first.' });
  ex({ id: 'decel', name: 'Three-Step Deceleration', cat: 'Landing', equip: [], legs: 'light', nodes: ['str.c1', 'str.c3'], sets: 3, reps: '3', rest: '60 s',
    purpose: 'Stopping under control, the base for change of direction.', cues: ['Run 5 m, stop in 3 steps, lower hips.', 'Finish in a balanced stance.'],
    easier: 'Jog speed.', prog: 'Stop then cut.', mistakes: ['Stopping upright', 'Knees caving'], safety: 'Low volume.' });

  MX.EXERCISES = E;
  MX.EXERCISE = {};
  E.forEach(function (e) { MX.EXERCISE[e.id] = e; });

  /* Workout templates. legs = overall lower-body stress used by scheduling. */
  MX.WORKOUTS = [
    { id: 'w-foundA', name: 'Foundation A: Squat, Push, Pull, Core', dur: 40, legs: 'moderate', load: 2, where: 'gym',
      purpose: 'Balanced whole-body session that builds the base patterns.',
      items: [['snapdown', 2, '3'], ['goblet', 3, '8'], ['pushup', 3, '8–12'], ['dbrow', 3, '10 / side'], ['rdl', 2, '10'], ['deadbug', 2, '8 / side']] },
    { id: 'w-foundB', name: 'Foundation B: Hinge, Single-Leg, Press, Core', dur: 40, legs: 'moderate', load: 2, where: 'gym',
      purpose: 'Single-leg strength and landing control with balanced upper-body work.',
      items: [['broad', 3, '3'], ['split', 3, '8 / side'], ['slrdl', 2, '6 / side'], ['kneelpress', 3, '8 / side'], ['invrow', 3, '8–10'], ['sideplank', 2, '20–30 s / side']] },
    { id: 'w-upper', name: 'Upper Body & Core (Game-Week Safe)', dur: 30, legs: 'none', load: 1, where: 'gym',
      purpose: 'Strength work that leaves your legs fresh for games and practices.',
      items: [['dbbench', 3, '8–10'], ['invrow', 3, '8–10'], ['kneelpress', 2, '8 / side'], ['dbrow', 2, '10 / side'], ['pallof', 2, '10 / side'], ['deadbug', 2, '8 / side']] },
    { id: 'w-move', name: 'Landing & Movement Mechanics', dur: 25, legs: 'light', load: 1, where: 'any', explosive: true,
      purpose: 'Low-volume jumping, landing, acceleration and deceleration technique.',
      items: [['pogo', 2, '10'], ['snapdown', 3, '3–5'], ['latbound', 3, '3 / side'], ['decel', 3, '3'], ['fallstart', 4, '1 x 10 m'], ['calf', 2, '12 / side']] },
    { id: 'w-home', name: 'At-Home Bodyweight Strength', dur: 25, legs: 'light', load: 1, where: 'home',
      purpose: 'No equipment needed. Builds the same patterns when the weight room is closed.',
      items: [['boxsquat', 3, '10'], ['split', 2, '8 / side'], ['bridge', 3, '12'], ['pushup', 3, '8–12'], ['deadbug', 2, '8 / side'], ['sideplank', 2, '20–30 s / side'], ['calf', 2, '12 / side']] },
    { id: 'w-strength', name: 'Strength Builder (Supervised)', dur: 45, legs: 'heavy', load: 3, where: 'gym', sup: true,
      purpose: 'For players with consistent technique and a qualified adult watching. Adds gradual load to the hinge.',
      items: [['trapdl', 3, '5'], ['stepup', 3, '8 / side'], ['dbbench', 3, '8'], ['dbrow', 3, '10 / side'], ['copen', 2, '15–20 s / side'], ['pallof', 2, '10 / side']] }
  ];
  MX.WORKOUT = {};
  MX.WORKOUTS.forEach(function (w) { MX.WORKOUT[w.id] = w; });

  /* Achievements. Each test receives the derived summary object. One-time by construction. */
  MX.ACHIEVEMENTS = [
    { id: 'first', name: 'Tip-Off', desc: 'Log your first training session.', test: function (s) { return s.sessions >= 1; } },
    { id: 'ten', name: 'Ten Deep', desc: 'Log 10 training sessions.', test: function (s) { return s.sessions >= 10; } },
    { id: 'twentyfive', name: 'Quarter Century', desc: 'Log 25 training sessions.', test: function (s) { return s.sessions >= 25; } },
    { id: 'fifty', name: 'Workhorse', desc: 'Log 50 training sessions.', test: function (s) { return s.sessions >= 50; }, title: 'Workhorse' },
    { id: 'gym1', name: 'Iron Foundations', desc: 'Complete your first weight-room workout.', test: function (s) { return s.gym >= 1; } },
    { id: 'technique', name: 'Technique First', desc: '6 workouts where every exercise was rated solid technique.', test: function (s) { return s.solidGym >= 6; }, title: 'Technician' },
    { id: 'game1', name: 'Game Report', desc: 'Log your first game-application report.', test: function (s) { return s.games >= 1; } },
    { id: 'baseline', name: 'Baseline Set', desc: 'Complete 3 different baseline challenges.', test: function (s) { return s.baselines >= 3; } },
    { id: 'balanced', name: 'Complete Guard', desc: 'Train 5 different skill areas within 14 days.', test: function (s) { return s.maxSpread14 >= 5; }, title: 'Complete Guard' },
    { id: 'bench1', name: 'Benchmark Hit', desc: 'Reach benchmark on any skill node.', test: function (s) { return s.tierCounts.benchmark >= 1; } },
    { id: 'pressure1', name: 'Pressure Proof', desc: 'Apply a skill under pressure (node tier).', test: function (s) { return s.tierCounts.pressure >= 1; } },
    { id: 'game1node', name: 'It Showed Up', desc: 'A skill node reaches game-applied.', test: function (s) { return s.tierCounts.game >= 1; }, title: 'Gamer' },
    { id: 'branch', name: 'Branch Master', desc: 'Master all three nodes in one branch.', test: function (s) { return s.fullBranches >= 1; } },
    { id: 'boss1', name: 'Boss Down', desc: 'Clear your first boss challenge.', test: function (s) { return s.bosses >= 1; }, title: 'Boss Slayer' },
    { id: 'boss3', name: 'Gauntlet Runner', desc: 'Clear 3 boss challenges.', test: function (s) { return s.bosses >= 3; } },
    { id: 'sepboss', name: 'Downhill Threat', desc: 'Clear the Keep the Advantage boss.', test: function (s) { return s.bossSet['sep.boss']; }, title: 'Downhill Threat' },
    { id: 'shtboss', name: 'Pull-Up Artist', desc: 'Pass the Standardized Shooting Test.', test: function (s) { return s.bossSet['sht.boss']; }, title: 'Pull-Up Artist' },
    { id: 'pr5', name: 'Record Breaker', desc: 'Set 5 personal records.', test: function (s) { return s.prs >= 5; } },
    { id: 'partner5', name: 'Live Reps', desc: 'Complete 5 partner or defender quests.', test: function (s) { return s.partnerQuests >= 5; } },
    { id: 'recovery3', name: 'Recovery Is Training', desc: 'Log 3 recovery activities or rest days.', test: function (s) { return s.recovery >= 3; } },
    { id: 'readiness7', name: 'Know Your Body', desc: 'Do 7 readiness check-ins.', test: function (s) { return s.checkins >= 7; } },
    { id: 'transfer', name: 'Drill to Game', desc: 'A skill area with a benchmark node and 2 "worked" game reports.', test: function (s) { return s.transferSkills >= 1; }, title: 'Two-Way Translator' }
  ];

  MX.LEVEL_TITLES = [[1, 'Prospect'], [3, 'Rotation Guard'], [5, 'Starter'], [8, 'Floor General'], [11, 'All-League'], [15, 'Ascended']];

  MX.DEFAULT_SCHEDULE = [
    // day: 0 Sun .. 6 Sat
    { type: 'school', title: 'School', days: [1, 2, 3, 4, 5], start: '08:30', end: '15:15' },
    { type: 'practice', title: 'School team practice', days: [2, 4], start: '15:30', end: '17:00' },
    { type: 'practice', title: 'Club practice', days: [6], start: '10:00', end: '12:00' },
    { type: 'game', title: 'School game', days: [5], start: '16:30', end: '18:00' },
    { type: 'court', title: 'Gym open (court)', days: [1, 3], start: '15:30', end: '17:30' },
    { type: 'court', title: 'Park court', days: [0], start: '13:00', end: '15:00' },
    { type: 'gym', title: 'Weight room open', days: [1, 3], start: '15:30', end: '16:30' },
    { type: 'free', title: 'Free time', days: [1, 3], start: '17:30', end: '19:00' },
    { type: 'free', title: 'Free time', days: [0], start: '12:00', end: '17:00' }
  ];

  MX.EVENT_TYPES = {
    school: { name: 'School', load: 0 },
    practice: { name: 'Team practice', load: 3, legs: 'moderate', dur: 90 },
    game: { name: 'Game / tournament', load: 3, legs: 'moderate', dur: 60, important: true },
    sport: { name: 'Other sport', load: 2, legs: 'moderate', dur: 60 },
    free: { name: 'Free time', load: 0 },
    court: { name: 'Court access', load: 0, facility: 'court' },
    gym: { name: 'Weight-room access', load: 0, facility: 'gym' },
    strength: { name: 'Planned strength session', load: 2, legs: 'moderate', dur: 45 },
    rest: { name: 'Rest', load: 0 }
  };
})(globalThis.MX = globalThis.MX || {});
