"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Check, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { LabSpec, QuestionSpec } from "@/lib/spec";

export function LearnerPanel({
  lab,
  showQuestions = true,
  onTestPrediction,
}: {
  lab: LabSpec;
  showQuestions?: boolean;
  onTestPrediction: () => void;
}) {
  const [tab, setTab] = useState("concept");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [panelVisible, setPanelVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const question = lab.questions[index] ?? lab.questions[0];
  const total = lab.questions.length;

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPanelVisible(entry?.isIntersecting ?? false),
      { threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!question) return null;

  const correct = selected === question.correctId;
  const progress = ((index + (checked ? 1 : 0)) / total) * 100;

  function check() {
    if (!selected || checked) return;
    setChecked(true);
    if (selected === question.correctId) setCorrectCount((count) => count + 1);
    if (question.type === "predict") onTestPrediction();
  }

  function next() {
    if (index >= total - 1) {
      setTab("concept");
      return;
    }
    setIndex((value) => value + 1);
    setSelected(null);
    setChecked(false);
  }

  return (
    <div ref={rootRef} className="flex flex-col lg:h-full lg:min-h-0">
      <Tabs value={tab} onValueChange={setTab} className="gap-0 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        <div className="p-3 pb-0">
          <TabsList className="w-full">
            <TabsTrigger value="concept">Concept</TabsTrigger>
            <TabsTrigger value="questions" disabled={!showQuestions}>
              Questions
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="concept" className="px-4 py-4 lg:min-h-0 lg:overflow-y-auto">
          <p className="text-sm leading-6 whitespace-pre-wrap">{lab.concept}</p>
          <p className="mt-4 text-sm text-muted-foreground">{lab.summary}</p>
        </TabsContent>
        <TabsContent value="questions" className="px-4 py-4 pb-24 lg:min-h-0 lg:overflow-y-auto lg:pb-4">
          {showQuestions ? (
            <QuestionCard
              question={question}
              index={index}
              total={total}
              progress={progress}
              selected={selected}
              checked={checked}
              alertRef={alertRef}
              onSelect={setSelected}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Questions are on the way.</p>
          )}
        </TabsContent>
      </Tabs>
      {tab === "questions" && showQuestions ? (
        <div
          className={cn(
            "border-t bg-background/95 p-3 backdrop-blur",
            "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30",
            !panelVisible && "max-lg:hidden",
          )}
        >
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">
              {!checked ? "Choose an answer" : correct ? "Correct" : "Not quite"}
              {checked && index === total - 1 ? (
                <span className="ml-2 font-normal text-muted-foreground">
                  {correctCount} of {total} correct
                </span>
              ) : null}
            </p>
            <div className="ml-auto flex gap-2">
              {checked ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => alertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  >
                    Why?
                  </Button>
                  <Button type="button" onClick={next}>
                    {index === total - 1 ? "Finish" : "Continue"}
                  </Button>
                </>
              ) : (
                <Button type="button" data-testid="check-answer" onClick={check} disabled={!selected}>
                  Check
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function QuestionCard({
  question,
  index,
  total,
  progress,
  selected,
  checked,
  alertRef,
  onSelect,
}: {
  question: QuestionSpec;
  index: number;
  total: number;
  progress: number;
  selected: string | null;
  checked: boolean;
  alertRef: RefObject<HTMLDivElement | null>;
  onSelect: (id: string) => void;
}) {
  const correct = selected === question.correctId;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Progress value={progress} className="flex-1" />
        <span className="text-xs text-muted-foreground tabular-nums">
          {index + 1}/{total}
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {question.type === "predict" ? <Badge variant="secondary">Predict</Badge> : null}
        </div>
        <h2 className="text-base font-medium leading-snug">{question.prompt}</h2>
        {question.type === "predict" && !checked ? (
          <p className="text-sm text-muted-foreground">Predict, then press Play to test</p>
        ) : null}
      </div>
      <RadioGroup
        value={selected ?? ""}
        onValueChange={onSelect}
        disabled={checked}
        className="gap-2"
      >
        {question.choices.map((choice) => {
          const isCorrect = choice.id === question.correctId;
          const isSelected = choice.id === selected;
          return (
            <label
              key={choice.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 text-sm",
                !checked && isSelected && "border-primary",
                checked && isCorrect && "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
                checked && isSelected && !isCorrect && "border-destructive bg-destructive/5",
                checked && "cursor-default",
              )}
            >
              <RadioGroupItem value={choice.id} className="mt-0.5" />
              <span className="flex-1 leading-5">{choice.text}</span>
              {checked && isCorrect ? <Check className="size-4 text-emerald-600" /> : null}
              {checked && isSelected && !isCorrect ? <X className="size-4 text-destructive" /> : null}
            </label>
          );
        })}
      </RadioGroup>
      {checked ? (
        <Alert ref={alertRef} data-testid="feedback-alert" variant={correct ? "default" : "destructive"}>
          {correct ? <Check /> : <X />}
          <AlertTitle>{correct ? "That's right" : "Not quite"}</AlertTitle>
          <AlertDescription>
            <p>{question.explanation}</p>
            {question.tryIt ? <p className="mt-1">{question.tryIt}</p> : null}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
