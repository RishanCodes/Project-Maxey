/**
 * Drill and test library for the 90-day program. Original content, written for this app.
 * tier: 1 = fundamentals, 2 = building, 3 = advanced / game speed.
 * phases: F = Foundation (weeks 1-4), B = Build (5-8), G = Game speed (9-13).
 * impact: jump/landing load. 0 none, 1 low (pogos, landings), 2 high (max-effort jumps, bounds).
 */
import type { Skill } from "../schema";

export type Phase = "F" | "B" | "G";
export type Need = "hoop" | "court" | "gym" | "partner";
export type DrillSlot = Skill | "warmup" | "cooldown" | "recovery";

export interface ProgramDrill {
  id: string;
  name: string;
  slot: DrillSlot;
  tier: 1 | 2 | 3;
  phases: Phase[];
  minutes: number;
  needs: Need[];
  impact: 0 | 1 | 2;
  how: string;
  cues: string[];
  dose: string;
  /** Ask for makes / attempts after the drill. */
  track?: { label: string; attempts: number };
  minAge?: "13-15" | "16-18";
  /** A stand-in for when there's no hoop; left out when you have one. */
  noHoopOnly?: boolean;
}

const FBG: Phase[] = ["F", "B", "G"], FB: Phase[] = ["F", "B"], BG: Phase[] = ["B", "G"], F: Phase[] = ["F"], G: Phase[] = ["G"];

