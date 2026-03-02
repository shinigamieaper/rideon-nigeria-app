"use client";

import React from "react";
import { motion } from "motion/react";
import { Check, FileText, UserCheck, Award, Loader2 } from "lucide-react";

export interface ApplicationStep {
  id: string;
  title: string;
  description: string;
  status: "completed" | "current" | "upcoming";
}

export interface ApplicationStepperProps
  extends React.ComponentPropsWithoutRef<"div"> {
  steps: ApplicationStep[];
  currentStepIndex?: number;
}

const stepIcons: Record<string, React.ReactNode> = {
  submit: <FileText className="w-4 h-4" />,
  review: <UserCheck className="w-4 h-4" />,
  decision: <Award className="w-4 h-4" />,
};

const ApplicationStepper: React.FC<ApplicationStepperProps> = ({
  steps,
  currentStepIndex = 0,
  className,
  ...rest
}) => {
  return (
    <div
      className={[
        "rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl",
        "border border-slate-200/80 dark:border-slate-800/60 shadow-lg",
        "p-5 sm:p-6",
        className || "",
      ].join(" ")}
      {...rest}
    >
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-5">
        Application Progress
      </h3>

      <div className="relative">
        {steps.map((step, index) => {
          const isCompleted = step.status === "completed";
          const isCurrent = step.status === "current";
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="relative flex gap-4">
              {/* Vertical line connector */}
              {!isLast && (
                <div className="absolute left-[19px] top-10 w-0.5 h-[calc(100%-16px)] -translate-x-1/2">
                  <motion.div
                    className={[
                      "w-full h-full rounded-full",
                      isCompleted
                        ? "bg-gradient-to-b from-emerald-500 to-emerald-400"
                        : "bg-slate-200 dark:bg-slate-700",
                    ].join(" ")}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: index * 0.15, duration: 0.3 }}
                    style={{ transformOrigin: "top" }}
                  />
                </div>
              )}

              {/* Step indicator circle */}
              <div className="relative z-10 flex-shrink-0">
                <motion.div
                  className={[
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    "border-2 transition-colors duration-300",
                    isCompleted
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/30"
                      : isCurrent
                        ? "bg-gradient-to-br from-[#0077E6] to-[#00529B] border-blue-400 text-white shadow-lg shadow-blue-500/30"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500",
                  ].join(" ")}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 200,
                  }}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
                    >
                      <Check className="w-5 h-5" strokeWidth={3} />
                    </motion.div>
                  ) : isCurrent ? (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      {stepIcons[step.id] || (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                    </motion.div>
                  ) : (
                    stepIcons[step.id] || (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )
                  )}
                </motion.div>

                {/* Pulse ring for current step */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-blue-400"
                    animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </div>

              {/* Step content */}
              <motion.div
                className={["flex-1 pb-8", isLast ? "pb-0" : ""].join(" ")}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + 0.1 }}
              >
                <h4
                  className={[
                    "text-sm font-semibold",
                    isCompleted
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isCurrent
                        ? "text-slate-900 dark:text-slate-100"
                        : "text-slate-500 dark:text-slate-400",
                  ].join(" ")}
                >
                  {step.title}
                  {isCompleted && (
                    <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-emerald-500">
                      Done
                    </span>
                  )}
                  {isCurrent && (
                    <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-blue-500">
                      In Progress
                    </span>
                  )}
                </h4>
                <p
                  className={[
                    "text-[13px] mt-1 leading-relaxed",
                    isCompleted || isCurrent
                      ? "text-slate-600 dark:text-slate-400"
                      : "text-slate-400 dark:text-slate-500",
                  ].join(" ")}
                >
                  {step.description}
                </p>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApplicationStepper;
