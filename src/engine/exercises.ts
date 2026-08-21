// The exercise library and the workout templates built from it.
//
// Hand-written rather than imported: wger's database is excellent but its
// licence and its 1,500 entries both cost more than they give here. Forty-odd
// movements covers everything the templates need, and every one of them can
// be described in a single honest cue.
//
// Names are plain on purpose. "Barbell Back Squat" is what it is called in
// every gym on earth; the flavour belongs on quests, not on the movement.

import type { PlayerStats } from './types';

export type Equipment = 'bodyweight' | 'barbell' | 'dumbbell' | 'machine' | 'kettlebell';
export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'glutes' | 'core' | 'full body';

export interface Exercise {
  id: string;
  name: string;
  muscles: MuscleGroup[];
  equipment: Equipment;
  /** Which character stat the movement trains. */
  stat: keyof PlayerStats;
  /** Multi-joint movements carry the session; they sort first in the library. */
  compound: boolean;
  /**
   * True when the load is your own body. These are tracked by reps, because
   * logging "0 kg x 12" and calling it a personal best is meaningless — added
   * weight is still allowed and still counts.
   */
  bodyweight: boolean;
  /** One line. If it needs a paragraph, it needs a physio, not an app. */
  cue: string;
}

export const EXERCISES: Exercise[] = [
  // ---- legs ----
  { id: 'x_squat', name: 'Barbell Back Squat', muscles: ['legs', 'glutes'], equipment: 'barbell', stat: 'str', compound: true, bodyweight: false, cue: 'Brace, sit between your hips, knees track over your toes.' },
  { id: 'x_frontsquat', name: 'Front Squat', muscles: ['legs', 'core'], equipment: 'barbell', stat: 'str', compound: true, bodyweight: false, cue: 'Elbows high. The bar sits on your shoulders, not your hands.' },
  { id: 'x_gobletsquat', name: 'Goblet Squat', muscles: ['legs', 'glutes'], equipment: 'dumbbell', stat: 'str', compound: true, bodyweight: false, cue: 'Hold the bell at your chest and sit straight down.' },
  { id: 'x_deadlift', name: 'Deadlift', muscles: ['back', 'legs', 'glutes'], equipment: 'barbell', stat: 'str', compound: true, bodyweight: false, cue: 'Push the floor away. The bar stays against your legs.' },
  { id: 'x_rdl', name: 'Romanian Deadlift', muscles: ['legs', 'glutes', 'back'], equipment: 'barbell', stat: 'str', compound: true, bodyweight: false, cue: 'Hinge at the hip with soft knees. Feel the hamstrings load.' },
  { id: 'x_lunge', name: 'Walking Lunge', muscles: ['legs', 'glutes'], equipment: 'dumbbell', stat: 'str', compound: true, bodyweight: false, cue: 'Long step, back knee toward the floor, torso upright.' },
  { id: 'x_bulgarian', name: 'Bulgarian Split Squat', muscles: ['legs', 'glutes'], equipment: 'dumbbell', stat: 'str', compound: true, bodyweight: false, cue: 'Rear foot elevated. Almost all the weight on the front leg.' },
  { id: 'x_legpress', name: 'Leg Press', muscles: ['legs', 'glutes'], equipment: 'machine', stat: 'str', compound: true, bodyweight: false, cue: 'Full range, but never let your lower back round off the pad.' },
  { id: 'x_legcurl', name: 'Leg Curl', muscles: ['legs'], equipment: 'machine', stat: 'str', compound: false, bodyweight: false, cue: 'Slow on the way back. That half is the point.' },
  { id: 'x_legext', name: 'Leg Extension', muscles: ['legs'], equipment: 'machine', stat: 'str', compound: false, bodyweight: false, cue: 'Pause at the top rather than swinging through it.' },
  { id: 'x_calfraise', name: 'Standing Calf Raise', muscles: ['legs'], equipment: 'machine', stat: 'str', compound: false, bodyweight: false, cue: 'All the way down, all the way up. No bouncing.' },
  { id: 'x_hipthrust', name: 'Hip Thrust', muscles: ['glutes', 'legs'], equipment: 'barbell', stat: 'str', compound: true, bodyweight: false, cue: 'Chin tucked, ribs down, squeeze at the top.' },
  { id: 'x_bwsquat', name: 'Bodyweight Squat', muscles: ['legs', 'glutes'], equipment: 'bodyweight', stat: 'str', compound: true, bodyweight: true, cue: 'Chest up, full depth, controlled tempo.' },
  { id: 'x_pistol', name: 'Pistol Squat', muscles: ['legs', 'core'], equipment: 'bodyweight', stat: 'str', compound: true, bodyweight: true, cue: 'One leg. Hold something until the balance arrives.' },
  { id: 'x_bwlunge', name: 'Bodyweight Lunge', muscles: ['legs', 'glutes'], equipment: 'bodyweight', stat: 'str', compound: true, bodyweight: true, cue: 'Long step, back knee to the floor, stand up through the front heel.' },
  { id: 'x_jumpsquat', name: 'Jump Squat', muscles: ['legs', 'full body'], equipment: 'bodyweight', stat: 'vig', compound: true, bodyweight: true, cue: 'Land quiet. Soft knees absorb, they do not collapse.' },
  { id: 'x_gluteBridge', name: 'Glute Bridge', muscles: ['glutes', 'core'], equipment: 'bodyweight', stat: 'str', compound: false, bodyweight: true, cue: 'Drive through the heels, hold the top for a beat.' },

  // ---- chest ----
  { id: 'x_bench', name: 'Barbell Bench Press', muscles: ['chest', 'arms', 'shoulders'], equipment: 'barbell', stat: 'str', compound: true, bodyweight: false, cue: 'Shoulder blades pinned to the bench, bar to the lower chest.' },
  { id: 'x_inclinebench', name: 'Incline Bench Press', muscles: ['chest', 'shoulders'], equipment: 'barbell', stat: 'str', compound: true, bodyweight: false, cue: 'Thirty degrees is plenty. Steeper is a shoulder press.' },
  { id: 'x_dbpress', name: 'Dumbbell Bench Press', muscles: ['chest', 'arms'], equipment: 'dumbbell', stat: 'str', compound: true, bodyweight: false, cue: 'Lower until you feel a stretch, not until you feel a pinch.' },
  { id: 'x_dbfly', name: 'Dumbbell Fly', muscles: ['chest'], equipment: 'dumbbell', stat: 'str', compound: false, bodyweight: false, cue: 'Wide arc, soft elbows, light weight. This one is not a press.' },
  { id: 'x_pushup', name: 'Push-Up', muscles: ['chest', 'arms', 'core'], equipment: 'bodyweight', stat: 'str', compound: true, bodyweight: true, cue: 'Straight line from heels to head. Chest to the floor.' },
  { id: 'x_dip', name: 'Dip', muscles: ['chest', 'arms'], equipment: 'bodyweight', stat: 'str', compound: true, bodyweight: true, cue: 'Lean forward for chest, stay upright for triceps.' },

  // ---- back ----
  { id: 'x_pullup', name: 'Pull-Up', muscles: ['back', 'arms'], equipment: 'bodyweight', stat: 'str', compound: true, bodyweight: true, cue: 'Start from a dead hang. Chin clears the bar or it did not count.' },
  { id: 'x_chinup', name: 'Chin-Up', muscles: ['back', 'arms'], equipment: 'bodyweight', stat: 'str', compound: true, bodyweight: true, cue: 'Palms toward you. More biceps, usually more reps.' },
  { id: 'x_barbellrow', name: 'Barbell Row', muscles: ['back', 'arms'], equipment: 'barbell', stat: 'str', compound: true, bodyweight: false, cue: 'Torso near parallel. Pull to the belly, not the chest.' },
  { id: 'x_dbrow', name: 'Dumbbell Row', muscles: ['back', 'arms'], equipment: 'dumbbell', stat: 'str', compound: true, bodyweight: false, cue: 'One hand braced. Drive the elbow past your ribs.' },
  { id: 'x_latpulldown', name: 'Lat Pulldown', muscles: ['back', 'arms'], equipment: 'machine', stat: 'str', compound: true, bodyweight: false, cue: 'Pull the bar to your collarbone, not behind your neck.' },
  { id: 'x_seatedrow', name: 'Seated Cable Row', muscles: ['back', 'arms'], equipment: 'machine', stat: 'str', compound: true, bodyweight: false, cue: 'Still torso. Let the shoulder blades travel.' },
  { id: 'x_facepull', name: 'Face Pull', muscles: ['shoulders', 'back'], equipment: 'machine', stat: 'str', compound: false, bodyweight: false, cue: 'High elbows, pull to the forehead. Cheap shoulder insurance.' },
  { id: 'x_invrow', name: 'Inverted Row', muscles: ['back', 'arms'], equipment: 'bodyweight', stat: 'str', compound: true, bodyweight: true, cue: 'Body rigid under a bar or table. Chest to the bar.' },

  // ---- shoulders & arms ----
  { id: 'x_ohp', name: 'Overhead Press', muscles: ['shoulders', 'arms', 'core'], equipment: 'barbell', stat: 'str', compound: true, bodyweight: false, cue: 'Squeeze your glutes. Press the bar, then move your head through.' },
  { id: 'x_dbshoulder', name: 'Dumbbell Shoulder Press', muscles: ['shoulders', 'arms'], equipment: 'dumbbell', stat: 'str', compound: true, bodyweight: false, cue: 'Do not let the ribs flare. Press, do not arch.' },
  { id: 'x_lateralraise', name: 'Lateral Raise', muscles: ['shoulders'], equipment: 'dumbbell', stat: 'str', compound: false, bodyweight: false, cue: 'To shoulder height, no higher. Lighter than your ego wants.' },
  { id: 'x_curl', name: 'Dumbbell Curl', muscles: ['arms'], equipment: 'dumbbell', stat: 'str', compound: false, bodyweight: false, cue: 'Elbows pinned to your sides. No swinging.' },
  { id: 'x_barbellcurl', name: 'Barbell Curl', muscles: ['arms'], equipment: 'barbell', stat: 'str', compound: false, bodyweight: false, cue: 'If your knees are helping, the bar is too heavy.' },
  { id: 'x_tricepext', name: 'Triceps Extension', muscles: ['arms'], equipment: 'dumbbell', stat: 'str', compound: false, bodyweight: false, cue: 'Upper arm stays still. Only the forearm moves.' },
  { id: 'x_pushdown', name: 'Triceps Pushdown', muscles: ['arms'], equipment: 'machine', stat: 'str', compound: false, bodyweight: false, cue: 'Lock out at the bottom, control the way back up.' },

  // ---- core ----
  { id: 'x_plank', name: 'Plank', muscles: ['core'], equipment: 'bodyweight', stat: 'str', compound: false, bodyweight: true, cue: 'Log seconds as reps. Squeeze glutes, do not sag.' },
  { id: 'x_hanging', name: 'Hanging Leg Raise', muscles: ['core'], equipment: 'bodyweight', stat: 'str', compound: false, bodyweight: true, cue: 'No swinging. Curl the pelvis toward the ribs.' },
  { id: 'x_deadbug', name: 'Dead Bug', muscles: ['core'], equipment: 'bodyweight', stat: 'str', compound: false, bodyweight: true, cue: 'Lower back stays flat on the floor the whole time.' },
  { id: 'x_abwheel', name: 'Ab Wheel Rollout', muscles: ['core'], equipment: 'bodyweight', stat: 'str', compound: false, bodyweight: true, cue: 'Only roll as far as you can go without your hips dropping.' },

  // ---- conditioning & carries ----
  { id: 'x_kbswing', name: 'Kettlebell Swing', muscles: ['glutes', 'back', 'full body'], equipment: 'kettlebell', stat: 'vig', compound: true, bodyweight: false, cue: 'A hinge, not a squat. The arms are rope.' },
  { id: 'x_farmers', name: "Farmer's Carry", muscles: ['core', 'full body'], equipment: 'dumbbell', stat: 'str', compound: true, bodyweight: false, cue: 'Log steps as reps. Tall posture, do not lean.' },
  { id: 'x_burpee', name: 'Burpee', muscles: ['full body'], equipment: 'bodyweight', stat: 'vig', compound: true, bodyweight: true, cue: 'Chest to the floor, jump at the top. Pace yourself.' },
  { id: 'x_mountain', name: 'Mountain Climber', muscles: ['core', 'full body'], equipment: 'bodyweight', stat: 'vig', compound: true, bodyweight: true, cue: 'Hips low. Drive the knees, do not bounce the shoulders.' },
];

