// Types for the JSON data structure

export interface Event {
  event_content: string;
  relevancy_score: number;
  timestamp: number;
}

export interface Output {
  events: Event[];
  npub: string;
  summary: string;
}

export interface JsonData {
  output: Output[];
}