export const DRILLS: ProgramDrill[] = [
  /* ---- warm-up / cool-down / recovery ---- */
  { id: "w-dynamic", name: "Dynamic warm-up", slot: "warmup", tier: 1, phases: FBG, minutes: 5, needs: [], impact: 0, dose: "5 min, easy to brisk",
    how: "Jog, high knees, butt kicks, skips, walking lunges with a twist, leg swings front-back and side-side.", cues: ["Start slow, finish at game pace", "Breathe through your nose for the first minute"] },
  { id: "w-ball", name: "Ball activation", slot: "warmup", tier: 1, phases: FBG, minutes: 2, needs: [], impact: 0, dose: "2 min",
    how: "Fingertip taps, wraps around head, waist and knees, then hard pound dribbles with each hand.", cues: ["Fingertips, not palms", "Get the ball moving fast"] },
  { id: "w-landing", name: "Landing prep", slot: "warmup", tier: 1, phases: FBG, minutes: 2, needs: [], impact: 1, dose: "2 × 5 snap-downs, 10 pogos",
    how: "Snap down from your toes into an athletic stance and freeze, then small quick pogo hops.", cues: ["Land quiet", "Knees track over toes, not inward"] },
  { id: "c-ft", name: "Cool-down free throws", slot: "cooldown", tier: 1, phases: FBG, minutes: 3, needs: ["hoop"], impact: 0, dose: "10 free throws", track: { label: "Free throws made", attempts: 10 },
    how: "Same routine every shot while you're tired. This is when it counts.", cues: ["Same routine every time", "Hold your follow-through"] },
  { id: "c-stretch", name: "Cool-down stretch", slot: "cooldown", tier: 1, phases: FBG, minutes: 3, needs: [], impact: 0, dose: "3 min",
    how: "Calves, hip flexors, hamstrings, glutes. 30 seconds each side.", cues: ["Easy breathing", "No bouncing"] },
  { id: "r-mobility", name: "Mobility flow", slot: "recovery", tier: 1, phases: FBG, minutes: 10, needs: [], impact: 0, dose: "10 min",
    how: "World's greatest stretch, 90/90 hips, ankle rocks, cat-cow, thoracic rotations, deep squat hold.", cues: ["Move slowly", "Stay out of pain"] },
  { id: "r-easy", name: "Easy walk, bike or shootaround", slot: "recovery", tier: 1, phases: FBG, minutes: 10, needs: [], impact: 0, dose: "10–15 min, easy",
    how: "Low-intensity movement to help recovery. If you have a hoop, light form shooting counts.", cues: ["You should be able to hold a conversation"] },

  /* ---- ball handling ---- */
  { id: "h-pound", name: "Stationary pound series", slot: "handles", tier: 1, phases: FB, minutes: 4, needs: [], impact: 0, dose: "3 × 30 s per hand: high, waist, ankle",
    how: "Hard dribbles in place at three heights, each hand.", cues: ["Pound it, don't pat it", "Eyes up: read a spot on the wall"] },
  { id: "h-fig8", name: "Figure-8 and wraps", slot: "handles", tier: 1, phases: F, minutes: 3, needs: [], impact: 0, dose: "3 × 30 s",
    how: "Figure-8 dribbles through the legs, then around-the-world wraps.", cues: ["Low stance", "Speed comes after control"] },
  { id: "h-weak", name: "Weak-hand only series", slot: "handles", tier: 1, phases: FB, minutes: 4, needs: [], impact: 0, dose: "4 min weak hand only",
    how: "Pounds, in-and-outs and walking dribbles with your weak hand only.", cues: ["Make it boring-easy", "Same rhythm as your strong hand"] },
  { id: "h-moves", name: "Cross, between, behind", slot: "handles", tier: 1, phases: FB, minutes: 5, needs: [], impact: 0, dose: "30 s per move × 2",
    how: "Stationary crossovers, between-the-legs and behind-the-back, both directions.", cues: ["Ball stays below the knee on the cross", "Snap it, don't swing it"] },
  { id: "h-2ball", name: "Two-ball dribbling", slot: "handles", tier: 2, phases: FBG, minutes: 5, needs: [], impact: 0, dose: "30 s each: together, alternate, high-low, in-and-out",
    how: "Two balls at once. Use a second ball, or a heavier ball in your weak hand.", cues: ["Weak hand sets the rhythm", "Eyes up"] },
  { id: "h-tennis", name: "Tennis-ball toss dribble", slot: "handles", tier: 2, phases: BG, minutes: 4, needs: [], impact: 0, dose: "3 × 40 s",
    how: "Dribble with one hand, toss and catch a tennis ball with the other. Switch hands.", cues: ["Ball never stops", "Catch with your eyes, dribble by feel"] },
  { id: "h-retreat", name: "Pressure escape", slot: "handles", tier: 2, phases: BG, minutes: 4, needs: [], impact: 0, dose: "8 reps each side",
    how: "Attack 3 dribbles, retreat 2 dribbles keeping your body between ball and imaginary defender, then cross and re-attack.", cues: ["Shoulders stay square", "Protect with your off arm"] },
  { id: "h-combo", name: "Two-move combos into attack", slot: "handles", tier: 2, phases: BG, minutes: 6, needs: ["court"], impact: 0, dose: "10 reps each direction",
    how: "From the wing: two moves (for example hesi-cross, between-behind), then explode two dribbles to the rim or into a pull-up.", cues: ["Sell the first move", "Change speed, not just direction"] },
  { id: "h-hesi", name: "Hesitation into first step", slot: "handles", tier: 3, phases: BG, minutes: 5, needs: [], impact: 1, dose: "4 × 5 reps each side",
    how: "Jog the ball up, hesitate (shoulders up, eyes to rim), then explode the first step past a cone or bottle.", cues: ["Slow to fast", "Long first step, low shoulder"] },
  { id: "h-fullcourt", name: "Full-court change of pace", slot: "handles", tier: 3, phases: G, minutes: 5, needs: ["court"], impact: 1, dose: "6 trips",
    how: "Full court: alternate 3 dribbles at half speed with 3 at full speed, finish with a move at each line.", cues: ["Game speed", "Finish every trip strong"] },
  { id: "h-reactive", name: "Partner reaction handles", slot: "handles", tier: 3, phases: G, minutes: 5, needs: ["partner"], impact: 0, dose: "5 × 30 s",
    how: "Partner points left, right or up. Make the matching move instantly while keeping your dribble alive.", cues: ["React, don't guess", "Eyes on your partner"] },

  /* ---- shooting ---- */
  { id: "s-lying", name: "Lying-down form shots", slot: "shooting", tier: 1, phases: FB, minutes: 3, needs: [], impact: 0, dose: "3 × 15", noHoopOnly: true,
    how: "On your back, shoot the ball straight up with one hand and catch it. Works without a hoop.", cues: ["Ball comes straight back down", "Wrist snap, fingers to the ceiling"] },
  { id: "s-wall", name: "Wall target shooting", slot: "shooting", tier: 1, phases: FB, minutes: 4, needs: [], impact: 0, dose: "50 shots", noHoopOnly: true,
    how: "Pick a target high on a wall. Full shooting motion with legs, hit the target with backspin.", cues: ["Legs start the shot", "Same release point every time"] },
  { id: "s-form", name: "One-hand form shooting", slot: "shooting", tier: 1, phases: FBG, minutes: 5, needs: ["hoop"], impact: 0, dose: "10 makes × 3 spots, close range", track: { label: "Makes", attempts: 40 },
    how: "Close to the rim, one hand only, swish focus. Step back only after 10 makes.", cues: ["Elbow under the ball", "Hold the follow-through"] },
  { id: "s-5spot", name: "5-spot mid-range", slot: "shooting", tier: 1, phases: FB, minutes: 8, needs: ["hoop"], impact: 0, dose: "5 makes per spot", track: { label: "Makes / attempts", attempts: 40 },
    how: "Baseline, wing, top, wing, baseline at 15 feet. Count your attempts.", cues: ["Feet set before the ball arrives", "Same arc every shot"] },
  { id: "s-catch", name: "Catch-and-shoot (spin outs)", slot: "shooting", tier: 2, phases: FB, minutes: 8, needs: ["hoop"], impact: 0, dose: "50 shots", track: { label: "Makes", attempts: 50 },
    how: "Spin the ball out to yourself, catch on a 1-2 or hop step, and shoot in rhythm.", cues: ["Hands ready before the catch", "Shoot on the way up, no dip"] },
  { id: "s-pullup", name: "One-dribble pull-ups", slot: "shooting", tier: 2, phases: BG, minutes: 8, needs: ["hoop"], impact: 0, dose: "10 each direction × 2 spots", track: { label: "Makes", attempts: 40 },
    how: "From the wing, one hard dribble left or right, stop on a dime and rise.", cues: ["Inside foot stops you", "Go straight up, don't drift"] },
  { id: "s-3pt", name: "3-point spot-up", slot: "shooting", tier: 2, phases: BG, minutes: 10, needs: ["hoop"], impact: 0, dose: "10 shots × 5 spots", track: { label: "Threes made", attempts: 50 },
    how: "Corner, wing, top, wing, corner. Only move back to three once mid-range is above 50%.", cues: ["Legs give the range", "Finish tall"] },
  { id: "s-relocate", name: "Relocation shooting", slot: "shooting", tier: 3, phases: G, minutes: 8, needs: ["hoop"], impact: 0, dose: "40 shots", track: { label: "Makes", attempts: 40 },
    how: "Shoot, sprint to a new spot, catch and shoot again. No standing still.", cues: ["Feet ready on the catch", "Sprint between shots"] },
  { id: "s-fatigue", name: "Fatigue shooting", slot: "shooting", tier: 3, phases: G, minutes: 8, needs: ["hoop", "court"], impact: 1, dose: "5 rounds: sprint baseline-to-baseline, then 4 shots", track: { label: "Makes", attempts: 20 },
    how: "Get tired, then shoot. Games are played tired.", cues: ["Slow your breath before the shot", "Same form as when fresh"] },
  { id: "s-moves", name: "Shot moves", slot: "shooting", tier: 3, phases: G, minutes: 8, needs: ["hoop"], impact: 0, dose: "8 reps each: jab-shot, shot fake-one dribble, step-back", track: { label: "Makes", attempts: 24 },
    how: "Game-speed counters before the shot.", cues: ["Sell the fake with your eyes", "Balanced on every rise"] },

  /* ---- finishing ---- */
  { id: "f-footwork", name: "Finishing footwork (no hoop)", slot: "finishing", tier: 1, phases: FB, minutes: 5, needs: [], impact: 0, dose: "8 reps each: 1-2 step, pro-hop, Euro, inside foot",
    how: "Walk then jog through the footwork with the ball, ending in a finishing pose.", cues: ["Chin the ball through the gather", "Last step points at the rim"] },
  { id: "f-mikan", name: "Mikan drill", slot: "finishing", tier: 1, phases: FBG, minutes: 4, needs: ["hoop"], impact: 0, dose: "3 × 60 s", track: { label: "Makes (best 60 s)", attempts: 30 },
    how: "Alternating layups under the rim, right hand right side, left hand left side.", cues: ["Ball never drops below your chin", "Soft off the glass"] },
  { id: "f-layups", name: "Layups both sides, both hands", slot: "finishing", tier: 1, phases: FB, minutes: 5, needs: ["hoop"], impact: 0, dose: "10 makes each side and hand", track: { label: "Makes / attempts", attempts: 44 },
    how: "Regular layups, then off-hand layups, from both sides.", cues: ["High knee on the jump", "Use the square on the glass"] },
  { id: "f-weak", name: "Weak-hand finishing ladder", slot: "finishing", tier: 2, phases: FB, minutes: 5, needs: ["hoop"], impact: 0, dose: "5 makes each: layup, reverse, power, floater",
    how: "Every finish with your weak hand only, moving up the ladder.", cues: ["Make it, then make it faster"] },
  { id: "f-euro", name: "Euro step and pro-hop finishes", slot: "finishing", tier: 2, phases: BG, minutes: 6, needs: ["hoop"], impact: 1, dose: "8 each side",
    how: "From the wing, attack and finish with a Euro, then with a pro-hop.", cues: ["Big lateral step on the Euro", "Two-foot landing on the pro-hop, then up strong"] },
  { id: "f-reverse", name: "Reverses and up-and-unders", slot: "finishing", tier: 2, phases: BG, minutes: 6, needs: ["hoop"], impact: 0, dose: "8 each side",
    how: "Baseline drives into reverse layups, then post up-and-unders.", cues: ["Use the rim to protect the ball", "Patience on the up-and-under"] },
  { id: "f-floater", name: "Floaters and runners", slot: "finishing", tier: 2, phases: BG, minutes: 6, needs: ["hoop"], impact: 0, dose: "20 attempts", track: { label: "Floaters made", attempts: 20 },
    how: "Off one foot and off two, from 6 to 10 feet, high arc over an imaginary big.", cues: ["Release early, high and soft", "Fingertips push up, not out"] },
  { id: "f-contact", name: "Contact finishing", slot: "finishing", tier: 2, phases: BG, minutes: 6, needs: ["hoop"], impact: 1, dose: "10 each side", track: { label: "And-ones made", attempts: 20 },
    how: "Two-foot power gather, chin the ball, finish through imagined contact and hold your landing. With a partner, have them bump you lightly with a pad or forearm.", cues: ["Rip it high and tight", "Absorb the bump with your hips, eyes stay on the rim"] },
  { id: "f-speed", name: "Full-speed finishes", slot: "finishing", tier: 3, phases: G, minutes: 6, needs: ["hoop", "court"], impact: 1, dose: "10 trips, alternate sides",
    how: "Start at half court, attack at full speed, pick the finish late.", cues: ["Decide in the last two steps", "Don't slow down to finish"] },
  { id: "f-partner-contact", name: "Partner contact finishing", slot: "finishing", tier: 3, phases: G, minutes: 6, needs: ["hoop", "partner"], impact: 1, dose: "12 reps", track: { label: "Makes through contact", attempts: 12 },
    how: "Partner with a pad or forearm bumps you mid-air at random. Finish anyway.", cues: ["Strong core in the air", "Finish high off the glass"] },

  /* ---- explosiveness ---- */
  { id: "x-landing", name: "Stick landings", slot: "explosiveness", tier: 1, phases: F, minutes: 4, needs: [], impact: 1, dose: "3 × 5",
    how: "Small jumps forward and to the side, freeze each landing for 2 seconds.", cues: ["Quiet feet", "Hips back, knees out"] },
  { id: "x-pogo", name: "Pogo hops", slot: "explosiveness", tier: 1, phases: FB, minutes: 3, needs: [], impact: 1, dose: "3 × 20",
    how: "Quick bounces on the balls of your feet with stiff ankles and barely bent knees.", cues: ["Minimal ground time", "Stay tall"] },
  { id: "x-sprint", name: "Acceleration starts", slot: "explosiveness", tier: 1, phases: FBG, minutes: 4, needs: ["court"], impact: 1, dose: "6 × 10 m, walk back",
    how: "Start from an athletic stance, explode for 10 meters.", cues: ["Push the ground back", "Drive your arms"] },
  { id: "x-squatjump", name: "Squat jumps (step down)", slot: "explosiveness", tier: 2, phases: FB, minutes: 5, needs: [], impact: 2, dose: "4 × 4, full rest",
    how: "Max-effort jump from a half squat. Land soft, reset each rep. Onto a box if you have one, then step down.", cues: ["Every rep is max effort", "Quality over quantity: stop when height drops"] },
  { id: "x-broad", name: "Broad jumps", slot: "explosiveness", tier: 2, phases: BG, minutes: 5, needs: [], impact: 2, dose: "4 × 3, full rest",
    how: "Jump as far as possible and stick it.", cues: ["Arm swing drives the jump", "Stick before you celebrate"] },
  { id: "x-approach", name: "Approach jumps", slot: "explosiveness", tier: 2, phases: BG, minutes: 5, needs: [], impact: 2, dose: "3 × 4 off one foot, 3 × 4 off two",
    how: "2–3 step approach, jump and touch the highest point you can (rim, backboard or a wall mark).", cues: ["Last step is quick and flat", "Reach with the opposite hand of your takeoff foot"] },
  { id: "x-lateral", name: "Lateral bounds", slot: "explosiveness", tier: 3, phases: BG, minutes: 5, needs: [], impact: 2, dose: "3 × 5 each side",
    how: "Bound side to side from one leg to the other, stick each landing for a second.", cues: ["Push off the outside foot", "Control before speed"] },
  { id: "x-firststep", name: "Reactive first step", slot: "explosiveness", tier: 3, phases: G, minutes: 4, needs: [], impact: 1, dose: "8 reps each direction",
    how: "React to a clap, a dropped ball or a phone timer and explode your first step.", cues: ["Low and long", "No false step backward"] },
  { id: "x-depth", name: "Depth drop to jump", slot: "explosiveness", tier: 3, phases: G, minutes: 5, needs: [], impact: 2, dose: "3 × 3 from a low step", minAge: "16-18",
    how: "Step off a low step, land and jump straight up as fast as possible.", cues: ["Short ground contact", "Only with perfect landings"] },

  /* ---- defense ---- */
  { id: "d-stance", name: "Stance holds and slides", slot: "defense", tier: 1, phases: FB, minutes: 4, needs: [], impact: 0, dose: "4 × 20 s hold + slide",
    how: "Wide stance, active hands. Hold, then slide 3 steps each way without crossing your feet.", cues: ["Head stays level", "Push off the trail foot"] },
  { id: "d-closeout", name: "Close-outs", slot: "defense", tier: 1, phases: FBG, minutes: 4, needs: [], impact: 1, dose: "10 reps",
    how: "Sprint 2/3 of the way, chop your feet, high hand on the shot, then slide to cut off a drive.", cues: ["Sprint, then chop", "High hand, stay balanced"] },
  { id: "d-zigzag", name: "Zig-zag slides", slot: "defense", tier: 2, phases: BG, minutes: 5, needs: ["court"], impact: 1, dose: "4 trips",
    how: "Slide on a diagonal to each line, drop-step, slide back the other way.", cues: ["Open your hips on the drop step", "Stay low the whole way"] },
  { id: "d-recover", name: "Sprint back and contest", slot: "defense", tier: 3, phases: G, minutes: 4, needs: ["court"], impact: 1, dose: "6 reps",
    how: "Start at half court, sprint back to the paint, then close out and contest.", cues: ["Ball side first", "Contest without fouling"] },
  { id: "d-mirror", name: "Mirror drill", slot: "defense", tier: 3, phases: BG, minutes: 4, needs: ["partner"], impact: 1, dose: "5 × 20 s",
    how: "Partner shuffles randomly; you mirror them without crossing your feet.", cues: ["Watch the hips, not the head"] },

  /* ---- basketball IQ ---- */
  { id: "i-film", name: "Film study", slot: "iq", tier: 1, phases: FBG, minutes: 10, needs: [], impact: 0, dose: "10 min, write 3 notes",
    how: "Watch one player at your position for a full quarter. Note one read, one habit, one move to steal.", cues: ["Watch off-ball, not just the ball"] },
  { id: "i-visual", name: "Read visualization", slot: "iq", tier: 1, phases: F, minutes: 5, needs: [], impact: 0, dose: "5 min",
    how: "Pick a play (pick-and-roll, closeout, transition). Picture each defender reaction and your best answer to it.", cues: ["Defense helps, so who's open?"] },
  { id: "i-decision", name: "Called-out decisions", slot: "iq", tier: 2, phases: BG, minutes: 6, needs: [], impact: 0, dose: "20 reps",
    how: "Attack, and as you start, a partner, a random-number app or a coin decides: shoot, drive or kick out. React instantly.", cues: ["Decide fast, commit fully"] },
  { id: "i-partner", name: "2-on-0 reads", slot: "iq", tier: 3, phases: G, minutes: 6, needs: ["partner", "hoop"], impact: 0, dose: "10 trips",
    how: "With a partner: drive, they relocate, you decide pass or finish based on where they end up.", cues: ["Eyes up early", "Pass on time, on target"] },

  /* ---- conditioning ---- */
  { id: "k-rope", name: "Jump rope or jacks", slot: "conditioning", tier: 1, phases: FB, minutes: 4, needs: [], impact: 1, dose: "4 × 45 s on / 15 s off",
    how: "Jump rope, or jumping jacks if you don't have a rope.", cues: ["Light on your feet"] },
  { id: "k-tempo", name: "Tempo intervals", slot: "conditioning", tier: 1, phases: FBG, minutes: 6, needs: [], impact: 0, dose: "6 × 30 s at 75% / 30 s walk",
    how: "Run, bike or shuffle at a strong but controlled pace.", cues: ["Even pace on every rep"] },
  { id: "k-downback", name: "Down and backs", slot: "conditioning", tier: 2, phases: BG, minutes: 5, needs: ["court"], impact: 1, dose: "5 reps, 30 s rest",
    how: "Baseline to baseline and back as fast as you can.", cues: ["Touch every line", "Breathe on the rest"] },
  { id: "k-17s", name: "17s", slot: "conditioning", tier: 3, phases: G, minutes: 5, needs: ["court"], impact: 1, dose: "2 reps, 2 min rest",
    how: "Sideline to sideline 17 times. Aim for under 70 seconds.", cues: ["Plant low on each turn"] },
  { id: "k-shotrun", name: "Sprint + free throws", slot: "conditioning", tier: 2, phases: G, minutes: 6, needs: ["court", "hoop"], impact: 1, dose: "6 rounds: sprint down and back, 2 free throws", track: { label: "Free throws made", attempts: 12 },
    how: "Game-like conditioning: make free throws while breathing hard.", cues: ["Same routine when tired"] },

  /* ---- strength & durability ---- */
  { id: "st-core", name: "Core circuit", slot: "strength", tier: 1, phases: FBG, minutes: 6, needs: [], impact: 0, dose: "2 rounds: 30 s plank, 20 s each side plank, 10 dead bugs",
    how: "Trunk strength for balance in the air and through contact.", cues: ["Ribs down", "Slow and controlled"] },
  { id: "st-armor", name: "Ankle and knee armor", slot: "strength", tier: 1, phases: FBG, minutes: 5, needs: [], impact: 0, dose: "2 rounds: 30 s single-leg balance, 15 calf raises, 15 tib raises",
    how: "Small muscles that prevent rolled ankles and sore knees.", cues: ["Slow lowering", "Balance on a soft surface to make it harder"] },
  { id: "st-lower", name: "Bodyweight lower body", slot: "strength", tier: 1, phases: FB, minutes: 8, needs: [], impact: 0, dose: "3 rounds: 8 split squats per leg, 12 glute bridges, 10 single-leg RDL reaches",
    how: "Leg strength that turns into jumping and first-step power.", cues: ["Knee stays over the middle of the foot", "3 seconds down"] },
  { id: "st-upper", name: "Upper body", slot: "strength", tier: 1, phases: FB, minutes: 6, needs: [], impact: 0, dose: "3 rounds: 10 push-ups, 10 towel or band rows, 20 shoulder taps",
    how: "Strength for finishing through contact and holding position.", cues: ["Straight line head to heels"] },
  { id: "st-gym", name: "Gym strength", slot: "strength", tier: 2, phases: FB, minutes: 15, needs: ["gym"], impact: 0, dose: "3 × 8: goblet squat, Romanian deadlift, step-ups, rows", minAge: "13-15",
    how: "Moderate weight with perfect form. Leave 2–3 reps in the tank. Ask a coach to check your form first.", cues: ["Form first, weight second", "Never train to failure"] },
];