export interface WorkoutTemplate {
  id: string;
  name: string;
  /** Plain description of who this is for. */
  focus: string;
  days: { name: string; exerciseIds: string[] }[];
}

export const TEMPLATES: WorkoutTemplate[] = [
  {
    id: 't_ppl',
    name: 'Push / Pull / Legs',
    focus: 'Three to six days a week. The default once you have a year behind you.',
    days: [
      { name: 'Push', exerciseIds: ['x_bench', 'x_ohp', 'x_inclinebench', 'x_lateralraise', 'x_pushdown'] },
      { name: 'Pull', exerciseIds: ['x_deadlift', 'x_pullup', 'x_barbellrow', 'x_facepull', 'x_barbellcurl'] },
      { name: 'Legs', exerciseIds: ['x_squat', 'x_rdl', 'x_legpress', 'x_legcurl', 'x_calfraise'] },
    ],
  },
  {
    id: 't_ul',
    name: 'Upper / Lower',
    focus: 'Four days a week. The best ratio of results to time for most people.',
    days: [
      { name: 'Upper', exerciseIds: ['x_bench', 'x_barbellrow', 'x_ohp', 'x_latpulldown', 'x_curl', 'x_pushdown'] },
      { name: 'Lower', exerciseIds: ['x_squat', 'x_rdl', 'x_bulgarian', 'x_legcurl', 'x_calfraise'] },
    ],
  },
  {
    id: 't_full',
    name: 'Full Body',
    focus: 'Three days a week. Where to start if you are starting.',
    days: [
      { name: 'Day A', exerciseIds: ['x_squat', 'x_bench', 'x_barbellrow', 'x_plank'] },
      { name: 'Day B', exerciseIds: ['x_deadlift', 'x_ohp', 'x_latpulldown', 'x_hanging'] },
      { name: 'Day C', exerciseIds: ['x_frontsquat', 'x_dbpress', 'x_dbrow', 'x_facepull'] },
    ],
  },
  {
    id: 't_bw',
    name: 'Bodyweight Only',
    focus: 'No gym, no kit, no excuses. Everything here works in a bedroom.',
    days: [
      { name: 'Push', exerciseIds: ['x_pushup', 'x_dip', 'x_plank', 'x_deadbug'] },
      { name: 'Pull', exerciseIds: ['x_pullup', 'x_invrow', 'x_chinup', 'x_hanging'] },
      { name: 'Legs', exerciseIds: ['x_bwsquat', 'x_bwlunge', 'x_gluteBridge', 'x_pistol'] },
      { name: 'Conditioning', exerciseIds: ['x_burpee', 'x_mountain', 'x_jumpsquat'] },
    ],
  },
];
