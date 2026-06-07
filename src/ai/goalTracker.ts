export interface SubGoal {
  id: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
}

export interface GoalProgress {
  goal: string;
  subGoals: SubGoal[];
  completionPercentage: number;
  isBlocked: boolean;
  blockReason?: string;
}

export const GoalTracker = {
  initialize(goal: string, actions: string[]): GoalProgress {
    const subGoals: SubGoal[] = actions.map((action, index) => ({
      id: action,
      description: `${action.replace("_", " ")}`,
      status: "pending"
    }));

    return {
      goal,
      subGoals,
      completionPercentage: 0,
      isBlocked: false
    };
  },

  updateProgress(
    current: GoalProgress,
    currentAction: string,
    actionStatus: "pending" | "running" | "completed" | "failed",
    isBlocked: boolean = false,
    blockReason?: string
  ): GoalProgress {
    const subGoals = current.subGoals.map((sg) => {
      if (sg.id === currentAction) {
        return { ...sg, status: actionStatus };
      }
      return sg;
    });

    const completedCount = subGoals.filter((sg) => sg.status === "completed").length;
    const completionPercentage = Math.round((completedCount / subGoals.length) * 100);

    return {
      goal: current.goal,
      subGoals,
      completionPercentage,
      isBlocked,
      blockReason
    };
  }
};
