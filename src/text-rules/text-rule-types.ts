export interface TextRule {
  pattern: string;
  replacement: string;
  flags?: string;
}

export interface TextRuleGroup {
  id: string;
  name: string;
  enabledByDefault: boolean;
  rules: TextRule[];
}

export interface TextRuleSet {
  version: number;
  updatedAt: string;
  groups: TextRuleGroup[];
}
