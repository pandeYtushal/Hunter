import type { IntentClassification, IntentType } from "../types/Action";

interface IntentRule {
  intent: IntentType;
  weight: number;
  terms: Array<string | RegExp>;
}

const rules: IntentRule[] = [
  {
    intent: "APPLY_JOB",
    weight: 5,
    terms: [/apply (for|to)/i, /start (the )?application/i, /submit (my )?application/i, "apply now", "apply this job"]
  },
  {
    intent: "ANALYZE_JOB",
    weight: 4,
    terms: [/analy[sz]e .*job/i, /match score/i, /good fit/i, /fit for/i, "compare resume", "job match"]
  },
  {
    intent: "RESEARCH_COMPANY",
    weight: 4,
    terms: [/research .*company/i, /tell me about .+/i, /who is (the )?employer/i, "company culture", "interview tips"]
  },
  {
    intent: "GENERATE_COVER_LETTER",
    weight: 5,
    terms: [/cover letter/i, /write .*letter/i, /generate .*letter/i, "tailored letter"]
  },
  {
    intent: "FILL_FORM",
    weight: 5,
    terms: [/auto.?fill/i, /fill .*form/i, /scan .*form/i, "application form", "fill fields"]
  },
  {
    intent: "SAVE_JOB",
    weight: 5,
    terms: [/save .*job/i, /track .*job/i, /bookmark .*job/i, "save posting", "add to tracker"]
  },
  {
    intent: "SUMMARIZE_PAGE",
    weight: 4,
    terms: [/summari[sz]e/i, /what is this page/i, /page about/i, "extract text", "summary"]
  }
];

const allIntents: IntentType[] = [
  "APPLY_JOB",
  "ANALYZE_JOB",
  "RESEARCH_COMPANY",
  "GENERATE_COVER_LETTER",
  "FILL_FORM",
  "SAVE_JOB",
  "SUMMARIZE_PAGE",
  "CHAT_FALLBACK"
];

const scoreTerm = (input: string, term: string | RegExp): boolean => {
  if (term instanceof RegExp) return term.test(input);
  return input.includes(term.toLowerCase());
};

export const IntentClassifier = {
  classify(command: string): IntentClassification {
    const input = command.toLowerCase().trim();
    const scores = Object.fromEntries(allIntents.map((intent) => [intent, 0])) as Record<IntentType, number>;
    const matchedTerms: string[] = [];

    for (const rule of rules) {
      for (const term of rule.terms) {
        if (scoreTerm(input, term)) {
          scores[rule.intent] += rule.weight;
          matchedTerms.push(term.toString());
        }
      }
    }

    if (input.includes("job")) {
      scores.ANALYZE_JOB += 1;
      scores.APPLY_JOB += 1;
      scores.SAVE_JOB += 1;
    }
    if (input.includes("resume")) {
      scores.ANALYZE_JOB += 2;
      scores.APPLY_JOB += 1;
    }
    if (input.includes("company")) {
      scores.RESEARCH_COMPANY += 2;
    }

    const [intent, score] = Object.entries(scores).reduce<[IntentType, number]>(
      (best, [candidate, candidateScore]) =>
        candidateScore > best[1] ? [candidate as IntentType, candidateScore] : best,
      ["CHAT_FALLBACK", 0]
    );

    const confidence = score <= 0 ? 0 : Math.min(0.99, score / 10);
    return {
      intent: confidence >= 0.25 ? intent : "CHAT_FALLBACK",
      confidence,
      scores,
      matchedTerms
    };
  }
};
