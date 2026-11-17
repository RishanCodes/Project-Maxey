/** Achievements unlock on real qualifying records only, once each. */
export interface AchievementContext {
  tasksCreated: number;
  taskCompletions: number;
  trainingDone: number;
  focusDone: number;
  milestonesDone: number;
  goalsDone: number;
  journalWeeks: number;
  checkins: number;
  restDays: number;
  bestHabitStreak: number; // in days (weekly streaks count as 7 per week)
  planApproved: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  test: (c: AchievementContext) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-plan", name: "First Plan", description: "Approved a starter plan or created your first task.", test: (c) => c.planApproved || c.tasksCreated > 0 },
  { id: "first-task", name: "First Check", description: "Completed your first task.", test: (c) => c.taskCompletions >= 1 },
  { id: "first-session", name: "First Session", description: "Logged your first completed training session.", test: (c) => c.trainingDone >= 1 },
  { id: "ten-sessions", name: "Ten Sessions", description: "Logged 10 completed training sessions.", test: (c) => c.trainingDone >= 10 },
  { id: "first-focus", name: "Locked In", description: "Completed your first focus session.", test: (c) => c.focusDone >= 1 },
  { id: "ten-focus", name: "Deep Work x10", description: "Completed 10 focus sessions.", test: (c) => c.focusDone >= 10 },
  { id: "habit-week", name: "Seven Straight", description: "Reached a 7-day habit streak (or a weekly habit met 1 week).", test: (c) => c.bestHabitStreak >= 7 },
  { id: "first-milestone", name: "Personal Milestone", description: "Completed a goal milestone.", test: (c) => c.milestonesDone >= 1 },
  { id: "goal-complete", name: "Goal Reached", description: "Completed every milestone of a goal.", test: (c) => c.goalsDone >= 1 },
  { id: "four-week-reflection", name: "Four-Week Reflection", description: "Wrote journal entries in four different weeks.", test: (c) => c.journalWeeks >= 4 },
  { id: "checkin-week", name: "Checked In", description: "Logged 7 daily check-ins.", test: (c) => c.checkins >= 7 },
  { id: "rest-respected", name: "Rest Respected", description: "Logged 3 planned rest days. Recovery is part of training.", test: (c) => c.restDays >= 3 },
];
