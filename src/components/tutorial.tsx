"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  PiggyBank,
  ShieldCheck,
  Target,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "./ui";
import "./tutorial.css";

export type TutorialDestination = "quests" | "money";
type TutorialProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinish: (destination: TutorialDestination) => void;
  mode: "personal";
};

const titles = [
  "Start with one small quest",
  "Give your money a simple plan",
  "Know where your data lives",
  "Choose your first step",
];

export function Tutorial({ open, onOpenChange, onFinish, mode }: TutorialProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay tutorial-overlay" />
        <Dialog.Content className="modal-content tutorial-dialog">
          <TutorialSteps
            mode={mode}
            onClose={() => onOpenChange(false)}
            onFinish={onFinish}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TutorialSteps({
  onClose,
  onFinish,
}: Pick<TutorialProps, "mode" | "onFinish"> & { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);

  function changeStep(next: number) {
    setStep(next);
    requestAnimationFrame(() => titleRef.current?.focus());
  }

  return (
    <>
      <div className="tutorial-top">
        <span className="eyebrow">VYLOOP quick guide</span>
        <Dialog.Close className="icon-button" aria-label="Skip tutorial">
          <X size={20} aria-hidden="true" />
        </Dialog.Close>
      </div>
      <div className="tutorial-progress">
        <div
          className="tutorial-progress-track"
          role="progressbar"
          aria-label="Tutorial progress"
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={step + 1}
          aria-valuetext={`Step ${step + 1} of 4`}
        >
          {titles.map((title, index) => (
            <span key={title} className={index <= step ? "is-active" : ""} />
          ))}
        </div>
        <span className="muted">{step + 1} / 4</span>
      </div>
      <div className="tutorial-step">
        <div className="tutorial-step-icon" aria-hidden="true">
          {step === 0 && <Target size={24} />}
          {step === 1 && <Wallet size={24} />}
          {step === 2 && <ShieldCheck size={24} />}
          {step === 3 && <CheckCircle2 size={24} />}
        </div>
        <Dialog.Title ref={titleRef} tabIndex={-1} className="tutorial-title">
          {titles[step]}
        </Dialog.Title>
        <Dialog.Description className="tutorial-description">
          {step === 0 &&
            "LifeLoop turns small, useful tasks into progress you can see."}
          {step === 1 &&
            "MoneyLoop helps you track spending and work toward a savings goal."}
          {step === 2 &&
            "Your records are saved in this browser. No account is needed."}
          {step === 3 &&
            "You don’t need to set everything up today. Start with one action."}
        </Dialog.Description>

        {step === 0 && (
          <>
            <ol className="tutorial-instructions">
              <li>Open <strong>LifeLoop</strong> and choose a quest.</li>
              <li>Do the task, then select <strong>Complete quest</strong>.</li>
              <li>Earn <strong>XP</strong> (experience points) and build your level.</li>
            </ol>
            <div className="tutorial-example">
              <BookOpen size={21} aria-hidden="true" />
              <div>
                <span className="tutorial-example-label">Example quest</span>
                <strong>Read for 10 minutes</strong>
                <span className="muted">A small task is a good place to start.</span>
              </div>
              <span className="tutorial-xp"><Zap size={14} aria-hidden="true" /> XP</span>
            </div>
            <p className="tutorial-tip">Complete a quest each day to build your streak.</p>
          </>
        )}

        {step === 1 && (
          <div className="tutorial-money-actions">
            <div>
              <Wallet size={19} aria-hidden="true" />
              <p><strong>Add expense</strong><span>Record what you spent, such as lunch or travel.</span></p>
            </div>
            <div>
              <Target size={19} aria-hidden="true" />
              <p><strong>Edit budget</strong><span>Choose how much you plan to spend this month.</span></p>
            </div>
            <div>
              <PiggyBank size={19} aria-hidden="true" />
              <p><strong>New goal</strong><span>Set a savings target and record money you put aside.</span></p>
            </div>
            <p className="tutorial-tip">These are your records. VYLOOP does not move money or connect to your bank.</p>
          </div>
        )}

        {step === 2 && (
          <>
            <div className="tutorial-privacy">
              <ShieldCheck size={22} aria-hidden="true" />
              <div>
                <strong>Your personal workspace stays in this browser</strong>
                <p>
                  Your name, habits, and money records stay on this device. Someone using the same browser profile can view them.
                </p>
              </div>
            </div>
            <p className="tutorial-tip">
              Keep a backup with Settings → Export. Use Restore backup to move your records to another browser. Clearing site data removes local progress.
            </p>
          </>
        )}

        {step === 3 && (
          <div className="tutorial-choices">
            <button className="tutorial-choice" onClick={() => onFinish("quests")}>
              <Target size={23} aria-hidden="true" />
              <span><strong>Choose a quest</strong><small>Build one useful habit today.</small></span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button className="tutorial-choice" onClick={() => onFinish("money")}>
              <Wallet size={23} aria-hidden="true" />
              <span><strong>Track my money</strong><small>Record one expense or set a budget.</small></span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <p className="tutorial-replay"><Check size={15} aria-hidden="true" /> Reopen this guide anytime with Help.</p>
          </div>
        )}
      </div>
      <div className="tutorial-footer">
        <Button variant="ghost" size="sm" onClick={onClose}>Skip guide</Button>
        <div className="tutorial-footer-actions">
          {step > 0 && (
            <Button variant="secondary" size="sm" onClick={() => changeStep(step - 1)}>
              <ArrowLeft size={15} aria-hidden="true" /> Back
            </Button>
          )}
          {step < 3 && (
            <Button size="sm" onClick={() => changeStep(step + 1)}>
              Next <ArrowRight size={15} aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