/* ---------------- benchmark tests ---------------- */
export interface ProgramTest {
  id: string;
  skill: Skill;
  name: string;
  how: string;
  unit: string;
  better: "higher" | "lower";
  needs: Need[];
  max: number;
}

export const TESTS: ProgramTest[] = [
  { id: "t-ft", skill: "shooting", name: "Free throws (out of 20)", how: "20 free throws, your normal routine.", unit: "makes", better: "higher", needs: ["hoop"], max: 20 },
  { id: "t-spot", skill: "shooting", name: "5-spot mid-range (out of 25)", how: "5 shots from each of 5 spots at 15 feet.", unit: "makes", better: "higher", needs: ["hoop"], max: 25 },
  { id: "t-wallshots", skill: "shooting", name: "Wall target hits in 60 s", how: "Shoot at a marked wall target for 60 seconds; count clean hits.", unit: "hits", better: "higher", needs: [], max: 100 },
  { id: "t-mikan", skill: "finishing", name: "Mikan makes in 60 s", how: "Alternating layups under the rim for 60 seconds.", unit: "makes", better: "higher", needs: ["hoop"], max: 80 },
  { id: "t-weaklayup", skill: "finishing", name: "Weak-hand layups (out of 10)", how: "10 weak-hand layups at game speed from the wing.", unit: "makes", better: "higher", needs: ["hoop"], max: 10 },
  { id: "t-fig8", skill: "handles", name: "Figure-8 dribbles in 30 s", how: "Count each time the ball passes through your legs.", unit: "reps", better: "higher", needs: [], max: 150 },
  { id: "t-weakdribble", skill: "handles", name: "Weak-hand crossovers in 30 s", how: "Count clean crossovers starting and ending in your weak hand.", unit: "reps", better: "higher", needs: [], max: 150 },
  { id: "t-vert", skill: "explosiveness", name: "Vertical jump (inches)", how: "Mark your standing reach on a wall, then your best of 3 jumps. The difference is your vertical.", unit: "in", better: "higher", needs: [], max: 60 },
  { id: "t-broad", skill: "explosiveness", name: "Broad jump (inches)", how: "Best of 3, measured to your heels.", unit: "in", better: "higher", needs: [], max: 160 },
  { id: "t-slides", skill: "defense", name: "Lane slides in 30 s", how: "Slide lane line to lane line; count line touches.", unit: "touches", better: "higher", needs: [], max: 60 },
  { id: "t-sprint", skill: "conditioning", name: "Down and back x3 (seconds)", how: "Baseline to baseline and back, 3 times, timed.", unit: "s", better: "lower", needs: ["court"], max: 300 },
  { id: "t-wallsit", skill: "strength", name: "Wall sit (seconds)", how: "Thighs parallel, back on the wall, as long as you can hold good form.", unit: "s", better: "higher", needs: [], max: 600 },
  { id: "t-pushup", skill: "strength", name: "Push-ups with good form", how: "Chest to a fist-height target, no sagging. Stop when form breaks.", unit: "reps", better: "higher", needs: [], max: 150 },
  { id: "t-reads", skill: "iq", name: "Read confidence (1–10)", how: "How confident are you reading help defense and making the right play? Be honest; this is just for you.", unit: "/10", better: "higher", needs: [], max: 10 },
];

export const SKILL_LABEL: Record<Skill, string> = {
  handles: "Ball handling", shooting: "Shooting", finishing: "Finishing", explosiveness: "Explosiveness",
  defense: "Defense", iq: "Basketball IQ", conditioning: "Conditioning", strength: "Strength & durability",
};
/** Maps to the Training screen's focus areas. */
export const SKILL_FOCUS_AREA: Record<Skill, string> = {
  handles: "ball handling", shooting: "shooting", finishing: "finishing", explosiveness: "explosiveness",
  defense: "defense", iq: "decision-making", conditioning: "conditioning", strength: "conditioning",
};
